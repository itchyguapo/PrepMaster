import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertCircle, Lock, ExternalLink } from "lucide-react";
import { Resource, detectContentType } from "@/components/resources/types";
import { PDFViewer } from "@/components/resources/viewers/PDFViewer";
import { QuizEmbed } from "@/components/resources/viewers/QuizEmbed";
import { FlashcardStudy } from "@/components/resources/viewers/FlashcardStudy";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Video embed utility
function renderVideoEmbed(resource: Resource) {
  // Check for custom embed code first
  if (resource.videoEmbedCode) {
    return (
      <div 
        className="w-full aspect-video"
        dangerouslySetInnerHTML={{ __html: resource.videoEmbedCode }}
      />
    );
  }

  if (!resource.videoUrl) {
    return null;
  }

  const url = resource.videoUrl.trim();
  
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={resource.title}
        />
      </div>
    );
  }

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={resource.title}
        />
      </div>
    );
  }

  // Self-hosted video (MP4, WebM, etc.)
  if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
        <video
          controls
          className="w-full h-full"
          src={url}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Generic video URL - try as iframe
  if (url.startsWith("http")) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={resource.title}
        />
      </div>
    );
  }

  return null;
}

export default function ResourceViewer() {
  const [, setLocation] = useLocation();
  const routeMatch = useRoute("/resources/:slug");
  // In wouter, useRoute returns [match, params] where match is boolean and params is object
  const params = routeMatch[1];
  const slugFromRoute = params?.slug;
  const { canAccessExams } = useAuth();
  
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get slug from route params or extract from URL
    let resourceSlug = slugFromRoute;
    
    if (!resourceSlug) {
      // Fallback: extract from URL path (same pattern as ExamRoom)
      const pathParts = window.location.pathname.split("/");
      const resourcesIndex = pathParts.indexOf("resources");
      if (resourcesIndex !== -1 && pathParts[resourcesIndex + 1]) {
        resourceSlug = decodeURIComponent(pathParts[resourcesIndex + 1]);
        console.log("ResourceViewer: Extracted slug from URL path:", resourceSlug);
      }
    }
    
    if (!resourceSlug) {
      console.error("ResourceViewer: No slug found in route or URL");
      console.error("ResourceViewer: Route match:", routeMatch);
      console.error("ResourceViewer: Current pathname:", window.location.pathname);
      setError("No resource specified");
      setLoading(false);
      return;
    }

    const fetchResource = async () => {
      setLoading(true);
      setError(null);
      try {
        // Decode the slug in case it was URL-encoded
        const decodedSlug = decodeURIComponent(resourceSlug);
        console.log(`ResourceViewer: Fetching resource with slug: "${resourceSlug}" (decoded: "${decodedSlug}")`);
        // Encode the slug for the URL
        const encodedSlug = encodeURIComponent(decodedSlug);
        const res = await fetch(`/api/blog/${encodedSlug}`);
        const responseData = await res.json();
        
        console.log(`ResourceViewer: Response status: ${res.status}`, responseData);
        
        if (res.ok) {
          if (!responseData || !responseData.id) {
            console.error("ResourceViewer: Invalid response data:", responseData);
            setError("Invalid resource data received");
            return;
          }
          console.log(`ResourceViewer: Resource loaded successfully. ID: ${responseData.id}, Title: "${responseData.title}", Slug: "${responseData.slug}"`);
          setResource(responseData as Resource);
        } else if (res.status === 404) {
          console.error(`ResourceViewer: Resource not found. Slug: "${resourceSlug}"`, responseData);
          setError(responseData.message || `Resource not found: ${resourceSlug}`);
        } else {
          console.error(`ResourceViewer: Error ${res.status}`, responseData);
          setError(responseData.message || "Failed to load resource. Please try again.");
        }
      } catch (err) {
        console.error("ResourceViewer: Network error fetching resource:", err);
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    void fetchResource();
  }, [slugFromRoute]); // Re-fetch when slug changes

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading resource...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !resource) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle>Resource Not Found</CardTitle>
                    <CardDescription>The resource you're looking for doesn't exist or has been removed.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{error || "Resource not found"}</p>
                <div className="flex gap-2">
                  <Button onClick={() => setLocation("/resources")} variant="default">
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Back to Resources
                  </Button>
                  <Button onClick={() => setLocation("/")} variant="outline">
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const contentType = detectContentType(resource);
  const isLocked = !canAccessExams && (contentType === "pdf" || contentType === "video" || contentType === "audio");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button variant="ghost" onClick={() => setLocation("/resources")} className="mb-6">
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Back to Resources
          </Button>
          
          <article className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                {resource.category && (
                  <Badge variant="secondary" className="text-sm font-medium">
                    {resource.category}
                  </Badge>
                )}
                {resource.subject && (
                  <Badge variant="outline" className="text-sm">
                    {resource.subject}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDate(resource.createdAt)} • {resource.views} views
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{resource.title}</h1>
              {resource.excerpt && (
                <p className="text-xl text-muted-foreground">{resource.excerpt}</p>
              )}
              {resource.author && (
                <p className="text-sm text-muted-foreground mt-2">By {resource.author}</p>
              )}
            </div>

            {/* Locked/Premium Content Notice */}
            {isLocked && (
              <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <CardTitle className="text-amber-900 dark:text-amber-100">Premium Content</CardTitle>
                  </div>
                  <CardDescription className="text-amber-800 dark:text-amber-200">
                    This content requires a premium subscription. Upgrade to access videos, PDFs, and audio resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setLocation("/pricing")} variant="default">
                    View Pricing Plans
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Content based on type */}
            {contentType === "notice" && (
              <div className="my-8 p-6 bg-destructive/10 border-2 border-destructive rounded-lg">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {resource.content}
                  </div>
                </div>
              </div>
            )}

            {contentType === "video" && (
              <div className="my-8">
                {isLocked ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-amber-500/50">
                    <div className="text-center space-y-4 p-8">
                      <Lock className="h-16 w-16 text-amber-500 mx-auto" />
                      <h3 className="text-2xl font-bold">Premium Content</h3>
                      <p className="text-muted-foreground max-w-md">
                        This video is available to premium subscribers. Upgrade your plan to access this content.
                      </p>
                      <Button onClick={() => setLocation("/pricing")} variant="default">
                        View Pricing Plans
                      </Button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const videoEmbed = renderVideoEmbed(resource);
                    return videoEmbed ? (
                      <div className="my-8">
                        {videoEmbed}
                      </div>
                    ) : (
                      <div className="my-8 p-4 bg-muted rounded-lg">
                        <p className="text-muted-foreground mb-4">
                          Video URL format not supported or invalid: {resource.videoUrl}
                        </p>
                        {resource.videoUrl && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(resource.videoUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Video URL
                          </Button>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {contentType === "pdf" && (
              <div className="my-8">
                {isLocked ? (
                  <Card className="border-amber-500/50">
                    <CardContent className="p-12 text-center">
                      <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">Premium PDF</h3>
                      <p className="text-muted-foreground mb-6">
                        This PDF is available to premium subscribers. Upgrade your plan to download and view this document.
                      </p>
                      <Button onClick={() => setLocation("/pricing")} variant="default">
                        View Pricing Plans
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <PDFViewer resource={resource} />
                )}
              </div>
            )}

            {contentType === "audio" && (
              <div className="my-8">
                {isLocked ? (
                  <Card className="border-amber-500/50">
                    <CardContent className="p-12 text-center">
                      <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-2">Premium Audio</h3>
                      <p className="text-muted-foreground mb-6">
                        This audio content is available to premium subscribers. Upgrade your plan to listen.
                      </p>
                      <Button onClick={() => setLocation("/pricing")} variant="default">
                        View Pricing Plans
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  resource.fileUrl ? (
                    <div className="bg-muted rounded-lg p-6">
                      <audio controls className="w-full">
                        <source src={resource.fileUrl} type="audio/mpeg" />
                        <source src={resource.fileUrl} type="audio/mp3" />
                        <source src={resource.fileUrl} type="audio/wav" />
                        <source src={resource.fileUrl} type="audio/ogg" />
                        Your browser does not support the audio element.
                      </audio>
                      {resource.metadata?.duration && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Duration: {Math.floor((resource.metadata.duration || 0) / 60)}:{(resource.metadata.duration || 0) % 60 < 10 ? '0' : ''}{Math.floor((resource.metadata.duration || 0) % 60)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-muted-foreground">Audio file not available</p>
                    </div>
                  )
                )}
              </div>
            )}

            {contentType === "link" && (
              <div className="my-8 p-6 bg-primary/10 border-2 border-primary rounded-lg">
                <div className="space-y-4">
                  <div className="prose prose-lg max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {resource.content}
                    </div>
                  </div>
                  {resource.externalUrl && (
                    <Button
                      onClick={() => window.open(resource.externalUrl, '_blank', 'noopener,noreferrer')}
                      className="w-full sm:w-auto"
                      variant="default"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open External Link
                    </Button>
                  )}
                </div>
              </div>
            )}

            {contentType === "quiz" && (
              <QuizEmbed resource={resource} />
            )}

            {contentType === "flashcard" && (
              <FlashcardStudy resource={resource} />
            )}

            {/* Text content for notes and other types */}
            {contentType !== "pdf" && contentType !== "quiz" && contentType !== "flashcard" && contentType !== "notice" && contentType !== "link" && contentType !== "video" && contentType !== "audio" && (
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {resource.content}
                </div>
              </div>
            )}

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-6 border-t">
                {resource.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

