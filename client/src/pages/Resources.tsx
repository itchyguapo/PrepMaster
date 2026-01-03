import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { Resource } from "@/components/resources/types";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceGrid } from "@/components/resources/ResourceGrid";
import { ResourceFilters } from "@/components/resources/ResourceFilters";
import { detectContentType } from "@/components/resources/types";
import { NoticeCard } from "@/components/resources/NoticeCard";

// Main Resources page
export default function Resources() {
  const [, setLocation] = useLocation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch("/api/blog");
        if (res.ok) {
          const data = await res.json();
          setResources(data || []);
          setFilteredResources(data || []);
        }
      } catch (err) {
        console.error("Error fetching resources:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchResources();
  }, []);

  // Handle resource click
  const handleResourceClick = (resource: Resource) => {
    if (!resource.slug) {
      console.error("Resource missing slug:", resource);
      return;
    }
    setLocation(`/resources/${resource.slug}`);
  };

  // Get featured resources (excluding notices)
  const featuredResources = resources.filter(r => r.featured && detectContentType(r) !== "notice").slice(0, 5);
  
  // Get notices (contentType === "notice" with priority > 0)
  const notices = resources.filter(r => {
    const type = detectContentType(r);
    return type === "notice" && (r.priority || 0) > 0;
  });
  
  // Get non-notice resources for the main grid
  const nonNoticeResources = filteredResources.filter(r => {
    const type = detectContentType(r);
    return type !== "notice";
  });

  // List view
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold">Learning Resources</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access study notes, video tutorials, interactive quizzes, flashcards, and educational content to supplement your exam preparation.
            </p>
          </div>

          {/* Notices Section - Prominently displayed at top */}
          {notices.length > 0 && (
            <div className="mb-12 space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-destructive">⚠️</span> Important Notices
              </h2>
              <div className="space-y-3">
                {notices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    resource={notice}
                    onDismiss={(id) => {
                      // Remove dismissed notice from view
                      setFilteredResources(prev => prev.filter(r => r.id !== id));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Hero */}
          {featuredResources.length > 0 && (
            <div className="mb-12">
              <ResourceHero 
                featuredResources={featuredResources}
                onResourceClick={handleResourceClick}
              />
            </div>
          )}

          {/* Filters */}
          <ResourceFilters
            resources={resources}
            onFilterChange={setFilteredResources}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Resources Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading resources...</p>
            </div>
          ) : nonNoticeResources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No resources found. Try adjusting your filters.</p>
            </div>
          ) : (
            <ResourceGrid
              resources={nonNoticeResources}
              onResourceClick={handleResourceClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
