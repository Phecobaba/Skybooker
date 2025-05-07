import { FC, useRef, useState, ChangeEvent } from "react";
import { Upload, X, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileUrl?: string;
  onFileRemove?: () => void;
  accept?: string;
  className?: string;
}

const FileUpload: FC<FileUploadProps> = ({
  onFileSelect,
  fileUrl,
  onFileRemove,
  accept = "image/*",
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(fileUrl || null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    onFileSelect(file);

    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onFileRemove) {
      onFileRemove();
    }
  };

  return (
    <div className={cn("", className)}>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
      />
      
      {!previewUrl ? (
        <div 
          className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleBrowseClick}
        >
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-gray-500">Drag and drop files here, or click to browse</p>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse Files
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-gray-50 p-3 rounded flex items-center">
          {previewUrl.startsWith('data:image') ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-16 h-16 object-cover rounded mr-2" 
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded mr-2 flex items-center justify-center">
              <FileType className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">{selectedFile?.name || "Uploaded file"}</div>
            <div className="text-xs text-gray-500">
              {selectedFile ? 
                `${(selectedFile.size / 1024).toFixed(0)} KB • Just now` : 
                "Previously uploaded"
              }
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-red-500"
            onClick={handleRemoveFile}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
