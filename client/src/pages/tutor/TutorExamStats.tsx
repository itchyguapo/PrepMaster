import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { TutorLayout } from "@/components/layout/TutorLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Download,
    Send,
    Users,
    CheckCircle,
    Clock,
    ExternalLink,
    ChevronRight,
    FileText,
    AlertTriangle,
    BarChart,
    PieChart,
    TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { tutorFetch } from "@/lib/tutorApi";
import { motion } from "framer-motion";

interface ExamStats {
    exam: any;
    sessions: any[];
    stats: {
        total: number;
        submitted: number;
        inProgress: number;
        averageScore: number;
    };
}

export default function TutorExamStats() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data, isLoading } = useQuery<ExamStats>({
        queryKey: [`/api/tutor/exams/${id}/stats`],
        queryFn: async () => {
            const res = await tutorFetch(`/api/tutor/exams/${id}/stats`);
            if (!res.ok) throw new Error("Failed to fetch exam stats");
            return res.json();
        },
        enabled: !!id
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            const res = await tutorFetch(`/api/tutor/exams/${id}/publish-results`, {
                method: "POST"
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to publish results");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Results Published", description: "PDFs have been generated successfully." });
            queryClient.invalidateQueries({ queryKey: [`/api/tutor/exams/${id}/stats`] });
            if (data.masterPdf) window.open(data.masterPdf, "_blank");
        },
        onError: (err: any) => {
            toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
        }
    });

    if (isLoading) return <TutorLayout><div className="h-96 flex items-center justify-center font-display text-muted-foreground animate-pulse">Calculating Results...</div></TutorLayout>;
    if (!data) return <TutorLayout><div className="p-8 text-center border rounded-xl">Exam not found</div></TutorLayout>;

    const { exam, sessions, stats } = data;

    return (
        <TutorLayout>
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation("/tutor/exams")} className="rounded-full hover:bg-muted">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-display font-bold text-foreground">{exam.title}</h1>
                            <div className="flex items-center mt-2 space-x-3">
                                <Badge variant="outline" className={`${exam.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        exam.status === "closed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-muted text-muted-foreground border-border"
                                    } capitalize`}>
                                    {exam.status}
                                </Badge>
                                <div className="text-muted-foreground text-sm flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                    {exam.timeLimitMinutes} mins
                                </div>
                                <div className="text-muted-foreground text-sm flex items-center">
                                    <FileText className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                    {exam.totalQuestions} Questions
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            className="h-10 border-border shadow-sm text-sm"
                            onClick={() => {
                                const link = `${window.location.origin}/public-exam/${exam.id}`;
                                navigator.clipboard.writeText(link);
                                toast({ title: "Link Copied", description: "Students can now use this link to take the exam." });
                            }}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Copy Exam Link
                        </Button>

                        {exam.status === "active" && (
                            <Button
                                onClick={() => publishMutation.mutate()}
                                disabled={publishMutation.isPending || stats.submitted === 0}
                                className="h-10 bg-primary hover:bg-primary/90 text-white shadow-md font-semibold"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Publish & Close
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Candidates" value={stats.total} icon={<Users className="text-primary" />} trend="Total enrolled" />
                    <StatCard label="Submitted" value={stats.submitted} icon={<CheckCircle className="text-emerald-500" />} trend={`${Math.round((stats.submitted / (stats.total || 1)) * 100)}% completion`} />
                    <StatCard label="In Progress" value={stats.inProgress} icon={<Clock className="text-amber-500" />} trend="Active sessions" />
                    <StatCard
                        label="Avg. Score"
                        value={`${Math.round((stats.averageScore / (exam.totalQuestions || 1)) * 100)}%`}
                        icon={<TrendingUp className="text-indigo-500" />}
                        trend="Aggregate performance"
                    />
                </div>

                {/* Sessions Table */}
                <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 py-4">
                        <CardTitle className="text-lg font-display">Candidate Activity</CardTitle>
                        <CardDescription>Real-time monitoring of exam status and scores</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-widest font-bold">
                                        <th className="px-6 py-4 font-bold">Candidate</th>
                                        <th className="px-6 py-4 font-bold">Group / Details</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                        <th className="px-6 py-4 font-bold">Score</th>
                                        <th className="px-6 py-4 text-right font-bold">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sessions.map((session) => (
                                        <tr key={session.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-foreground">{session.candidateName}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">ID: {session.id.slice(0, 8)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                                {session.candidateClass} <span className="mx-1 opacity-30">|</span> {session.candidateSchool}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className={
                                                    session.status === "submitted"
                                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-100 text-amber-700 border-amber-200"
                                                }>
                                                    {session.status.replace("_", " ")}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {session.status === "submitted" ? (
                                                    <div className="text-lg font-bold text-foreground">
                                                        {session.score} <span className="text-muted-foreground text-xs font-normal">/ {exam.totalQuestions}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sessions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">
                                                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                No candidates have started this exam yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {exam.status === "closed" && (
                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm rounded-2xl">
                        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="text-foreground font-bold text-lg leading-snug">Results Generated Successfully</h4>
                                    <p className="text-muted-foreground text-sm">Download comprehensive reports for all candidates.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                <Button
                                    className="flex-1 md:flex-none h-11 bg-white hover:bg-muted border-emerald-200 text-emerald-700 font-semibold shadow-sm"
                                    onClick={() => window.open(`/uploads/tutor-results/results_${exam.id}_master.pdf`)}
                                >
                                    <Download className="w-4 h-4 mr-2" /> Master List
                                </Button>
                                <Button
                                    className="flex-1 md:flex-none h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md"
                                    onClick={() => window.open(`/uploads/tutor-results/results_${exam.id}_individual.pdf`)}
                                >
                                    <Download className="w-4 h-4 mr-2" /> Individual Slips
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </TutorLayout>
    );
}

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: string }) {
    return (
        <Card className="border-border shadow-sm rounded-2xl hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                        {icon}
                    </div>
                    {trend && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-full">
                            {trend}
                        </span>
                    )}
                </div>
                <div className="space-y-0.5">
                    <div className="text-3xl font-bold text-foreground font-display tracking-tight">{value}</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
}
