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
  BookOpen
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SystemSettings() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([
    { id: 1, name: "Mathematics", type: "All Exams", active: true },
    { id: 2, name: "English Language", type: "All Exams", active: true },
    { id: 3, name: "Physics", type: "All Exams", active: true },
    { id: 4, name: "Chemistry", type: "All Exams", active: true },
    { id: 5, name: "Biology", type: "All Exams", active: true },
    { id: 6, name: "Civic Education", type: "WAEC/NECO", active: true },
    { id: 7, name: "Use of English", type: "JAMB", active: true },
    { id: 8, name: "Further Mathematics", type: "WAEC/NECO", active: true },
    { id: 9, name: "Economics", type: "All Exams", active: true },
  ]);

  const toggleSubject = (id: number) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

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
                    <CardDescription>Manage active subjects for WAEC, NECO, and JAMB.</CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Subject
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border divide-y">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{subject.active ? 'Active' : 'Inactive'}</span>
                          <Switch checked={subject.active} onCheckedChange={() => toggleSubject(subject.id)} />
                        </div>
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                {[
                  { name: "Basic Plan", current: "1500" },
                  { name: "Standard Plan", current: "2500" },
                  { name: "Premium Plan", current: "4000" },
                ].map((plan, i) => (
                  <div key={i} className="grid md:grid-cols-3 gap-4 items-end border-b pb-6 last:border-0 last:pb-0">
                    <div>
                      <Label>{plan.name} Price (NGN)</Label>
                      <Input defaultValue={plan.current} className="mt-2" />
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <Input defaultValue="30 Days" disabled className="mt-2 bg-muted" />
                    </div>
                    <Button variant="outline">Update {plan.name}</Button>
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
