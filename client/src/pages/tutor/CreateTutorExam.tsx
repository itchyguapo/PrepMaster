import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TutorLayout } from "@/components/layout/TutorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Search,
    Settings,
    Target,
    Clock,
    Users,
    Info,
    Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { tutorFetch } from "@/lib/tutorApi";

export default function CreateTutorExam() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        title: "",
        examBodyId: "",
        categoryId: "",
        timeLimitMinutes: 60,
        expiresAt: "",
        maxCandidates: 50,
        subjectWeightage: [] as { subjectId: string; count: number }[]
    });

    const { data: examBodies } = useQuery<any[]>({ queryKey: ["/api/admin/system/exam-bodies"] });
    const { data: categories } = useQuery<any[]>({
        queryKey: ["/api/admin/system/categories", formData.examBodyId],
        enabled: !!formData.examBodyId
    });
    const { data: subjects } = useQuery<any[]>({
        queryKey: ["/api/admin/system/subjects", formData.categoryId],
        enabled: !!formData.categoryId
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await tutorFetch("/api/tutor/exams", {
                method: "POST",
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to create exam");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Exam Created", description: "Your custom exam is now active." });
            queryClient.invalidateQueries({ queryKey: ["/api/tutor/exams"] });
            setLocation("/tutor/exams");
        },
        onError: (err: any) => {
            toast({ title: "Failed to create exam", description: err.message, variant: "destructive" });
        }
    });

    const addSubject = () => {
        setFormData(prev => ({
            ...prev,
            subjectWeightage: [...prev.subjectWeightage, { subjectId: "", count: 10 }]
        }));
    };

    const removeSubject = (index: number) => {
        setFormData(prev => ({
            ...prev,
            subjectWeightage: prev.subjectWeightage.filter((_, i) => i !== index)
        }));
    };

    const updateSubject = (index: number, subjectId: string) => {
        const updated = [...formData.subjectWeightage];
        updated[index].subjectId = subjectId;
        setFormData({ ...formData, subjectWeightage: updated });
    };

    const updateCount = (index: number, count: number) => {
        const updated = [...formData.subjectWeightage];
        updated[index].count = Math.max(1, count);
        setFormData({ ...formData, subjectWeightage: updated });
    };

    const totalQuestions = formData.subjectWeightage.reduce((s, a) => s + a.count, 0);

    return (
        <TutorLayout>
            <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/tutor/exams")} className="rounded-full hover:bg-muted">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground">New Custom Exam</h1>
                        <p className="text-muted-foreground">Configure your exam parameters and question distribution.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Config */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-border shadow-sm rounded-2xl">
                            <CardHeader className="border-b bg-muted/30">
                                <CardTitle className="text-lg font-display">Exam Configuration</CardTitle>
                                <CardDescription>Define the basic structure of your assessment</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Exam Title</Label>
                                    <Input
                                        placeholder="e.g. Mock JAMB 2024 - Science Group A"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="h-11 shadow-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Exam Body</Label>
                                        <Select onValueChange={id => setFormData({ ...formData, examBodyId: id, categoryId: "", subjectWeightage: [] })}>
                                            <SelectTrigger className="h-11 bg-background border-border">
                                                <SelectValue placeholder="Select Body" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {examBodies?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Category</Label>
                                        <Select
                                            disabled={!formData.examBodyId}
                                            value={formData.categoryId}
                                            onValueChange={id => setFormData({ ...formData, categoryId: id, subjectWeightage: [] })}
                                        >
                                            <SelectTrigger className="h-11 bg-background border-border">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Subject Weightage</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Add subjects and specify question counts</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addSubject}
                                            disabled={!formData.categoryId}
                                            className="h-9 gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" /> Add Subject
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.subjectWeightage.map((sw, idx) => (
                                            <div key={idx} className="flex items-center space-x-3 group animate-in slide-in-from-left-2 duration-300 bg-muted/20 p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all">
                                                <div className="flex-1">
                                                    <Select
                                                        value={sw.subjectId}
                                                        onValueChange={id => updateSubject(idx, id)}
                                                    >
                                                        <SelectTrigger className="bg-background border-none shadow-none h-10">
                                                            <SelectValue placeholder="Select Subject" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2 pr-2">
                                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={sw.count}
                                                        onChange={e => updateCount(idx, parseInt(e.target.value) || 0)}
                                                        className="w-20 h-9 bg-background text-center focus:ring-primary"
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeSubject(idx)}
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {formData.subjectWeightage.length === 0 && (
                                            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
                                                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto italic">
                                                    {formData.categoryId ? "No subjects added yet. Click 'Add Subject' to begin question allocation." : "Please select a category above to start adding subjects."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Config */}
                    <div className="space-y-6">
                        <Card className="border-border shadow-sm rounded-2xl overflow-hidden sticky top-8">
                            <CardHeader className="bg-primary/5 border-b border-primary/10">
                                <CardTitle className="text-base font-display flex items-center gap-2 text-primary">
                                    <Settings className="w-4 h-4" />
                                    Exam Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-primary/70" /> Time (Minutes)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={formData.timeLimitMinutes}
                                            onChange={e => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                                            className="h-11 shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-primary/70" /> Max Candidates
                                        </Label>
                                        <Input
                                            type="number"
                                            value={formData.maxCandidates}
                                            onChange={e => setFormData({ ...formData, maxCandidates: parseInt(e.target.value) || 0 })}
                                            className="h-11 shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-primary/70" /> Expiry Date
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            value={formData.expiresAt}
                                            onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                            className="h-11 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-primary/70 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Live Preview</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground font-medium">Total Questions:</span>
                                            <span className="text-lg font-bold text-primary">{totalQuestions}</span>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
                                        disabled={createMutation.isPending || !formData.title || formData.subjectWeightage.length === 0 || !formData.expiresAt}
                                        onClick={() => createMutation.mutate(formData)}
                                    >
                                        {createMutation.isPending ? "Generating..." : "Publish Exam"}
                                        <Save className="w-5 h-5 ml-2" />
                                    </Button>

                                    <div className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed px-1 font-medium italic">
                                        <Info className="w-3 h-3 shrink-0 text-primary/60" />
                                        Once published, the exam will be accessible via a unique URL provided upon creation.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </TutorLayout>
    );
}
