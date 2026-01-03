import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Calendar, Eye, ArrowRight, BookOpen } from "lucide-react";
import { Resource } from "./types";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

interface FlashcardCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function FlashcardCard({ resource, onClick, className }: FlashcardCardProps) {
  const [, setLocation] = useLocation();
  const cardCount = resource.metadata?.cardCount || 20;
  const masteredCount = resource.metadata?.masteredCount || 0;
  const progress = cardCount > 0 ? (masteredCount / cardCount) * 100 : 0;

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
      {/* Flashcard Preview with Flip Animation */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="perspective-1000">
            <div className="relative w-32 h-20 transform transition-transform duration-500 group-hover:rotate-y-180">
              {/* Front of card */}
              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center border-2 border-purple-200 dark:border-purple-800 backface-hidden">
                <div className="text-center p-2">
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">Front</div>
                  <div className="text-xs text-muted-foreground mt-1">Hover to flip</div>
                </div>
              </div>
              {/* Back of card */}
              <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900 rounded-lg shadow-lg flex items-center justify-center border-2 border-purple-300 dark:border-purple-700 backface-hidden transform rotate-y-180">
                <div className="text-center p-2">
                  <div className="text-xs font-semibold text-purple-800 dark:text-purple-200">Back</div>
                  <div className="text-xs text-muted-foreground mt-1">Answer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flashcard Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
            <Layers className="h-3 w-3 mr-1" /> Flashcards
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

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {masteredCount} / {cardCount} cards mastered
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Card Count */}
        <div className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{cardCount} cards</span>
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
            handleNavigation();
          }}
        >
          Study Now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

