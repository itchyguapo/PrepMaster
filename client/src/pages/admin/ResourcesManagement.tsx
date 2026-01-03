import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  FileText,
  Video,
  File,
  BookOpen,
  Headphones,
  Zap,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminApi";
import { ResourceEditor } from "@/components/admin/resources/ResourceEditor";
import type { BlogPost } from "@shared/schema";

type Resource = BlogPost;
type ContentType = "note" | "video" | "pdf" | "quiz" | "flashcard" | "audio" | "practice" | "all";

export default function ResourcesManagement() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ContentType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "published" | "draft">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/blog");
      if (res.ok) {
        const data = await res.json();
        setResources(data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load resources.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Resource deleted successfully.",
        });
        void fetchResources();
        setDeleteResourceId(null);
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete resource" }));
        throw new Error(errorData.message || "Failed to delete resource");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
      setDeleteResourceId(null);
    }
  };

  const handleTogglePublish = async (resource: Resource) => {
    try {
      const res = await adminFetch(`/api/admin/blog/${resource.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...resource,
          published: !resource.published,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Resource ${resource.published ? "unpublished" : "published"} successfully.`,
        });
        void fetchResources();
      } else {
        toast({
          title: "Error",
          description: "Failed to update resource.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating resource:", error);
      toast({
        title: "Error",
        description: "Failed to update resource.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (resource: Resource) => {
    try {
      const res = await adminFetch(`/api/admin/blog/${resource.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...resource,
          featured: !resource.featured,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Resource ${resource.featured ? "unfeatured" : "featured"} successfully.`,
        });
        void fetchResources();
      } else {
        toast({
          title: "Error",
          description: "Failed to update resource.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating resource:", error);
      toast({
        title: "Error",
        description: "Failed to update resource.",
        variant: "destructive",
      });
    }
  };

  const getContentTypeIcon = (resource: Resource) => {
    const contentType = (resource as any).contentType || "note";
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
        return <File className="h-4 w-4" />;
      case "quiz":
        return <Zap className="h-4 w-4" />;
      case "flashcard":
        return <BookOpen className="h-4 w-4" />;
      case "audio":
        return <Headphones className="h-4 w-4" />;
      case "practice":
        return <Zap className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const detectContentType = (resource: Resource): ContentType => {
    if ((resource as any).contentType) {
      return (resource as any).contentType as ContentType;
    }
    if (resource.videoUrl || resource.videoEmbedCode) return "video";
    if (resource.metadata && (resource.metadata as any).pdfUrl) return "pdf";
    if (resource.metadata && (resource.metadata as any).quizQuestions) return "quiz";
    if (resource.metadata && (resource.metadata as any).flashcards) return "flashcard";
    if (resource.metadata && (resource.metadata as any).audioUrl) return "audio";
    if (resource.metadata && (resource.metadata as any).problemStatement) return "practice";
    return "note";
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !searchQuery ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === "all" || detectContentType(resource) === selectedType;
    const matchesCategory =
      selectedCategory === "all" || resource.category === selectedCategory;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "published" && resource.published) ||
      (selectedStatus === "draft" && !resource.published);

    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const allCategories = Array.from(
    new Set(resources.map((r) => r.category).filter(Boolean))
  ) as string[];

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Resources Management</h1>
            <p className="text-muted-foreground">
              Create and manage educational resources, blog posts, and content.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Resource
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="flashcard">Flashcard</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStatus}
                onValueChange={(v) =>
                  setSelectedStatus(v as "all" | "published" | "draft")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resources ({filteredResources.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No resources found. Create your first resource to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(resource)}
                          <div>
                            <div className="font-medium">{resource.title}</div>
                            {resource.excerpt && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {resource.excerpt}
                              </div>
                            )}
                          </div>
                          {resource.featured && (
                            <Badge variant="secondary" className="ml-2">
                              <Star className="h-3 w-3 mr-1" /> Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {detectContentType(resource)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {resource.category ? (
                          <Badge variant="secondary">{resource.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={resource.published ? "default" : "secondary"}
                        >
                          {resource.published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>{resource.views || 0}</TableCell>
                      <TableCell>{formatDate(resource.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedResource(resource);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTogglePublish(resource)}
                            >
                              {resource.published ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" /> Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" /> Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleFeatured(resource)}
                            >
                              {resource.featured ? (
                                <>
                                  <StarOff className="mr-2 h-4 w-4" /> Unfeature
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" /> Feature
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog open={deleteResourceId === resource.id} onOpenChange={(open) => !open && setDeleteResourceId(null)}>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onClick={() => setDeleteResourceId(resource.id)}
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{resource.title}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteResourceId(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(resource.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Resource</DialogTitle>
              <DialogDescription>
                Create a new educational resource for students.
              </DialogDescription>
            </DialogHeader>
            <ResourceEditor
              onSave={async (resourceData) => {
                try {
                  const res = await adminFetch("/api/admin/blog", {
                    method: "POST",
                    body: JSON.stringify(resourceData),
                  });

                  if (res.ok) {
                    toast({
                      title: "Success",
                      description: "Resource created successfully.",
                    });
                    setIsCreateDialogOpen(false);
                    void fetchResources();
                  } else {
                    const error = await res.json();
                    toast({
                      title: "Error",
                      description: error.message || "Failed to create resource.",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error creating resource:", error);
                  toast({
                    title: "Error",
                    description: "Failed to create resource.",
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
              <DialogDescription>
                Update the resource details.
              </DialogDescription>
            </DialogHeader>
            {selectedResource && (
              <ResourceEditor
                resource={selectedResource}
                onSave={async (resourceData) => {
                  try {
                    const res = await adminFetch(`/api/admin/blog/${selectedResource.id}`, {
                      method: "PUT",
                      body: JSON.stringify(resourceData),
                    });

                    if (res.ok) {
                      toast({
                        title: "Success",
                        description: "Resource updated successfully.",
                      });
                      setIsEditDialogOpen(false);
                      setSelectedResource(null);
                      void fetchResources();
                    } else {
                      const error = await res.json();
                      toast({
                        title: "Error",
                        description: error.message || "Failed to update resource.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error("Error updating resource:", error);
                    toast({
                      title: "Error",
                      description: "Failed to update resource.",
                      variant: "destructive",
                    });
                  }
                }}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedResource(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

