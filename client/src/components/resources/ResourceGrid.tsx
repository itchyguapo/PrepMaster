import { Resource } from "./types";
import { ResourceCard } from "./ResourceCard";
import { useMemo } from "react";

interface ResourceGridProps {
  resources: Resource[];
  className?: string;
  onResourceClick?: (resource: Resource) => void;
}

export function ResourceGrid({ resources, onResourceClick, className }: ResourceGridProps) {
  const handleClick = (resource: Resource) => {
    if (onResourceClick) {
      onResourceClick(resource);
    }
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No resources found. Check back soon for new content!</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className || ''}`}>
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={() => handleClick(resource)}
        />
      ))}
    </div>
  );
}

