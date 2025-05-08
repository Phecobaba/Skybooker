import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Loader2, Plus, PencilIcon, Trash2 } from "lucide-react";
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Define the page content schema
const pageContentSchema = z.object({
  slug: z.string().min(2, "Slug must be at least 2 characters")
    .refine(s => /^[a-z0-9-]+$/.test(s), "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

type PageContent = {
  id: number;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
  updatedBy: number;
};

type FormData = z.infer<typeof pageContentSchema>;

export default function PageContentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingContent, setEditingContent] = useState<PageContent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all page contents
  const { data: pageContents = [], isLoading } = useQuery({
    queryKey: ["/api/page-contents"],
    queryFn: async () => {
      const response = await fetch("/api/page-contents");
      if (!response.ok) {
        throw new Error("Failed to fetch page contents");
      }
      return response.json() as Promise<PageContent[]>;
    },
  });

  // Form setup
  const createForm = useForm<FormData>({
    resolver: zodResolver(pageContentSchema),
    defaultValues: {
      slug: "",
      title: "",
      content: "",
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(pageContentSchema),
    defaultValues: {
      slug: "",
      title: "",
      content: "",
    },
  });

  // Update edit form when editing content changes
  useEffect(() => {
    if (editingContent) {
      editForm.reset({
        slug: editingContent.slug,
        title: editingContent.title,
        content: editingContent.content,
      });
    }
  }, [editingContent, editForm]);

  // Mutations
  const createContentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/admin/page-contents", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Page content created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/page-contents"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await apiRequest("PUT", `/api/admin/page-contents/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Page content updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/page-contents"] });
      setIsEditDialogOpen(false);
      setEditingContent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/page-contents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Page content deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/page-contents"] });
      setIsDeleteDialogOpen(false);
      setDeleteContentId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleEdit = (content: PageContent) => {
    setEditingContent(content);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteContentId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteContentId !== null) {
      deleteContentMutation.mutate(deleteContentId);
    }
  };

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    createContentMutation.mutate(data);
  });

  const handleEditSubmit = editForm.handleSubmit((data) => {
    if (editingContent) {
      updateContentMutation.mutate({ id: editingContent.id, data });
    }
  });
  
  // Predefined slug options
  const slugOptions = [
    { value: "help-center", label: "Help Center" },
    { value: "faq", label: "FAQ" },
    { value: "privacy-policy", label: "Privacy Policy" },
    { value: "terms-conditions", label: "Terms & Conditions" },
    { value: "about-us", label: "About Us" },
    { value: "contact-us", label: "Contact Us" },
  ];

  return (
    <>
      <Helmet>
        <title>Page Content Management | SkyBooker Admin</title>
        <meta 
          name="description" 
          content="Manage page contents for the website - create and edit pages like FAQ, Help Center, etc."
        />
      </Helmet>
      
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <AdminHeader 
              title="Page Content Management"
              description="Create and manage pages displayed in the footer section."
            />
            
            <div className="flex justify-end mb-6">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus size={16} />
                    Add Page
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Create New Page</DialogTitle>
                    <DialogDescription>
                      Add a new page that will be accessible from the footer.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...createForm}>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Slug*</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a pre-defined slug or enter custom" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {slugOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                                <SelectItem value="custom">Custom Slug</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {field.value === "custom" && (
                              <Input
                                placeholder="Enter custom slug (e.g., my-custom-page)"
                                value={createForm.watch("slug") === "custom" ? "" : createForm.watch("slug")}
                                onChange={(e) => createForm.setValue("slug", e.target.value)}
                                className="mt-2"
                              />
                            )}
                            
                            <FormDescription>
                              The URL-friendly identifier for this page (e.g., "privacy-policy")
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Title*</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter page title" {...field} />
                            </FormControl>
                            <FormDescription>
                              The title displayed at the top of the page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Content*</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter page content here..." 
                                className="min-h-[200px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The main content of the page. You can use basic HTML tags.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createContentMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {createContentMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Page
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pageContents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pageContents.map((content) => (
                  <Card key={content.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{content.title}</CardTitle>
                          <CardDescription className="mt-2">
                            <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-xs font-mono">
                              {content.slug}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(content)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(content.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="prose prose-sm prose-slate max-h-[150px] overflow-hidden relative">
                        <div dangerouslySetInnerHTML={{ __html: content.content }} />
                        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-background to-transparent"></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-4">
                        Last updated: {new Date(content.updatedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] bg-muted/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">No Pages Found</h3>
                <p className="text-center text-muted-foreground mb-4">
                  Create your first page to appear in the footer section.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create a Page
                </Button>
              </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Edit Page: {editingContent?.title}</DialogTitle>
                  <DialogDescription>
                    Make changes to the page content below.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...editForm}>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Slug*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter page slug" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL-friendly identifier for this page
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Title*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter page title" {...field} />
                          </FormControl>
                          <FormDescription>
                            The title displayed at the top of the page
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Content*</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter page content here..." 
                              className="min-h-[200px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            The main content of the page. You can use basic HTML tags.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateContentMutation.isPending}
                      >
                        {updateContentMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the page
                    and remove it from the footer navigation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={confirmDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteContentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}