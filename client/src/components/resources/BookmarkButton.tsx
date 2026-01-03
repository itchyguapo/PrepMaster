import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";

interface BookmarkButtonProps {
  resourceId: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export function BookmarkButton({ resourceId, className, size = "icon" }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(resourceId));
  }, [resourceId]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleBookmark(resourceId);
    setBookmarked(newState);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={className}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-4 w-4 fill-current" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}

