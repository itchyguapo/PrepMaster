import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, X, ArrowRight } from "lucide-react";
import { Resource } from "./types";
import { useLocation } from "wouter";
import { useState } from "react";

interface NoticeCardProps {
  resource: Resource;
  onDismiss?: (id: string) => void;
  className?: string;
}

export function NoticeCard({ resource, onDismiss, className }: NoticeCardProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss(resource.id);
    }
    // Store dismissal in localStorage
    const dismissedNotices = JSON.parse(localStorage.getItem("dismissedNotices") || "[]");
    dismissedNotices.push(resource.id);
    localStorage.setItem("dismissedNotices", JSON.stringify(dismissedNotices));
  };

  const handleClick = () => {
    if (!resource.slug) {
      console.error("Resource missing slug:", resource);
      return;
    }
    setLocation(`/resources/${resource.slug}`);
  };

  // Check if notice was previously dismissed
  const dismissedNotices = JSON.parse(localStorage.getItem("dismissedNotices") || "[]");
  if (dismissedNotices.includes(resource.id) || dismissed) {
    return null;
  }

  const priority = resource.priority || 0;
  const isHighPriority = priority >= 5;

  return (
    <Card 
      className={`border-2 ${isHighPriority ? 'border-destructive bg-destructive/5' : 'border-primary/50 bg-primary/5'} ${className || ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-lg ${isHighPriority ? 'bg-destructive/20' : 'bg-primary/20'}`}>
              <AlertCircle className={`h-5 w-5 ${isHighPriority ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg font-bold">{resource.title}</CardTitle>
                {isHighPriority && (
                  <Badge variant="destructive" className="text-xs">High Priority</Badge>
                )}
                {priority > 0 && priority < 5 && (
                  <Badge variant="default" className="text-xs">Important</Badge>
                )}
              </div>
              {resource.excerpt && (
                <CardDescription className="text-sm mt-1">
                  {resource.excerpt}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(resource.createdAt)}
            </span>
            {resource.category && (
              <Badge variant="outline" className="text-xs">{resource.category}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className="flex items-center gap-2"
          >
            Read More <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

