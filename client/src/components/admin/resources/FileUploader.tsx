import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  File,
  FileText,
  Music,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { adminFetch } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

type FileType = "pdf" | "audio" | "image" | "any";

interface FileUploaderProps {
  accept?: FileType;
  onUploadComplete: (fileUrl: string, fileData: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    type: string;
  }) => void;
  currentFileUrl?: string;
  label?: string;
  description?: string;
  maxSizeMB?: number;
}

export function FileUploader({
  accept = "any",
  onUploadComplete,
  currentFileUrl,
  label = "Upload File",
  description,
  maxSizeMB = 50,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    type: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getAcceptTypes = (): string => {
    switch (accept) {
      case "pdf":
        return ".pdf";
      case "audio":
        return "audio/*,.mp3,.wav,.ogg,.aac";
      case "image":
        return "image/*,.jpg,.jpeg,.png,.gif,.webp";
      default:
        return ".pdf,audio/*,image/*";
    }
  };

  const getFileIcon = (mimetype?: string) => {
    if (!mimetype) return <File className="h-5 w-5" />;
    if (mimetype === "application/pdf") return <FileText className="h-5 w-5" />;
    if (mimetype.startsWith("audio/")) return <Music className="h-5 w-5" />;
    if (mimetype.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProgress(0);

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      setError(`File size exceeds ${maxSizeMB}MB limit. Current size: ${formatFileSize(file.size)}`);
      return;
    }

    // Validate file type
    if (accept === "pdf" && file.type !== "application/pdf") {
      setError("Please select a PDF file");
      return;
    }
    if (accept === "audio" && !file.type.startsWith("audio/")) {
      setError("Please select an audio file");
      return;
    }
    if (accept === "image" && !file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      // Get session token for admin auth
      const { supabase } = await import("@/lib/supabase");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("You must be logged in to upload files.");
      }

      const uploadPromise = new Promise<Response>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(new Response(JSON.stringify(responseData), { 
                status: xhr.status,
                headers: { "Content-Type": "application/json" }
              }));
            } catch {
              resolve(new Response(xhr.responseText, { status: xhr.status }));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || "Upload failed"));
            } catch {
              reject(new Error(xhr.responseText || "Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.open("POST", "/api/admin/resources/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
        xhr.send(formData);
      });

      const response = await uploadPromise;
      const data = await response.json();

      if (data.success && data.file) {
        setUploadedFile(data.file);
        onUploadComplete(data.file.url, data.file);
        toast({
          title: "Upload Successful",
          description: `File "${data.file.originalName}" uploaded successfully.`,
        });
        setProgress(100);
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      const errorMessage = err.message || "Failed to upload file. Please try again.";
      setError(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onUploadComplete("", {
      filename: "",
      originalName: "",
      mimetype: "",
      size: 0,
      url: "",
      type: "",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFile ? (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(uploadedFile.mimetype)}
              <div>
                <p className="font-medium text-sm">{uploadedFile.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type.toUpperCase()}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {currentFileUrl && (
            <div className="mt-2">
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View uploaded file
              </a>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            uploading
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 cursor-pointer"
          }`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading...</p>
                <Progress value={progress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {accept === "pdf" && "PDF files only"}
                  {accept === "audio" && "Audio files (MP3, WAV, OGG, AAC)"}
                  {accept === "image" && "Image files (JPEG, PNG, GIF, WebP)"}
                  {accept === "any" && "PDF, Audio, or Image files"}
                  {` • Max ${maxSizeMB}MB`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

