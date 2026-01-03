import { Resource, detectContentType } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, FileText, HelpCircle, Layers, Headphones, Calculator, BookOpen } from "lucide-react";
import { formatDuration, formatFileSize } from "@/lib/utils";

interface QuickPreviewProps {
  resource: Resource;
  position: { x: number; y: number };
}

export function QuickPreview({ resource, position }: QuickPreviewProps) {
  const contentType = detectContentType(resource);
  const duration = resource.metadata?.duration;
  const fileSize = resource.metadata?.fileSize;
  const questionCount = resource.metadata?.questionCount;
  const cardCount = resource.metadata?.cardCount;
  const difficulty = resource.metadata?.difficulty;

  const getIcon = () => {
    switch (contentType) {
      case "video": return <Video className="h-5 w-5" />;
      case "pdf": return <FileText className="h-5 w-5" />;
      case "quiz": return <HelpCircle className="h-5 w-5" />;
      case "flashcard": return <Layers className="h-5 w-5" />;
      case "audio": return <Headphones className="h-5 w-5" />;
      case "practice": return <Calculator className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <Card 
      className="w-80 shadow-2xl border-2 z-50 pointer-events-none"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%) translateY(-10px)",
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold line-clamp-2 text-sm">{resource.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {contentType}
              </Badge>
              {resource.category && (
                <Badge variant="secondary" className="text-xs">
                  {resource.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Excerpt */}
        {resource.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {resource.excerpt}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {duration && (
            <span>Duration: {formatDuration(duration)}</span>
          )}
          {fileSize && (
            <span>Size: {formatFileSize(fileSize)}</span>
          )}
          {questionCount && (
            <span>{questionCount} questions</span>
          )}
          {cardCount && (
            <span>{cardCount} cards</span>
          )}
          {difficulty && (
            <span className="capitalize">{difficulty}</span>
          )}
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

