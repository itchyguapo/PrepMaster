import { Resource } from "@/components/resources/types";

const BOOKMARKS_KEY = "prepmaster_bookmarks";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(resourceId: string): boolean {
  return getBookmarks().includes(resourceId);
}

export function toggleBookmark(resourceId: string): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(resourceId);
  
  if (index > -1) {
    bookmarks.splice(index, 1);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return false; // Unbookmarked
  } else {
    bookmarks.push(resourceId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true; // Bookmarked
  }
}

export function shareResource(resource: Resource): void {
  const url = `${window.location.origin}/resources/${resource.slug}`;
  const text = `${resource.title}\n\n${resource.excerpt || ""}\n\n${url}`;

  if (navigator.share) {
    navigator.share({
      title: resource.title,
      text: resource.excerpt || "",
      url: url,
    }).catch(() => {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
    });
  } else {
    // Fallback to clipboard
    navigator.clipboard.writeText(url);
  }
}

