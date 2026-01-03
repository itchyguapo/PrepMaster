import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { FileUploader } from "./FileUploader";
import type { BlogPost } from "@shared/schema";

type ContentType = "notice" | "note" | "video" | "pdf" | "quiz" | "flashcard" | "audio" | "link" | "practice";

interface ResourceEditorProps {
  resource?: BlogPost | null;
  onSave: (resource: Partial<BlogPost>) => Promise<void>;
  onCancel: () => void;
}

export function ResourceEditor({ resource, onSave, onCancel }: ResourceEditorProps) {
  const [contentType, setContentType] = useState<ContentType>(
    ((resource as any)?.contentType as ContentType) || "note"
  );
  const [title, setTitle] = useState(resource?.title || "");
  const [slug, setSlug] = useState(resource?.slug || "");
  const [content, setContent] = useState(resource?.content || "");
  const [excerpt, setExcerpt] = useState(resource?.excerpt || "");
  const [category, setCategory] = useState(resource?.category || "");
  const [tags, setTags] = useState<string[]>(resource?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [featured, setFeatured] = useState(resource?.featured || false);
  const [published, setPublished] = useState(resource?.published !== false);
  const [author, setAuthor] = useState(resource?.author || "PrepMaster Team");
  const [subject, setSubject] = useState(resource?.subject || "");
  const [examBodyId, setExamBodyId] = useState(resource?.examBodyId || "");
  const [priority, setPriority] = useState(resource?.priority || 0);
  const [externalUrl, setExternalUrl] = useState(resource?.externalUrl || "");

  // Type-specific fields
  const [videoUrl, setVideoUrl] = useState(resource?.videoUrl || "");
  const [videoEmbedCode, setVideoEmbedCode] = useState(resource?.videoEmbedCode || "");
  const [fileUrl, setFileUrl] = useState(resource?.fileUrl || "");

  // Initialize fields when resource changes
  useEffect(() => {
    if (resource) {
      setContentType(((resource as any).contentType as ContentType) || "note");
      setTitle(resource.title || "");
      setSlug(resource.slug || "");
      setContent(resource.content || "");
      setExcerpt(resource.excerpt || "");
      setCategory(resource.category || "");
      setTags(resource.tags || []);
      setFeatured(resource.featured || false);
      setPublished(resource.published !== false);
      setAuthor(resource.author || "PrepMaster Team");
      setSubject(resource.subject || "");
      setExamBodyId(resource.examBodyId || "");
      setPriority(resource.priority || 0);
      setExternalUrl(resource.externalUrl || "");
      setVideoUrl(resource.videoUrl || "");
      setVideoEmbedCode(resource.videoEmbedCode || "");
      const fileUrlValue = resource.fileUrl || "";
      setFileUrl(fileUrlValue);
      // Sync fileUrl with pdfUrl/audioUrl based on content type
      if (resource.contentType === "pdf") {
        setPdfUrl(fileUrlValue);
      } else if (resource.contentType === "audio") {
        setAudioUrl(fileUrlValue);
      }
    }
  }, [resource]);
  const [metadata, setMetadata] = useState<Record<string, any>>(
    resource?.metadata || {}
  );
  const [pdfUrl, setPdfUrl] = useState(
    resource?.fileUrl || resource?.metadata?.pdfUrl || ""
  );
  const [audioUrl, setAudioUrl] = useState(
    resource?.fileUrl || resource?.metadata?.audioUrl || ""
  );
  const [imageUrl, setImageUrl] = useState(
    resource?.metadata?.imageUrl || ""
  );

  // Fetch exam bodies and subjects for dropdowns
  const [examBodies, setExamBodies] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchExamBodies = async () => {
      try {
        const res = await fetch("/api/exam-bodies");
        if (res.ok) {
          const data = await res.json();
          setExamBodies(data || []);
        }
      } catch (err) {
        console.error("Error fetching exam bodies:", err);
      }
    };
    void fetchExamBodies();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (!resource && title) {
      const generatedSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 100); // Limit length

      // Ensure slug is not empty
      if (generatedSlug) {
        setSlug(generatedSlug);
      } else {
        // Fallback to a default slug if title generates empty slug
        setSlug(`resource-${Date.now()}`);
      }
    }
  }, [title, resource]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title || !content) {
      alert("Title and content are required");
      return;
    }

    // Ensure slug is normalized - generate if missing
    const normalizedSlug = (slug || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 100);

    if (!normalizedSlug) {
      alert("Slug cannot be empty. Please provide a valid slug.");
      return;
    }

    const resourceData: Partial<BlogPost> = {
      title,
      slug: normalizedSlug,
      content,
      excerpt: excerpt || null,
      // @ts-ignore
      contentType,
      category: category || null,
      subject: subject || null,
      examBodyId: examBodyId || null,
      priority: contentType === "notice" ? priority : 0,
      tags,
      featured,
      published,
      author,
      videoUrl: contentType === "video" ? videoUrl || null : null,
      videoEmbedCode: contentType === "video" ? videoEmbedCode || null : null,
      fileUrl: (contentType === "pdf" || contentType === "audio") ? (fileUrl || pdfUrl || audioUrl || null) : null,
      externalUrl: contentType === "link" ? externalUrl || null : null,
      metadata: {
        ...metadata,
        ...(contentType === "pdf" && pdfUrl ? { pdfUrl } : {}),
        ...(contentType === "audio" && audioUrl ? { audioUrl } : {}),
        // @ts-ignore
        ...(contentType === "image" && imageUrl ? { imageUrl } : {}),
      },
    };

    if (resource?.id) {
      resourceData.id = resource.id;
    }

    await onSave(resourceData);
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selector */}
      <div>
        <Label>Content Type</Label>
        <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notice">Notice</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="flashcard">Flashcard</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="link">External Link</SelectItem>
            <SelectItem value="practice">Practice Problem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Basic Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter resource title"
          />
        </div>

        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-friendly-slug"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Auto-generated from title. Used in the URL.
          </p>
        </div>

        <div>
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief description of the resource"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Main content of the resource"
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Rich text editor coming soon. For now, use plain text or HTML.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Study Tips, Subject Notes"
            />
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="examBodyId">Exam Body (Optional)</Label>
            <Select value={examBodyId || "none"} onValueChange={(value) => setExamBodyId(value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam body" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {examBodies.map((body) => (
                  <SelectItem key={body.id} value={body.id}>
                    {body.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, Physics"
            />
          </div>
        </div>

        {contentType === "notice" && (
          <div>
            <Label htmlFor="priority">Priority (0-10)</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="10"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              placeholder="Higher priority = more prominent display"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Higher priority notices appear more prominently. Use 5+ for high-priority notices.
            </p>
          </div>
        )}

        <div>
          <Label>Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag and press Enter"
            />
            <Button type="button" onClick={handleAddTag} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Type-Specific Fields */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="type-specific">Type-Specific</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="type-specific" className="space-y-4">
          {contentType === "video" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                />
              </div>
              <div>
                <Label htmlFor="videoEmbedCode">Custom Embed Code</Label>
                <Textarea
                  id="videoEmbedCode"
                  value={videoEmbedCode}
                  onChange={(e) => setVideoEmbedCode(e.target.value)}
                  placeholder="<iframe>...</iframe>"
                  rows={4}
                />
              </div>
            </div>
          )}

          {contentType === "pdf" && (
            <div className="space-y-4">
              <FileUploader
                accept="pdf"
                label="Upload PDF File"
                description="Upload a PDF file for this resource. Maximum file size: 50MB"
                maxSizeMB={50}
                onUploadComplete={(url, fileData) => {
                  setFileUrl(url);
                  setPdfUrl(url);
                  setMetadata({
                    ...metadata,
                    pdfUrl: url,
                    pdfFilename: fileData.filename,
                    pdfSize: fileData.size,
                  });
                }}
                currentFileUrl={fileUrl || pdfUrl}
              />
              <div>
                <Label htmlFor="pdfUrl">Or Enter PDF URL</Label>
                <Input
                  id="pdfUrl"
                  value={fileUrl || pdfUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFileUrl(url);
                    setPdfUrl(url);
                    setMetadata({ ...metadata, pdfUrl: url });
                  }}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            </div>
          )}

          {contentType === "link" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="externalUrl">External URL *</Label>
                <Input
                  id="externalUrl"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/resource"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The URL that will open when users click this link resource.
                </p>
              </div>
            </div>
          )}

          {contentType === "notice" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="noticePriority">Priority Display</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Notices with higher priority appear more prominently. Priority is set in the Basic Info section.
                </p>
              </div>
            </div>
          )}

          {contentType === "quiz" && (
            <div>
              <Label>Quiz Questions</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Interactive quiz builder coming soon. For now, add quiz data in metadata.
              </p>
              <Textarea
                placeholder="Quiz questions JSON (coming soon: visual builder)"
                disabled
                rows={6}
              />
            </div>
          )}

          {contentType === "flashcard" && (
            <div>
              <Label>Flashcards</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Flashcard builder coming soon. For now, add flashcard data in metadata.
              </p>
              <Textarea
                placeholder="Flashcards JSON (coming soon: visual builder)"
                disabled
                rows={6}
              />
            </div>
          )}

          {contentType === "audio" && (
            <div className="space-y-4">
              <FileUploader
                accept="audio"
                label="Upload Audio File"
                description="Upload an audio file (MP3, WAV, OGG, AAC). Maximum file size: 50MB"
                maxSizeMB={50}
                onUploadComplete={(url, fileData) => {
                  setFileUrl(url);
                  setAudioUrl(url);
                  setMetadata({
                    ...metadata,
                    audioUrl: url,
                    audioFilename: fileData.filename,
                    audioSize: fileData.size,
                    duration: metadata.duration || null,
                  });
                }}
                currentFileUrl={fileUrl || audioUrl}
              />
              <div>
                <Label htmlFor="audioUrl">Or Enter Audio URL</Label>
                <Input
                  id="audioUrl"
                  value={fileUrl || audioUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFileUrl(url);
                    setAudioUrl(url);
                    setMetadata({ ...metadata, audioUrl: url });
                  }}
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
              {(fileUrl || audioUrl) && (
                <div>
                  <Label htmlFor="audioDuration">Duration (seconds)</Label>
                  <Input
                    id="audioDuration"
                    type="number"
                    value={metadata.duration || ""}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        duration: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="300"
                  />
                </div>
              )}
            </div>
          )}

          {contentType === "practice" && (
            <div>
              <Label>Practice Problem</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Practice problem builder coming soon.
              </p>
              <Textarea
                placeholder="Problem statement and solution (coming soon: visual builder)"
                disabled
                rows={6}
              />
            </div>
          )}

          {/* Image upload for any content type (for thumbnails/featured images) */}
          <div>
            <Label>Featured Image (Optional)</Label>
            <FileUploader
              accept="image"
              label=""
              description="Upload a featured image for this resource"
              maxSizeMB={10}
              onUploadComplete={(url, fileData) => {
                setImageUrl(url);
                setMetadata({
                  ...metadata,
                  imageUrl: url,
                  imageFilename: fileData.filename,
                });
              }}
              currentFileUrl={imageUrl}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="featured">Featured</Label>
              <p className="text-sm text-muted-foreground">
                Show this resource prominently on the resources page
              </p>
            </div>
            <Switch
              id="featured"
              checked={featured}
              onCheckedChange={setFeatured}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="published">Published</Label>
              <p className="text-sm text-muted-foreground">
                Make this resource visible to students
              </p>
            </div>
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {resource ? "Update Resource" : "Create Resource"}
        </Button>
      </div>
    </div>
  );
}

