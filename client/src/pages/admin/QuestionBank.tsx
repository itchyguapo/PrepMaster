import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileText, 
  Search, 
  Filter,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  FileCheck,
  BookOpen,
  LayoutGrid,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const initialQuestions = [
  { id: 1, q: "Calculate the value of x if 2x + 5 = 15", exam: "WAEC", subject: "Mathematics", topic: "Algebra", status: "Active" },
  { id: 2, q: "Which of the following is a noble gas?", exam: "JAMB", subject: "Chemistry", topic: "Periodic Table", status: "Review" },
  { id: 3, q: "The narrative technique used in the passage...", exam: "JAMB", subject: "Literature", topic: "Literary Devices", status: "Active" },
  { id: 4, q: "Identify the figure of speech in 'The wind whispered'", exam: "WAEC", subject: "English", topic: "Figurative Expr.", status: "Active" },
  { id: 5, q: "In a market economy, price is determined by...", exam: "WAEC", subject: "Economics", topic: "Price Mechanism", status: "Draft" },
  { id: 6, q: "Who was the first Prime Minister of Nigeria?", exam: "NECO", subject: "Civic Education", topic: "History", status: "Active" },
  { id: 7, q: "Define the term 'Osmosis'...", exam: "NECO", subject: "Biology", topic: "Cell Biology", status: "Review" },
  { id: 8, q: "Find the derivative of sin(x)", exam: "WAEC", subject: "Mathematics", topic: "Calculus", status: "Active" },
  { id: 9, q: "What is the atomic number of Carbon?", exam: "WAEC", subject: "Chemistry", topic: "Atomic Structure", status: "Active" },
];

const subjectsList = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology", "Economics", "Literature", "Government", "Civic Education"
];

