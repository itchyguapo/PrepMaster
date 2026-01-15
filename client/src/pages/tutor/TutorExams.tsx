import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TutorLayout } from "@/components/layout/TutorLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    BarChart2,
    Calendar,
    Users,
    FileText,
    ChevronRight,
    Clock,
    AlertCircle,
    Copy,
    ExternalLink,
    Shield
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { tutorFetch } from "@/lib/tutorApi";
import { useToast } from "@/hooks/use-toast";

interface TutorExam {
    id: string;
    title: string;
    status: 'draft' | 'active' | 'expired' | 'closed';
    expiresAt: string;
    totalQuestions: number;
    maxCandidates: number;
    createdAt: string;
    submissionCount: number;
    isProctored?: boolean;
}

export default function TutorExams() {
    const { toast } = useToast();
    const { data: exams, isLoading, error } = useQuery<TutorExam[]>({
        queryKey: ["/api/tutor/exams"],
        queryFn: async () => {
            const res = await tutorFetch("/api/tutor/exams");
            if (!res.ok) throw new Error("Failed to fetch exams");
            return res.json();
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "draft": return "bg-blue-100 text-blue-700 border-blue-200";
            case "closed": return "bg-gray-100 text-gray-700 border-gray-200";
            case "expired": return "bg-rose-100 text-rose-700 border-rose-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const copyExamLink = (examId: string) => {
        const link = `${window.location.origin}/public-exam/${examId}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link Copied",
            description: "Students can now use this link to take the exam.",
        });
    };

    return (
        <TutorLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground">
                            Custom Exam System
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage your custom exams and monitor candidate performance.</p>
                    </div>
                    <Link href="/tutor/exams/create">
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Exam
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="h-64 animate-pulse bg-muted/50 border-muted" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-12 text-center rounded-2xl bg-destructive/5 border border-destructive/20 mt-8">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground">Failed to load exams</h3>
                        <p className="text-muted-foreground mt-2">There was an error connecting to the laboratory.</p>
                        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                ) : exams?.length === 0 ? (
                    <div className="py-20 text-center rounded-3xl bg-muted/20 border border-dashed border-muted-foreground/20">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground font-display">No custom exams yet</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            Create your first exam by selecting subjects from our question bank and setting your own weightage.
                        </p>
                        <Link href="/tutor/exams/create">
                            <Button className="mt-8">
                                Get Started <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams?.map((exam, idx) => (
                            <motion.div
                                key={exam.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="group h-full flex flex-col hover:border-primary/50 transition-all duration-300 hover:shadow-lg rounded-xl">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className={`${getStatusColor(exam.status)} border capitalize font-medium px-2.5 py-0.5 rounded-full`}>
                                                    {exam.status}
                                                </Badge>
                                                {exam.isProctored && (
                                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        <span className="text-[10px]">PROCTORED</span>
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => copyExamLink(exam.id)}
                                                title="Copy Exam Link"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardTitle className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                            {exam.title}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="space-y-6 flex-1 flex flex-col">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Users className="w-4 h-4 mr-2 text-primary/60" />
                                                <span>{exam.submissionCount} / {exam.maxCandidates}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4 mr-2 text-primary/60" />
                                                <span>{exam.totalQuestions} Questions</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                            <Calendar className="w-3.5 h-3.5 mr-2" />
                                            <span>Expires {format(new Date(exam.expiresAt), "MMM d, yyyy h:mm a")}</span>
                                        </div>

                                        <div className="mt-auto pt-4 flex gap-2">
                                            <Link href={`/tutor/exams/${exam.id}/stats`} className="flex-1">
                                                <Button variant="secondary" className="w-full text-xs font-semibold">
                                                    Results
                                                    <ChevronRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </Link>
                                            <Button variant="outline" className="flex-1 text-xs font-semibold" onClick={() => copyExamLink(exam.id)}>
                                                Link
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </TutorLayout>
    );
}
