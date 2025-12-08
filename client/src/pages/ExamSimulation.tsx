import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Mock Data - simulating the "Ugly" but functional official interface
const questions = [
  {
    id: 1,
    text: "Evaluate ∫(2x + 1) dx from x = 1 to x = 2.",
    options: [
      { id: "A", text: "4" },
      { id: "B", text: "5" },
      { id: "C", text: "6" },
      { id: "D", text: "7" },
    ],
    subject: "Mathematics",
  },
  {
    id: 2,
    text: "The term 'utopia' refers to:",
    options: [
      { id: "A", text: "A perfect society" },
      { id: "B", text: "A chaotic world" },
      { id: "C", text: "A religious sect" },
      { id: "D", text: "A political party" },
    ],
    subject: "Use of English",
  },
   {
    id: 3,
    text: "In physics, power is defined as:",
    options: [
      { id: "A", text: "Force times distance" },
      { id: "B", text: "Work done per unit time" },
      { id: "C", text: "Mass times acceleration" },
      { id: "D", text: "Energy times time" },
    ],
    subject: "Physics",
  },
  {
    id: 4,
    text: "Which of these is an example of an invertebrate?",
    options: [
      { id: "A", text: "Tilapia" },
      { id: "B", text: "Toad" },
      { id: "C", text: "Earthworm" },
      { id: "D", text: "Lizard" },
    ],
    subject: "Biology",
  },
  {
    id: 5,
    text: "The capital of Zamfara State is:",
    options: [
      { id: "A", text: "Gusau" },
      { id: "B", text: "Birnin Kebbi" },
      { id: "C", text: "Dutse" },
      { id: "D", text: "Sokoto" },
    ],
    subject: "Civic Education",
  }
];

export default function ExamSimulation() {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours
  const [, setLocation] = useLocation();

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
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleSubmit = () => {
      if(window.confirm("Are you sure you want to submit? You cannot return to the exam.")){
           setLocation("/results");
      }
  }

  // Styles replicating the "Official" look - purposefully slightly dated/utilitarian
  return (
    <div className="min-h-screen bg-[#f0f0f0] font-sans text-sm flex flex-col h-screen select-none">
      {/* Top Bar - Official Green Header */}
      <header className="h-12 bg-[#006633] text-white flex items-center justify-between px-4 shadow-md shrink-0">
        <div className="font-bold text-lg tracking-wide">JAMB CBT 2025</div>
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
             <button 
                onClick={handleSubmit}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700"
             >
                SUBMIT EXAM
             </button>
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
