import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, Calendar, Eye, ArrowRight, CheckCircle2 } from "lucide-react";
import { Resource } from "./types";
import { useLocation } from "wouter";

interface PracticeProblemCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function PracticeProblemCard({ resource, onClick, className }: PracticeProblemCardProps) {
  const [, setLocation] = useLocation();
  const difficulty = resource.metadata?.difficulty || "medium";
  const hasSolution = resource.metadata?.hasSolution !== false;

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

  const difficultyColors = {
    easy: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    hard: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 ${resource.featured ? 'ring-2 ring-primary/20' : ''} ${className || ''}`}
    >
      {/* Problem Preview */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/10 flex items-center justify-center">
        <div className="text-center space-y-2 p-4">
          <Calculator className="h-16 w-16 text-orange-500 mx-auto" />
          <div className="text-xs text-muted-foreground font-medium">Practice Problem</div>
          <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level
          </div>
        </div>

        {/* Practice Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
            <Calculator className="h-3 w-3 mr-1" /> Practice
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

        {/* Difficulty & Solution */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={difficultyColors[difficulty]}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Badge>
          {hasSolution && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Solution available
            </div>
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
            handleNavigation();
          }}
        >
          Solve Problem <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

