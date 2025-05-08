import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/admin/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schema for site settings
const siteSettingSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

type SiteSetting = {
  id: number;
  key: string;
  value: string | null;
  updatedAt: string;
};

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Fetch all site settings
  const { data: siteSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/site-settings");
        if (!res.ok) {
          console.error("Error fetching site settings:", await res.text());
          return [];
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching site settings:", error);
        return [];
      }
    },
  });

  // Form setup for creating/updating site settings
  const form = useForm<z.infer<typeof siteSettingSchema>>({
    resolver: zodResolver(siteSettingSchema),
    defaultValues: {
      key: "",
      value: "",
    },
  });

  // Mutation for creating/updating site settings
  const settingsMutation = useMutation({
    mutationFn: async (values: z.infer<typeof siteSettingSchema>) => {
      const res = await apiRequest("POST", "/api/admin/site-settings", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Setting saved",
        description: "The site setting has been successfully saved.",
      });
      form.reset({ key: "", value: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save setting: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting site settings
  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest("DELETE", `/api/admin/site-settings/${key}`);
    },
    onSuccess: () => {
      toast({
        title: "Setting deleted",
        description: "The site setting has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete setting: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof siteSettingSchema>) => {
    settingsMutation.mutate(values);
  };

  // Handle delete
  const handleDelete = (key: string) => {
    if (confirm(`Are you sure you want to delete the setting '${key}'?`)) {
      deleteMutation.mutate(key);
    }
  };

  // Handle file upload for logo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadLogo = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("logo", selectedFile);

      const response = await fetch("/api/admin/site-settings/logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setSelectedFile(null);
      toast({
        title: "Logo uploaded",
        description: "Logo has been successfully uploaded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
              <p className="text-muted-foreground">
                Manage your website's appearance and contact information.
              </p>
            </div>

        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add/Edit Setting</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., address, phone, email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl>
                              <Input placeholder="Setting value" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={settingsMutation.isPending}
                      >
                        {settingsMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Save Setting
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {settingsLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : !siteSettings || siteSettings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No settings found. Add some using the form.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {siteSettings.map((setting: SiteSetting) => (
                        <div
                          key={setting.id}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                        >
                          <div>
                            <p className="font-medium">{setting.key}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {setting.value || "(empty)"}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={() => handleDelete(setting.key)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logo Tab */}
          <TabsContent value="logo">
            <Card>
              <CardHeader>
                <CardTitle>Upload Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 bg-muted/20">
                    {selectedFile ? (
                      <div className="text-center">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-10 h-10 text-muted-foreground mb-2 mx-auto" />
                        <p className="font-medium">Drag and drop or click to upload</p>
                        <p className="text-sm text-muted-foreground">
                          Recommended size: 200 x 60 pixels
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="logo-upload"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 cursor-pointer"
                        asChild
                      >
                        <span>Choose File</span>
                      </Button>
                    </label>
                  </div>

                  <Button
                    onClick={uploadLogo}
                    disabled={!selectedFile || uploadLoading}
                    className="w-full"
                  >
                    {uploadLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Upload Logo
                  </Button>

                  {/* Display current logo if exists */}
                  {siteSettings?.find((s: SiteSetting) => s.key === 'logo')?.value && (
                    <div className="mt-8 border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-2">Current Logo</h3>
                      <div className="bg-muted/30 p-4 rounded flex justify-center">
                        <img
                          src={siteSettings.find((s: SiteSetting) => s.key === 'logo').value || ''}
                          alt="Current Logo"
                          className="h-12 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}