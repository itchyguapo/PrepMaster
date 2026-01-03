import { Resource } from "../types";
import { Button } from "@/components/ui/button";
import { Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PDFViewerProps {
  resource: Resource;
}

export function PDFViewer({ resource }: PDFViewerProps) {
  const fileUrl = resource.fileUrl || resource.metadata?.fileUrl;
  const [zoom, setZoom] = useState(100);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">PDF file not available</p>
      </div>
    );
  }

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  const handlePrint = () => {
    window.open(fileUrl, '_blank');
    // Note: Browser print dialog will open
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Embed */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full"
          style={{ height: '80vh', minHeight: '600px' }}
          title={resource.title}
        />
      </div>
    </div>
  );
}

