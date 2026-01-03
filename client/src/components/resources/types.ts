export type ContentType = 
  | "notice"
  | "video" 
  | "pdf" 
  | "quiz" 
  | "flashcard" 
  | "note" 
  | "audio" 
  | "link"
  | "practice";

export interface ResourceMetadata {
  contentType?: ContentType;
  fileUrl?: string;
  duration?: number; // in seconds
  pageCount?: number;
  questionCount?: number;
  cardCount?: number;
  difficulty?: "easy" | "medium" | "hard";
  fileSize?: number; // in bytes
  [key: string]: any;
}

export interface Resource {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  videoUrl?: string;
  videoEmbedCode?: string;
  fileUrl?: string;
  externalUrl?: string;
  author: string;
  category?: string;
  contentType?: ContentType;
  subject?: string;
  examBodyId?: string;
  priority?: number;
  tags: string[];
  featured: boolean;
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt?: string;
  // Extended fields
  metadata?: ResourceMetadata;
}

export function detectContentType(resource: Resource): ContentType {
  // Explicit content type (highest priority)
  if (resource.contentType) {
    return resource.contentType;
  }

  // Check metadata
  if (resource.metadata?.contentType) {
    return resource.metadata.contentType;
  }

  // Check for external URL (link type)
  if (resource.externalUrl) {
    return "link";
  }

  // Infer from existing fields
  if (resource.videoUrl || resource.videoEmbedCode) {
    return "video";
  }

  if (resource.fileUrl?.endsWith(".pdf")) {
    return "pdf";
  }

  if (resource.fileUrl?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    return "audio";
  }

  // Check category for hints
  const category = resource.category?.toLowerCase() || "";
  if (category.includes("notice") || category.includes("announcement")) {
    return "notice";
  }
  if (category.includes("quiz") || category.includes("test")) {
    return "quiz";
  }
  if (category.includes("flashcard")) {
    return "flashcard";
  }
  if (category.includes("practice") || category.includes("problem")) {
    return "practice";
  }
  if (category.includes("note") || category.includes("study")) {
    return "note";
  }

  // Default to note/blog post
  return "note";
}