export default function QuestionBank() {
  const [questions, setQuestions] = useState(initialQuestions);
  const { toast } = useToast();
  
  // Navigation State
  const [viewState, setViewState] = useState<"categories" | "subjects" | "questions">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Import Flow States
  const [importStep, setImportStep] = useState<"select_exam" | "select_subject" | "upload" | "processing" | "preview">("select_exam");
  const [importExamType, setImportExamType] = useState<string>("");
  const [importSubject, setImportSubject] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock Form State
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    topic: ""
  });

  // --- Navigation Logic ---
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setViewState("subjects");
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setViewState("questions");
  };

  const handleBack = () => {
    if (viewState === "questions") {
      setViewState("subjects");
      setSelectedSubject(null);
    } else if (viewState === "subjects") {
      setViewState("categories");
      setSelectedCategory(null);
    }
  };

  // --- CRUD Operations ---
  const handleAddQuestion = () => {
    if (!selectedCategory || !selectedSubject) return;

    const q = {
      id: questions.length + 1,
      q: newQuestion.text,
      exam: selectedCategory,
      subject: selectedSubject,
      topic: newQuestion.topic || "General",
      status: "Active"
    };
    setQuestions([q, ...questions]);
    setIsAddDialogOpen(false);
    setNewQuestion({ text: "", topic: "" });
    toast({
      title: "Question Added",
      description: "New question has been successfully added to the bank.",
    });
  };

  const handleDelete = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast({
      title: "Question Deleted",
      description: "Question has been removed.",
      variant: "destructive"
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, status } : q));
    toast({
      title: "Status Updated",
      description: `Question marked as ${status}.`,
    });
  };

  const filteredQuestions = questions.filter(q => 
    q.exam === selectedCategory && q.subject === selectedSubject
  );

  // --- Bulk Import Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectExamForImport = (exam: string) => {
    setImportExamType(exam);
    setImportStep("select_subject");
  };

  const handleSelectSubjectForImport = (subject: string) => {
    setImportSubject(subject);
    setImportStep("upload");
  };

  const startUpload = () => {
    if (!selectedFile) return;
    setImportStep("processing");
    
    // Simulate Upload
    let up = 0;
    const uploadInterval = setInterval(() => {
      up += 10;
      setUploadProgress(up);
      if (up >= 100) {
        clearInterval(uploadInterval);
        startProcessing();
      }
    }, 200);
  };

  const startProcessing = () => {
    let proc = 0;
    const processInterval = setInterval(() => {
      proc += 5;
      setProcessingProgress(proc);
      if (proc >= 100) {
        clearInterval(processInterval);
        // Generate Mock Preview Data based on exam type and subject
        const mockExtracted = [
          { id: 101, q: `Sample ${importExamType} ${importSubject} Question 1...`, exam: importExamType, subject: importSubject, topic: "Introductory Concepts", status: "Review" },
          { id: 102, q: `Another ${importExamType} Question...`, exam: importExamType, subject: importSubject, topic: "Advanced Theory", status: "Review" },
          { id: 103, q: "Complex scenario based question...", exam: importExamType, subject: importSubject, topic: "Practical Application", status: "Review" },
        ];
        setPreviewQuestions(mockExtracted);
        setImportStep("preview");
      }
    }, 100);
  };

  const confirmImport = () => {
    const newQs = previewQuestions.map((q, idx) => ({
      ...q,
      id: Date.now() + idx, 
      status: "Active" 
    }));
    
    setQuestions([...newQs, ...questions]);
    setIsImportDialogOpen(false);
    resetImport();
    toast({
      title: "Import Successful",
      description: `Successfully imported ${newQs.length} questions for ${importExamType} - ${importSubject}.`,
    });
  };

  const resetImport = () => {
    setImportStep("select_exam");
    setImportExamType("");
    setImportSubject("");
    setSelectedFile(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setPreviewQuestions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePreviewQuestion = (id: number) => {
    setPreviewQuestions(previewQuestions.filter(q => q.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Question Bank</h1>
            <p className="text-muted-foreground">
              {viewState === "categories" && "Select an exam category to manage."}
              {viewState === "subjects" && `Select a subject for ${selectedCategory}.`}
              {viewState === "questions" && `Managing ${selectedCategory} - ${selectedSubject} questions.`}
            </p>
          </div>
          <div className="flex gap-3">
             {viewState !== "categories" && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
             )}

            {/* Bulk Import Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              setIsImportDialogOpen(open);
              if (!open) resetImport();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Bulk Import Questions</DialogTitle>
                  <DialogDescription>
                    Follow the steps to upload and classify new questions.
                  </DialogDescription>
                </DialogHeader>

                {importStep === "select_exam" && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Step 1: Select Exam Body</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {["WAEC", "NECO", "JAMB"].map((exam) => (
                        <div 
                          key={exam}
                          className="border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary transition-all group"
                          onClick={() => handleSelectExamForImport(exam)}
                        >
                          <BookOpen className="h-8 w-8 mb-2 text-muted-foreground group-hover:text-primary" />
                          <span className="font-bold">{exam}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importStep === "select_subject" && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Step 2: Select Subject for {importExamType}</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                      {subjectsList.map((subject) => (
                        <Button 
                          key={subject} 
                          variant="outline" 
                          className="justify-start h-auto py-3 px-4"
                          onClick={() => handleSelectSubjectForImport(subject)}
                        >
                          {subject}
                        </Button>
                      ))}
                    </div>
                    <Button variant="ghost" onClick={() => setImportStep("select_exam")}>Back to Exam Selection</Button>
                  </div>
                )}

                {importStep === "upload" && (
                  <div className="grid gap-4 py-8 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col items-center gap-2 mb-4">
                       <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 text-base px-3 py-1">
                         Importing: {importExamType} &gt; {importSubject}
                       </Badge>
                       <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => setImportStep("select_subject")}>Change Selection</Button>
                    </div>
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">
                        {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOCX, or CSV (Max 10MB)
                      </p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.docx,.csv" 
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                )}

                {importStep === "processing" && (
                  <div className="py-8 space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading file...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                    
                    {uploadProgress === 100 && (
                      <div className="space-y-2">
                         <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> 
                            AI Analyzing Topics in {importSubject}...
                          </span>
                          <span>{processingProgress}%</span>
                        </div>
                        <Progress value={processingProgress} className="h-2 bg-primary/20" />
                      </div>
                    )}
                  </div>
                )}

                {importStep === "preview" && (
                  <div className="py-4 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                      <FileCheck className="h-4 w-4" />
                      <span>Extracted {previewQuestions.length} questions for <b>{importExamType} - {importSubject}</b></span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Question Preview</th>
                            <th className="p-2 text-left">AI Detected Topic</th>
                            <th className="p-2 w-[50px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewQuestions.map((q) => (
                            <tr key={q.id} className="border-b last:border-0">
                              <td className="p-2 align-top">{q.q}</td>
                              <td className="p-2 align-top">
                                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">{q.topic}</Badge>
                              </td>
                              <td className="p-2 align-top text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removePreviewQuestion(q.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {importStep === "upload" && (
                    <Button onClick={startUpload} disabled={!selectedFile}>
                      Start Processing
                    </Button>
                  )}
                  {importStep === "processing" && (
                    <Button disabled>Processing...</Button>
                  )}
                  {importStep === "preview" && (
                    <div className="flex gap-2 w-full justify-end">
                      <Button variant="outline" onClick={resetImport}>Cancel</Button>
                      <Button onClick={confirmImport}>Import {previewQuestions.length} Questions</Button>
                    </div>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Add Manual Question Dialog - Only visible in questions view */}
            {viewState === "questions" && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Add New Question</DialogTitle>
                    <DialogDescription>
                      Adding to <b>{selectedCategory} &gt; {selectedSubject}</b>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <Input 
                        placeholder="e.g. Algebra, Organic Chemistry" 
                        value={newQuestion.topic}
                        onChange={(e) => setNewQuestion({...newQuestion, topic: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Textarea 
                        placeholder="Enter the question here..." 
                        className="min-h-[100px]"
                        value={newQuestion.text}
                        onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddQuestion}>Save Question</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* View State: Categories (Level 1) */}
        {viewState === "categories" && (
          <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {["WAEC", "NECO", "JAMB"].map((exam) => (
              <Card 
                key={exam} 
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group"
                onClick={() => handleCategorySelect(exam)}
              >
                <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <BookOpen className="h-8 w-8 text-primary group-hover:text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">{exam}</h2>
                  <p className="text-muted-foreground">Manage {exam} Question Bank</p>
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    View Subjects <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View State: Subjects (Level 2) */}
        {viewState === "subjects" && (
           <div className="animate-in fade-in slide-in-from-right-4">
             <div className="mb-6 flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCategory}</span>
                <ChevronRight className="h-4 w-4" />
                <span>Select Subject</span>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {subjectsList.map((subject) => (
                 <Card 
                    key={subject} 
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleSubjectSelect(subject)}
                  >
                   <CardContent className="p-6 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                         {subject.charAt(0)}
                       </div>
                       <span className="font-medium">{subject}</span>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                   </CardContent>
                 </Card>
               ))}
             </div>
           </div>
        )}

        {/* View State: Questions (Level 3) */}
        {viewState === "questions" && (
          <Card className="animate-in fade-in slide-in-from-right-4">
            <CardHeader>
               <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{selectedCategory}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{selectedSubject}</span>
               </div>
               <CardTitle>Questions List</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredQuestions.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="mb-2">No questions found for {selectedCategory} - {selectedSubject}.</p>
                    <Button onClick={() => setIsAddDialogOpen(true)}>Add First Question</Button>
                 </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Question</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Topic</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 font-medium max-w-[400px] truncate">{row.q}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-normal">{row.topic}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={row.status === 'Active' ? 'default' : 'outline'} className={row.status === 'Review' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' : ''}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                {row.status === 'Review' ? (
                                  <DropdownMenuItem className="text-green-600" onClick={() => handleStatusChange(row.id, 'Active')}>
                                    <Check className="mr-2 h-4 w-4" /> Approve
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
