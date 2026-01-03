import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Play, Calendar, Eye, Clock, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { formatDuration } from "@/lib/utils";
import { BookmarkButton } from "./BookmarkButton";
import { ShareButton } from "./ShareButton";
import { useLocation } from "wouter";

interface VideoCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
  showActions?: boolean;
}

export function VideoCard({ resource, onClick, className, showActions = true }: VideoCardProps) {
  const [, setLocation] = useLocation();
  const duration = resource.metadata?.duration;
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const youtubeMatch = resource.videoUrl?.match(youtubeRegex);
  const vimeoMatch = resource.videoUrl?.match(vimeoRegex);
  const thumbnailUrl = youtubeMatch 
    ? `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`
    : null;

  const handleNavigation = () => {
    if (!resource.slug) {
      console.error("Resource missing slug:", resource);
      return;
    }
    console.log("Navigating to resource:", resource.slug);
    setLocation(`/resources/${resource.slug}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Video className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div 
          className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Play overlay clicked", resource);
            handleNavigation();
          }}
        >
          <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-primary fill-primary ml-1" />
          </div>
        </div>

        {/* Duration Badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </div>
        )}

        {/* Video Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-sm">
            <Video className="h-3 w-3 mr-1" /> Video
          </Badge>
        </div>

        {/* Featured Badge */}
        {resource.featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary">Featured</Badge>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ marginTop: resource.featured ? '32px' : '0' }}>
            <BookmarkButton resourceId={resource.id} />
            <ShareButton resource={resource} />
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
            console.log("Watch Video button clicked", resource);
            handleNavigation();
          }}
        >
          Watch Video <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

