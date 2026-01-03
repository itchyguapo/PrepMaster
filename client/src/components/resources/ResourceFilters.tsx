import { Resource, ContentType } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { detectContentType } from "./types";

type SortOption = "newest" | "popular" | "views" | "alphabetical";

interface ResourceFiltersProps {
  resources: Resource[];
  onFilterChange: (filtered: Resource[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ResourceFilters({ resources, onFilterChange, searchQuery, onSearchChange }: ResourceFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedContentType, setSelectedContentType] = useState<ContentType | "all">("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources.forEach(r => {
      if (r.category) cats.add(r.category);
    });
    return ["all", ...Array.from(cats).sort()];
  }, [resources]);

  // Apply filters
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query) ||
        r.excerpt?.toLowerCase().includes(query) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Content type filter
    if (selectedContentType !== "all") {
      filtered = filtered.filter(r => detectContentType(r) === selectedContentType);
    }

    // Quick filters
    if (quickFilters.has("featured")) {
      filtered = filtered.filter(r => r.featured);
    }
    if (quickFilters.has("downloadable")) {
      filtered = filtered.filter(r => {
        const type = detectContentType(r);
        return type === "pdf" || type === "audio" || r.fileUrl || r.metadata?.fileUrl;
      });
    }
    if (quickFilters.has("interactive")) {
      filtered = filtered.filter(r => {
        const type = detectContentType(r);
        return type === "quiz" || type === "flashcard" || type === "practice";
      });
    }

    // Sort
    switch (selectedSort) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => b.views - a.views);
        break;
      case "views":
        filtered.sort((a, b) => b.views - a.views);
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [resources, searchQuery, selectedCategory, selectedContentType, selectedSort, quickFilters]);

  // Call onFilterChange when filtered resources change
  useEffect(() => {
    onFilterChange(filteredResources);
  }, [filteredResources, onFilterChange]);

  const toggleQuickFilter = (filter: string) => {
    const newFilters = new Set(quickFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setQuickFilters(newFilters);
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedContentType("all");
    setSelectedSort("newest");
    setQuickFilters(new Set());
    onSearchChange("");
  };

  const hasActiveFilters = selectedCategory !== "all" || 
    selectedContentType !== "all" || 
    quickFilters.size > 0 || 
    searchQuery.length > 0;

  return (
    <div className="space-y-4 mb-8">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources by title, content, or tags..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Content Type Filter */}
        <Select value={selectedContentType} onValueChange={(v) => setSelectedContentType(v as ContentType | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="quiz">Quizzes</SelectItem>
            <SelectItem value="flashcard">Flashcards</SelectItem>
            <SelectItem value="note">Study Notes</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="link">External Links</SelectItem>
            <SelectItem value="notice">Notices</SelectItem>
            <SelectItem value="practice">Practice Problems</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={selectedSort} onValueChange={(v) => setSelectedSort(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="views">Most Viewed</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={quickFilters.has("featured") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleQuickFilter("featured")}
        >
          Featured
        </Button>
        <Button
          variant={quickFilters.has("downloadable") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleQuickFilter("downloadable")}
        >
          Downloadable
        </Button>
        <Button
          variant={quickFilters.has("interactive") ? "default" : "outline"}
          size="sm"
          onClick={() => toggleQuickFilter("interactive")}
        >
          Interactive
        </Button>
      </div>
    </div>
  );
}

