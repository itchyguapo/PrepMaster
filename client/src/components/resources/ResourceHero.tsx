import { Resource, detectContentType } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Calendar, Eye, Clock } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { formatDuration } from "@/lib/utils";
import { useLocation } from "wouter";

interface ResourceHeroProps {
  featuredResources: Resource[];
  onResourceClick?: (resource: Resource) => void;
}

export function ResourceHero({ featuredResources, onResourceClick }: ResourceHeroProps) {
  const [, setLocation] = useLocation();

  if (featuredResources.length === 0) {
    return null;
  }

  const handleClick = (resource: Resource) => {
    if (onResourceClick) {
      onResourceClick(resource);
    } else {
      setLocation(`/resources/${resource.slug}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mb-12">
      <Carousel className="w-full">
        <CarouselContent>
          {featuredResources.map((resource) => {
            const contentType = detectContentType(resource);
            const duration = resource.metadata?.duration;
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const youtubeMatch = resource.videoUrl?.match(youtubeRegex);
            const thumbnailUrl = youtubeMatch 
              ? `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`
              : null;

            return (
              <CarouselItem key={resource.id}>
                <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden group cursor-pointer" onClick={() => handleClick(resource)}>
                  {/* Background Image/Video Thumbnail */}
                  {thumbnailUrl ? (
                    <div className="absolute inset-0">
                      <img 
                        src={thumbnailUrl} 
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
                  )}

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-8 md:p-12">
                    <div className="max-w-3xl">
                      {/* Category Badge */}
                      {resource.category && (
                        <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/30">
                          {resource.category}
                        </Badge>
                      )}

                      {/* Title */}
                      <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 line-clamp-2">
                        {resource.title}
                      </h2>

                      {/* Excerpt */}
                      {resource.excerpt && (
                        <p className="text-lg md:text-xl text-white/90 mb-6 line-clamp-2">
                          {resource.excerpt}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center gap-6 text-white/80 mb-6">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(resource.createdAt)}
                        </span>
                        <span className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          {resource.views} views
                        </span>
                        {duration && (
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatDuration(duration)}
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <Button 
                        size="lg" 
                        className="w-fit group-hover:scale-105 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClick(resource);
                        }}
                      >
                        {contentType === "video" ? (
                          <>
                            <Play className="mr-2 h-5 w-5 fill-current" />
                            Watch Now
                          </>
                        ) : (
                          <>
                            Explore <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
}

