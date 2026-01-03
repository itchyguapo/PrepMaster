import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  RotateCcw,
  BookOpen,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

type Subject = {
  id: string;
  name: string;
  categoryId: string;
  examBodyId: string;
  examBodyName?: string;
  categoryName?: string;
};

export default function SystemSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState({
    basic: 1500,
    standard: 2500,
    premium: 4000,
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        // Fetch all subjects from database
        const res = await adminFetch("/api/admin/subjects");
        if (res.ok) {
          const data = await res.json();
          // Group by exam body and category for display
          const subjectsWithInfo = await Promise.all(
            data.map(async (subject: Subject) => {
              // Get exam body name
              const bodyRes = await adminFetch(`/api/admin/exam-bodies`);
              const bodies = bodyRes.ok ? await bodyRes.json() : [];
              const examBody = bodies.find((b: any) => b.id === subject.examBodyId);
              
              // Get category name
              const catRes = await adminFetch(`/api/admin/tracks?examBodyId=${subject.examBodyId}`);
              const categories = catRes.ok ? await catRes.json() : [];
              const category = categories.find((c: any) => c.id === subject.categoryId);
              
              return {
                ...subject,
                examBodyName: examBody?.name || "Unknown",
                categoryName: category?.name || "Unknown",
              };
            })
          );
          setSubjects(subjectsWithInfo);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
        toast({
          title: "Error",
          description: "Failed to load subjects.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    void fetchSubjects();
  }, [toast]);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "System configuration has been updated successfully.",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">System Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings, subjects, and pricing.</p>
        </div>

        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subjects">Subjects & Topics</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Plans</TabsTrigger>
            <TabsTrigger value="general">General Config</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Subject Management</CardTitle>
                    <CardDescription>View all subjects in the system. To add/edit subjects, use the Question Bank.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setLocation("/admin/questions")}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Manage in Question Bank
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No subjects found. Add subjects in the Question Bank.
                  </div>
                ) : (
                  <>
                    <Alert className="mb-4">
                      <AlertDescription>
                        Subjects are managed in the Question Bank. Click "Manage in Question Bank" to add, edit, or delete subjects.
                      </AlertDescription>
                    </Alert>
                    <div className="rounded-md border divide-y">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {subject.examBodyName} • {subject.categoryName}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation("/admin/questions")}
                          >
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Tiers</CardTitle>
                <CardDescription>Manage pricing for Basic, Standard, and Premium plans.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertDescription>
                    Pricing is currently configured in the backend. Contact a developer to update pricing values.
                  </AlertDescription>
                </Alert>
                {[
                  { name: "Basic Plan", key: "basic", current: pricing.basic },
                  { name: "Standard Plan", key: "standard", current: pricing.standard },
                  { name: "Premium Plan", key: "premium", current: pricing.premium },
                ].map((plan) => (
                  <div key={plan.key} className="grid md:grid-cols-3 gap-4 items-end border-b pb-6 last:border-0 last:pb-0">
                    <div>
                      <Label>{plan.name} Price (NGN)</Label>
                      <Input value={plan.current} disabled className="mt-2 bg-muted" />
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <Input value="30 Days" disabled className="mt-2 bg-muted" />
                    </div>
                    <Button variant="outline" disabled>
                      Update {plan.name}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>AI Classification Threshold</Label>
                  <div className="flex gap-4 items-center">
                    <Input defaultValue="0.85" type="number" step="0.01" max="1" />
                    <span className="text-sm text-muted-foreground">Confidence score required to auto-approve topics.</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@prepmaster.ng" />
                </div>
                <div className="space-y-2">
                  <Label>System Maintenance Mode</Label>
                  <div className="flex items-center gap-2">
                    <Switch />
                    <span className="text-sm text-muted-foreground">Enable to block student access during updates.</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex gap-4">
                 <Button onClick={handleSave}>
                   <Save className="mr-2 h-4 w-4" /> Save Changes
                 </Button>
                 <Button variant="ghost">
                   <RotateCcw className="mr-2 h-4 w-4" /> Reset Defaults
                 </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
