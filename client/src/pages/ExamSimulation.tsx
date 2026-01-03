import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { BookOpen } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Question = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  subject: string;
  year?: string;
};

export default function ExamSimulation() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [examId, setExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState<string>("JAMB CBT 2025");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Get examId from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("examId");
    setExamId(id);
  }, []);

  // Fetch live questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!examId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/questions?examId=${examId}`);
        if (res.ok) {
          const data = await res.json();
          
          // Format questions to ensure options are properly structured
          const formattedQuestions = (data.questions || []).map((q: any) => {
            let options = q.options || [];
            if (!Array.isArray(options)) {
              try {
                options = typeof options === "string" ? JSON.parse(options) : [];
              } catch {
                options = [];
              }
            }
            
            // Ensure each option has id and text
            const formattedOptions = options.map((opt: any, index: number) => {
              if (typeof opt === "string") {
                return { id: String.fromCharCode(65 + index), text: opt };
              }
              if (opt && typeof opt === "object") {
                return {
                  id: opt.id || String.fromCharCode(65 + index),
                  text: opt.text || opt.content || String(opt) || `Option ${String.fromCharCode(65 + index)}`,
                };
              }
              return {
                id: String.fromCharCode(65 + index),
                text: String(opt) || `Option ${String.fromCharCode(65 + index)}`,
              };
            });
            
            return {
              ...q,
              options: formattedOptions,
            };
          });
          
          setQuestions(formattedQuestions);
          setExamTitle(data.title || "JAMB CBT 2025");
        } else {
          console.error("Failed to load questions");
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchQuestions();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-[#006633]">Loading questions...</div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-[#006633]">No questions available.</div>
          <Button onClick={() => setLocation("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (value: string) => {
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    }
  };

  const handleSubmit = () => {
    setLocation("/results");
  }

  // Styles replicating the "Official" look - purposefully slightly dated/utilitarian
  return (
    <div className="min-h-screen bg-[#f0f0f0] font-sans text-sm flex flex-col h-screen select-none">
      {/* Top Bar - Official Green Header */}
      <header className="h-12 bg-[#006633] text-white flex items-center justify-between px-4 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg hover:opacity-80 transition-opacity">
            <BookOpen className="h-5 w-5" />
            PrepMaster
          </Link>
          <div className="h-6 w-px bg-white/30" />
          <div className="font-bold text-lg tracking-wide">{examTitle}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-black/20 px-3 py-1 rounded text-yellow-300 font-mono font-bold text-lg">
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs uppercase font-semibold opacity-90">
             Chidimma O. | Reg: 84291034AB
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Question */}
        <main className="flex-1 p-2 md:p-4 overflow-y-auto bg-white m-2 border border-gray-300 shadow-sm flex flex-col">
          <div className="border-b border-gray-200 pb-2 mb-4 flex justify-between items-center">
            <h2 className="font-bold text-[#006633] text-base uppercase">Subject: {currentQuestion.subject}</h2>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 text-xs rounded font-bold">Question {currentQIndex + 1} of {questions.length}</span>
          </div>

          <div className="flex-1">
             <div className="text-lg leading-relaxed text-gray-800 font-medium mb-8">
                {currentQuestion.text}
             </div>

             <div className="space-y-3 max-w-2xl">
                {currentQuestion.options.map((option) => (
                    <label 
                        key={option.id} 
                        className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                            answers[currentQuestion.id] === option.id 
                            ? 'bg-[#e6f7ef] border-[#006633]' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSelectOption(option.id)}
                    >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                             answers[currentQuestion.id] === option.id 
                             ? 'bg-[#006633] text-white border-[#006633]' 
                             : 'bg-white border-gray-400 text-gray-600'
                        }`}>
                            {option.id}
                        </div>
                        <span className="text-base text-gray-800">{option.text}</span>
                    </label>
                ))}
             </div>
          </div>

          {/* Navigation Buttons - Bottom */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center">
             <div className="flex gap-2">
                 <button 
                    onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQIndex === 0}
                    className="px-6 py-2 bg-[#006633] text-white font-bold rounded shadow hover:bg-[#00552b] disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    PREVIOUS
                 </button>
                 <button 
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentQIndex === questions.length - 1}
                    className="px-6 py-2 bg-[#006633] text-white font-bold rounded shadow hover:bg-[#00552b] disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    NEXT
                 </button>
             </div>
             <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
               <AlertDialogTrigger asChild>
                 <button 
                   onClick={() => setSubmitDialogOpen(true)}
                   className="px-6 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700"
                 >
                   SUBMIT EXAM
                 </button>
               </AlertDialogTrigger>
               <AlertDialogContent>
                 <AlertDialogHeader>
                   <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                   <AlertDialogDescription>
                     Are you sure you want to submit? You cannot return to the exam once submitted.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                   <AlertDialogCancel onClick={() => setSubmitDialogOpen(false)}>Review More</AlertDialogCancel>
                   <AlertDialogAction 
                     onClick={handleSubmit}
                     className="bg-red-600 text-white hover:bg-red-700"
                   >
                     Yes, Submit Exam
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
          </div>
        </main>

        {/* Right Side - Question Map (Official style) */}
        <aside className="w-64 bg-gray-100 border-l border-gray-300 flex flex-col m-2 ml-0 rounded border shadow-sm">
           <div className="p-2 bg-gray-200 border-b border-gray-300 font-bold text-gray-700 text-center text-xs uppercase">
              Question Navigator
           </div>
           <div className="p-2 overflow-y-auto flex-1">
               <div className="grid grid-cols-4 gap-2">
                   {questions.map((q, idx) => (
                       <button
                          key={q.id}
                          onClick={() => setCurrentQIndex(idx)}
                          className={`h-10 w-full rounded border font-bold text-sm shadow-sm transition-all ${
                              idx === currentQIndex 
                              ? 'ring-2 ring-[#006633] ring-offset-1 z-10' 
                              : ''
                          } ${
                              answers[q.id] 
                              ? 'bg-[#006633] text-white border-[#006633]' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                       >
                           {idx + 1}
                       </button>
                   ))}
                    {/* Fillers for visual density */}
                   {Array.from({ length: 35 }).map((_, i) => (
                      <button key={i + 50} className="h-10 w-full rounded border bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed text-sm">
                          {i + 6}
                      </button>
                   ))}
               </div>
           </div>
           
           <div className="p-3 bg-white border-t border-gray-300">
               <div className="flex items-center gap-2 mb-2">
                   <div className="w-4 h-4 bg-[#006633] rounded border border-[#006633]"></div>
                   <span className="text-xs text-gray-600">Answered</span>
               </div>
               <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-white rounded border border-gray-300"></div>
                   <span className="text-xs text-gray-600">Unanswered</span>
               </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
