import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Eye, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { formatFileSize } from "@/lib/utils";
import { useLocation } from "wouter";

interface PDFCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function PDFCard({ resource, onClick, className }: PDFCardProps) {
  const [, setLocation] = useLocation();
  const fileUrl = resource.fileUrl || resource.metadata?.fileUrl;
  const fileSize = resource.metadata?.fileSize;
  const pageCount = resource.metadata?.pageCount;

  const handleNavigation = () => {
    if (!resource.slug) {
      console.error("PDFCard: Resource missing slug:", resource);
      console.error("PDFCard: Resource data:", {
        id: resource.id,
        title: resource.title,
        slug: resource.slug,
        published: resource.published
      });
      return;
    }
    // Ensure slug is properly encoded for URL
    const encodedSlug = encodeURIComponent(resource.slug);
    console.log("PDFCard: Navigating to resource:", {
      slug: resource.slug,
      encodedSlug,
      id: resource.id,
      title: resource.title,
      published: resource.published
    });
    setLocation(`/resources/${encodedSlug}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* PDF Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 flex items-center justify-center">
        <div className="text-center space-y-2">
          <FileText className="h-16 w-16 text-red-500 mx-auto" />
          <div className="text-xs text-muted-foreground font-medium">PDF Document</div>
          {pageCount && (
            <div className="text-xs text-muted-foreground">{pageCount} pages</div>
          )}
        </div>

        {/* PDF Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            <FileText className="h-3 w-3 mr-1" /> PDF
          </Badge>
        </div>

        {/* Featured Badge */}
        {resource.featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary">Featured</Badge>
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
            {resource.title}
          </CardTitle>
        </div>
        {resource.excerpt && (
          <CardDescription className="line-clamp-2 mt-2">
            {resource.excerpt}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(resource.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {resource.views}
            </span>
          </div>
          {resource.category && (
            <Badge variant="outline">{resource.category}</Badge>
          )}
        </div>

        {/* File Info */}
        {(fileSize || pageCount) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {fileSize && <span>{formatFileSize(fileSize)}</span>}
            {fileSize && pageCount && <span>•</span>}
            {pageCount && <span>{pageCount} pages</span>}
          </div>
        )}

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resource.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            type="button"
            variant="ghost" 
            className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigation();
            }}
          >
            View <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {fileUrl && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleDownload}
              className="group-hover:border-primary group-hover:text-primary"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

