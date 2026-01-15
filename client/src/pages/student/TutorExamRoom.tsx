import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Grid2X2,
    Send,
    AlertCircle,
    ShieldCheck,
    Menu,
    Shield,
    AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

export default function TutorExamRoom() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [sessionData, setSessionData] = useState<any>(null);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showGrid, setShowGrid] = useState(false);

    // Proctoring State
    const [violationCount, setViolationCount] = useState(0);

    useEffect(() => {
        const raw = sessionStorage.getItem(`exam_session_${id}`);
        if (!raw) {
            setLocation(`/public-exam/${id}`);
            return;
        }
        const data = JSON.parse(raw);
        setSessionData(data);

        // Timer setup
        setTimeLeft((data.session.timeLimitMinutes || 60) * 60);

        // --- PROCTORING INIT ---
        if (data.exam?.isProctored) {
            requestFullScreen();
        }
    }, [id, setLocation]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitMutation.mutate();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // --- PROCTORING LOGIC ---
    useEffect(() => {
        if (!sessionData?.exam?.isProctored || isSubmitted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordViolation();
            }
        };

        const handleBlur = () => {
            recordViolation();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [sessionData, isSubmitted, violationCount]);

    const requestFullScreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.log("Full screen denied", err));
        }
    };

    const recordViolation = () => {
        const newCount = violationCount + 1;
        setViolationCount(newCount);

        if (newCount === 1) {
            toast({
                title: "⚠️ FOCUS WARNING",
                description: "You left the exam window. This has been recorded. Please stay on this tab.",
                variant: "destructive",
                duration: 5000,
            });
        } else if (newCount === 2) {
            toast({
                title: "🚨 FINAL WARNING",
                description: "This is your LAST warning. If you leave the window again, your exam will be automatically submitted.",
                variant: "destructive",
                duration: 8000,
            });
        } else if (newCount >= 3) {
            toast({
                title: "🛑 VIOLATION LIMIT REACHED",
                description: "Multiple violations detected. Submitting exam now.",
                variant: "destructive",
                duration: 5000,
            });
            submitMutation.mutate();
        }
    };


    const submitMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/tutor/exams/sessions/${sessionData.session.id}/submit`, { responses });
            return res.json();
        },
        onSuccess: () => {
            setIsSubmitted(true);
            sessionStorage.removeItem(`exam_session_${id}`);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log("Exit full screen failed", err));
            }
        },
        onError: (err: any) => {
            toast({ title: "Submission Error", description: err.message, variant: "destructive" });
        }
    });

    if (!sessionData) return null;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="max-w-md bg-slate-900/50 border-blue-500/20 backdrop-blur-xl p-10 rounded-[2.5rem]">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                            <ShieldCheck className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4">Exam Submitted</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            Well done, <span className="text-white font-bold">{sessionData.session.candidateName}</span>.
                            Your responses have been securely transmitted to the server. Your tutor will release the results once the session is over.
                        </p>
                        <Button onClick={() => window.location.href = "/"} className="w-full bg-slate-800">Exit Examination</Button>
                    </Card>
                </motion.div>
            </div>
        );
    }

    const currentQuestion = sessionData.questions[currentQuestionIdx];
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const handleOptionSelect = (optionId: string) => {
        setResponses(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
            {/* Dynamic Header */}
            <header className="h-20 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <div className="hidden md:block">
                        <h1 className="text-lg font-black tracking-tighter text-white flex items-center gap-2">
                            PREPMASTER <span className="text-blue-500 italic">SECURE</span>
                            {sessionData.exam?.isProctored && (
                                <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                                    <Shield className="w-3 h-3" /> Proctored
                                </span>
                            )}
                        </h1>
                        <p className="text-[10px] text-slate-500 font-mono">CANDIDATE: {sessionData.session.candidateName.toUpperCase()}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className={`flex items-center space-x-2 px-6 py-2 rounded-full border ${timeLeft < 300 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-blue-400'} font-mono text-xl font-bold transition-all`}>
                        <Clock className="w-5 h-5" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                    <Button
                        onClick={() => setShowGrid(!showGrid)}
                        variant="ghost"
                        className="rounded-full bg-white/5 md:hidden"
                    >
                        <Grid2X2 className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full px-6 shadow-lg shadow-blue-600/20"
                    >
                        <Send className="w-4 h-4 mr-2" /> SUBMIT
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-12 relative">
                    <div className="max-w-3xl mx-auto space-y-8 pb-32">
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase border-slate-700">
                                Question {currentQuestionIdx + 1} of {sessionData.questions.length}
                            </Badge>
                            <span className="text-xs text-slate-500 font-mono">UID: {currentQuestion.id.slice(0, 8)}</span>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl md:text-3xl font-medium leading-tight text-slate-100">
                                {currentQuestion.text}
                            </h2>

                            {currentQuestion.imageUrl && (
                                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                    <img src={currentQuestion.imageUrl} alt="Question Graphic" className="w-full h-auto" />
                                </div>
                            )}

                            <div className="grid gap-3 pt-4">
                                {currentQuestion.options.map((option: any) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        className={`flex items-center p-5 rounded-2xl border transition-all duration-200 text-left group
                      ${responses[currentQuestion.id] === option.id
                                                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                                                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.07]'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 font-bold border transition-colors
                      ${responses[currentQuestion.id] === option.id
                                                ? 'bg-blue-500 border-blue-400 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-white'}`}>
                                            {String.fromCharCode(65 + currentQuestion.options.indexOf(option))}
                                        </div>
                                        <span className={`text-lg transition-colors ${responses[currentQuestion.id] === option.id ? 'text-white' : 'text-slate-300'}`}>
                                            {option.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-slate-900 shadow-2xl border border-white/10 rounded-full p-2 space-x-2 z-40">
                        <Button
                            variant="ghost"
                            disabled={currentQuestionIdx === 0}
                            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                            className="rounded-full w-12 h-12 hover:bg-white/10"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div className="px-4 font-mono text-xs font-bold text-slate-500">
                            {currentQuestionIdx + 1} / {sessionData.questions.length}
                        </div>
                        <Button
                            variant="ghost"
                            disabled={currentQuestionIdx === sessionData.questions.length - 1}
                            onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                            className="rounded-full w-12 h-12 hover:bg-white/10"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                {/* Question Grid Sidebar (Desktop Only) */}
                <aside className="hidden md:flex w-80 border-l border-white/5 bg-slate-900/20 backdrop-blur-xl flex-col p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Navigator</h3>
                        <div className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded uppercase">LIVE</div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 flex-1 content-start overflow-y-auto">
                        {sessionData.questions.map((q: any, idx: number) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIdx(idx)}
                                className={`w-full aspect-square rounded-xl text-xs font-bold border transition-all
                  ${currentQuestionIdx === idx ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                                        responses[q.id] ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-white/5 text-slate-500 hover:border-slate-600'}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                        <div className="text-xs text-slate-500 flex items-center"><div className="w-3 h-3 bg-blue-500 rounded mr-2" /> Current Question</div>
                        <div className="text-xs text-slate-500 flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded mr-2" /> Answered</div>
                        <div className="text-xs text-slate-500 flex items-center"><div className="w-3 h-3 bg-slate-800 rounded mr-2" /> Not Answered</div>
                    </div>
                </aside>
            </main>
        </div>
    );
}

function Badge({ children, variant, className }: any) {
    return <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${className}`}>{children}</div>;
}

