import { Resource } from "@/components/resources/types";

export function renderVideoEmbed(resource: Resource) {
  if (resource.videoEmbedCode) {
    return (
      <div 
        className="w-full aspect-video rounded-lg overflow-hidden"
        dangerouslySetInnerHTML={{ __html: resource.videoEmbedCode }}
      />
    );
  }
  
  if (resource.videoUrl) {
    console.log("Processing video URL:", resource.videoUrl);
    
    // Extract YouTube video ID - improved regex to handle various YouTube URL formats
    // Handles: youtube.com/watch?v=, youtube.com/embed/, youtu.be/, etc.
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = resource.videoUrl.match(youtubeRegex);
    
    if (match && match[1]) {
      const videoId = match[1];
      console.log("Extracted YouTube video ID:", videoId);
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      console.log("YouTube embed URL:", embedUrl);
      return (
        <div className="w-full aspect-video rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src={embedUrl}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    
    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = resource.videoUrl.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      const videoId = vimeoMatch[1];
      console.log("Extracted Vimeo video ID:", videoId);
      return (
        <div className="w-full aspect-video rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src={`https://player.vimeo.com/video/${videoId}`}
            title={resource.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    
    console.warn("Could not parse video URL:", resource.videoUrl);
  }
  
  return null;
}

