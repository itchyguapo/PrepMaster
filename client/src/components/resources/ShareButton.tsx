import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Resource } from "./types";
import { shareResource } from "@/lib/bookmarks";

interface ShareButtonProps {
  resource: Resource;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export function ShareButton({ resource, className, size = "icon" }: ShareButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareResource(resource);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={className}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}

