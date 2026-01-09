import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    FileText,
    User,
    School,
    GraduationCap,
    ArrowRight,
    ShieldCheck,
    AlertCircle,
    HelpCircle,
    Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

export default function PublicExamEntry() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [candidate, setCandidate] = useState({
        candidateName: "",
        candidateClass: "",
        candidateSchool: ""
    });

    const { data: exam, isLoading, error } = useQuery<any>({
        queryKey: [`/api/tutor/exams/${id}/public`],
        enabled: !!id,
        retry: false
    });

    const startMutation = useMutation({
        mutationFn: async (details: any) => {
            const res = await apiRequest("POST", `/api/tutor/exams/${id}/start`, details);
            return res.json();
        },
        onSuccess: (data) => {
            // Store session in sessionStorage for the room to pick up
            sessionStorage.setItem(`exam_session_${id}`, JSON.stringify(data));
            setLocation(`/public-exam/${id}/room`);
        },
        onError: (err: any) => {
            toast({ title: "Cannot Start Exam", description: err.message, variant: "destructive" });
        }
    });

    if (isLoading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-500 font-mono tracking-widest text-xs">CONNECTING_TO_EXAM_SERVER...</p>
            </div>
        </div>
    );

    if (error || !exam) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
            <Card className="max-w-md bg-slate-900/50 border-rose-500/20 backdrop-blur-xl p-8">
                <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                <p className="text-slate-400">This link is invalid or the exam has reached its candidate limit.</p>
                <Button onClick={() => window.location.href = "/"} className="mt-8 w-full bg-slate-800">Return Home</Button>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/30 blur-[120px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/30 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-xl z-10"
            >
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-[2rem] overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full" />

                    <CardHeader className="text-center pt-10 px-8">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-inner">
                            <ShieldCheck className="w-10 h-10 text-blue-400" />
                        </div>
                        <CardTitle className="text-3xl font-black text-white tracking-tight leading-tight">
                            {exam.title}
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-2 flex items-center justify-center space-x-4">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-500" /> {exam.timeLimitMinutes} Mins</span>
                            <span className="flex items-center"><FileText className="w-4 h-4 mr-1 text-slate-500" /> {exam.totalQuestions} Questions</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 pt-6">
                        <form onSubmit={(e) => { e.preventDefault(); startMutation.mutate(candidate); }} className="space-y-6">
                            <div className="space-y-4">
                                <div className="group space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                                        <User className="w-3 h-3 mr-2 group-focus-within:text-blue-500 transition-colors" /> Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        required
                                        placeholder="Enter your registration name"
                                        value={candidate.candidateName}
                                        onChange={(e) => setCandidate({ ...candidate, candidateName: e.target.value })}
                                        className="h-14 bg-slate-950/50 border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 text-white rounded-xl placeholder:text-slate-600 transition-all font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group space-y-2">
                                        <Label htmlFor="class" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                                            <GraduationCap className="w-4 h-4 mr-2 group-focus-within:text-blue-500 transition-colors" /> Class
                                        </Label>
                                        <Input
                                            id="class"
                                            required
                                            placeholder="e.g. SSS 3"
                                            value={candidate.candidateClass}
                                            onChange={(e) => setCandidate({ ...candidate, candidateClass: e.target.value })}
                                            className="h-14 bg-slate-950/50 border-slate-800 focus:border-blue-500 text-white rounded-xl"
                                        />
                                    </div>
                                    <div className="group space-y-2">
                                        <Label htmlFor="school" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                                            <School className="w-4 h-4 mr-2 group-focus-within:text-blue-500 transition-colors" /> School
                                        </Label>
                                        <Input
                                            id="school"
                                            required
                                            placeholder="Your institution"
                                            value={candidate.candidateSchool}
                                            onChange={(e) => setCandidate({ ...candidate, candidateSchool: e.target.value })}
                                            className="h-14 bg-slate-950/50 border-slate-800 focus:border-blue-500 text-white rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                <h4 className="flex items-center text-xs font-bold text-slate-400 uppercase mb-2">
                                    <HelpCircle className="w-4 h-4 mr-2 text-blue-400" /> Instructions
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Ensure you have a stable internet connection. Results will be graded automatically upon submission but will not be visible until published by your tutor.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={startMutation.isPending}
                                className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg shadow-2xl shadow-blue-600/30 rounded-2xl transition-all active:scale-[0.98]"
                            >
                                {startMutation.isPending ? (
                                    <span className="flex items-center"><Clock className="w-5 h-5 animate-pulse mr-2" /> INITIALIZING...</span>
                                ) : (
                                    <span className="flex items-center">START EXAM NOW <ArrowRight className="w-5 h-5 ml-2" /></span>
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <div className="p-4 text-center border-t border-slate-800 bg-white/5">
                        <span className="text-[10px] text-slate-600 font-mono">POWERED_BY_PREPMASTER_SECURE_EXAM_SYSTEM</span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
