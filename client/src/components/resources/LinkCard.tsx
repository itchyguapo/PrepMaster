import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, Eye, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { useLocation } from "wouter";

interface LinkCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
  showActions?: boolean;
}

export function LinkCard({ resource, onClick, className, showActions = true }: LinkCardProps) {
  const [, setLocation] = useLocation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleNavigation = () => {
    if (resource.externalUrl) {
      // Open external link in new tab
      window.open(resource.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (resource.slug) {
      // Fallback to internal navigation
      setLocation(`/resources/${resource.slug}`);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      handleNavigation();
    }
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* Link Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 flex items-center justify-center">
        <div className="text-center space-y-2">
          <ExternalLink className="h-16 w-16 text-blue-500 mx-auto" />
          <div className="text-xs text-muted-foreground font-medium">External Link</div>
          {resource.externalUrl && (
            <div className="text-xs text-muted-foreground max-w-[200px] truncate">
              {new URL(resource.externalUrl).hostname}
            </div>
          )}
        </div>

        {/* Link Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
            <ExternalLink className="h-3 w-3 mr-1" /> Link
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

        {/* CTA */}
        <Button 
          type="button"
          variant="ghost" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick();
          }}
        >
          Open Link <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

