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
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Database,
  Layers,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type SubjectStat = {
  id: string;
  name: string;
  questionCount: number;
};

type CategoryStat = {
  id: string;
  name: string;
  questionCount: number;
  subjects: SubjectStat[];
};

type ExamBodyStat = {
  id: string;
  name: string;
  questionCount: number;
  categories: CategoryStat[];
};

export default function SystemSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stats, setStats] = useState<ExamBodyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState({
    basic: 1500,
    standard: 2500,
    premium: 4000,
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/question-bank-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        throw new Error("Failed to fetch stats");
      }
    } catch (err) {
      console.error("Error fetching question bank stats:", err);
      toast({
        title: "Error",
        description: "Failed to load question bank statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
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

        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stats">Question bank stats</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Plans</TabsTrigger>
            <TabsTrigger value="general">General Config</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Question Bank Statistics</CardTitle>
                    <CardDescription>Hierarchical view of questions across exam bodies, categories, and subjects.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setLocation("/admin/questions")}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Manage Question Bank
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading statistics...</p>
                  </div>
                ) : stats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No statistics available. Please ensure subjects and questions are properly configured.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full space-y-4">
                    {stats.map((body) => (
                      <AccordionItem
                        key={body.id}
                        value={body.id}
                        className="border rounded-lg px-2 bg-card overflow-hidden shadow-sm"
                      >
                        <AccordionTrigger className="hover:no-underline py-4 px-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-primary/10 rounded-md">
                              <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{body.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {body.categories.length} Categories • {body.questionCount.toLocaleString()} total questions
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-4 px-4">
                          <div className="space-y-3 mt-2">
                            {body.categories.map((cat) => (
                              <div key={cat.id} className="border rounded-md bg-muted/20 overflow-hidden">
                                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold text-sm">{cat.name}</span>
                                  </div>
                                  <Badge variant="secondary" className="font-medium">
                                    {cat.questionCount} Questions
                                  </Badge>
                                </div>
                                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {cat.subjects.map((sub) => (
                                    <div
                                      key={sub.id}
                                      className="flex items-center justify-between p-2 rounded border bg-card hover:border-primary/50 transition-colors group cursor-pointer"
                                      onClick={() => setLocation(`/admin/questions?subjectId=${sub.id}`)}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-xs font-medium truncate">{sub.name}</span>
                                      </div>
                                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded shrink-0">
                                        {sub.questionCount}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
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
