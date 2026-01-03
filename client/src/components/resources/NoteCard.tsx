import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Eye, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { useLocation } from "wouter";

interface NoteCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function NoteCard({ resource, onClick, className }: NoteCardProps) {
  const [, setLocation] = useLocation();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Extract preview from content
  const preview = resource.excerpt || resource.content.slice(0, 150) + "...";

  const handleNavigation = () => {
    if (!resource.slug) {
      console.error("Resource missing slug:", resource);
      return;
    }
    console.log("Navigating to resource:", resource.slug);
    setLocation(`/resources/${resource.slug}`);
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* Note Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/10 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <BookOpen className="h-16 w-16 text-emerald-500 mx-auto" />
          <div className="text-xs text-muted-foreground font-medium">Study Notes</div>
        </div>

        {/* Note Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
            <BookOpen className="h-3 w-3 mr-1" /> Notes
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
        {preview && (
          <CardDescription className="line-clamp-3 mt-2">
            {preview}
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
            e.stopPropagation(); // Prevent card click when button is clicked
            handleNavigation();
          }}
        >
          Read More <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

