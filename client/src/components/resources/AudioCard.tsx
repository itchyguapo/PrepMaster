import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headphones, Play, Pause, Download, Calendar, Eye, Clock, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { formatDuration } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";

interface AudioCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function AudioCard({ resource, onClick, className }: AudioCardProps) {
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const duration = resource.metadata?.duration || 0;
  const fileUrl = resource.fileUrl || resource.metadata?.fileUrl;

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

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
    // Audio playback logic would go here
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Simple waveform visualization
  const waveform = Array.from({ length: 20 }, (_, i) => Math.random() * 60 + 20);

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* Audio Waveform Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/10 flex items-center justify-center p-4">
        <div className="w-full h-full flex items-end justify-center gap-1">
          {waveform.map((height, i) => (
            <div
              key={i}
              className="bg-indigo-500 rounded-t transition-all duration-300 group-hover:bg-indigo-600"
              style={{
                width: '4px',
                height: `${height}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            className="bg-white/90 dark:bg-gray-800/90 rounded-full p-4 group-hover:scale-110 transition-transform shadow-lg"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-indigo-600 dark:text-indigo-400 fill-current" />
            ) : (
              <Play className="h-8 w-8 text-indigo-600 dark:text-indigo-400 fill-current ml-1" />
            )}
          </button>
        </div>

        {/* Audio Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20">
            <Headphones className="h-3 w-3 mr-1" /> Audio
          </Badge>
        </div>

        {/* Featured Badge */}
        {resource.featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary">Featured</Badge>
          </div>
        )}

        {/* Duration Badge */}
        {duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
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
            Listen <ArrowRight className="ml-2 h-4 w-4" />
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

