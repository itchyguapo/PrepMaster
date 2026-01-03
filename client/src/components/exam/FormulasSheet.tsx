import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Formula = {
  id: string;
  title: string;
  subject?: string | null;
  category?: string | null;
  content: string;
  examBody?: string | null;
};

export function FormulasSheet({ open, onOpenChange, examBody, subject }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  examBody?: string;
  subject?: string;
}) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFormulas();
    }
  }, [open, examBody, subject]);

  const fetchFormulas = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (examBody) params.append("examBody", examBody);
      if (subject) params.append("subject", subject);
      
      const response = await fetch(`/api/formulas?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFormulas(data.formulas || []);
      } else {
        setError("Failed to load formulas");
      }
    } catch (err) {
      console.error("Error fetching formulas:", err);
      setError("Failed to load formulas");
    } finally {
      setLoading(false);
    }
  };

  // Group formulas by category
  const groupedFormulas = formulas.reduce((acc, formula) => {
    const key = formula.category || formula.subject || "General";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(formula);
    return acc;
  }, {} as Record<string, Formula[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Exam Formulas
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            {error}
          </div>
        ) : formulas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No formulas available for this exam.
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-100px)] mt-4">
            <div className="space-y-6 pr-4">
              {Object.entries(groupedFormulas).map(([category, categoryFormulas]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">{category}</h3>
                  <div className="space-y-3">
                    {categoryFormulas.map((formula) => (
                      <Card key={formula.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{formula.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: formula.content }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

