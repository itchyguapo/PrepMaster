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
  AlertCircle,
  FileCheck,
  BookOpen,
  LayoutGrid
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const initialQuestions = [
  { id: 1, q: "Calculate the value of x if 2x + 5 = 15", exam: "WAEC", subject: "Math", topic: "Algebra", status: "Active" },
  { id: 2, q: "Which of the following is a noble gas?", exam: "JAMB", subject: "Chemistry", topic: "Periodic Table", status: "Review" },
  { id: 3, q: "The narrative technique used in the passage...", exam: "JAMB", subject: "Literature", topic: "Literary Devices", status: "Active" },
  { id: 4, q: "Identify the figure of speech in 'The wind whispered'", exam: "WAEC", subject: "English", topic: "Figurative Expr.", status: "Active" },
  { id: 5, q: "In a market economy, price is determined by...", exam: "WAEC", subject: "Economics", topic: "Price Mechanism", status: "Draft" },
  { id: 6, q: "Who was the first Prime Minister of Nigeria?", exam: "NECO", subject: "Civic Education", topic: "History", status: "Active" },
  { id: 7, q: "Define the term 'Osmosis'...", exam: "NECO", subject: "Biology", topic: "Cell Biology", status: "Review" },
];

export default function QuestionBank() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [filterExam, setFilterExam] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Import Flow States
  const [importStep, setImportStep] = useState<"select_exam" | "upload" | "processing" | "preview">("select_exam");
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock Form State
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    exam: "WAEC",
    subject: "Mathematics",
    topic: ""
  });

  const handleAddQuestion = () => {
    const q = {
      id: questions.length + 1,
      q: newQuestion.text,
      exam: newQuestion.exam,
      subject: newQuestion.subject,
      topic: newQuestion.topic || "General",
      status: "Active"
    };
    setQuestions([q, ...questions]);
    setIsAddDialogOpen(false);
    setNewQuestion({ text: "", exam: "WAEC", subject: "Mathematics", topic: "" });
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

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.q.toLowerCase().includes(searchTerm.toLowerCase()) || q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExam ? q.exam === filterExam : true;
    return matchesSearch && matchesExam;
  });

  // Grouping Logic
  const groupedQuestions = filteredQuestions.reduce((acc, q) => {
    const key = `${q.exam} - ${q.subject}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {} as Record<string, typeof questions>);

  // --- Bulk Import Logic ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectExamForImport = (exam: string) => {
    setSelectedExamType(exam);
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
        // Start Processing simulation
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
        // Generate Mock Preview Data based on exam type
        const mockExtracted = [
          { id: 101, q: `Sample ${selectedExamType} Question 1...`, exam: selectedExamType, subject: "General", topic: "Introductory Concepts", status: "Review" },
          { id: 102, q: `Another ${selectedExamType} Question...`, exam: selectedExamType, subject: "General", topic: "Advanced Theory", status: "Review" },
          { id: 103, q: "Complex scenario based question...", exam: selectedExamType, subject: "General", topic: "Practical Application", status: "Review" },
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
      description: `Successfully imported ${newQs.length} questions for ${selectedExamType}.`,
    });
  };

  const resetImport = () => {
    setImportStep("select_exam");
    setSelectedExamType("");
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
            <p className="text-muted-foreground">Manage and expand the repository of exam questions.</p>
          </div>
          <div className="flex gap-3">
            {/* Bulk Import Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              setIsImportDialogOpen(open);
              if (!open) resetImport();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Import (PDF/Docx)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Bulk Import Questions</DialogTitle>
                  <DialogDescription>
                    Upload exam papers to automatically extract questions and sort by topic.
                  </DialogDescription>
                </DialogHeader>

                {importStep === "select_exam" && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Select Exam Body</Label>
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

                {importStep === "upload" && (
                  <div className="grid gap-4 py-8 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                         Importing for {selectedExamType}
                       </Badge>
                       <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => setImportStep("select_exam")}>Change</Button>
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
                            AI Sorting Subjects & Topics...
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
                      <span>Successfully extracted {previewQuestions.length} questions for <b>{selectedExamType}</b></span>
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
            
            {/* Add Manual Question Dialog */}
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
                    Manually add a question to the database.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exam Type</Label>
                      <Select 
                        value={newQuestion.exam} 
                        onValueChange={(val) => setNewQuestion({...newQuestion, exam: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Exam" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WAEC">WAEC</SelectItem>
                          <SelectItem value="NECO">NECO</SelectItem>
                          <SelectItem value="JAMB">JAMB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select 
                        value={newQuestion.subject} 
                        onValueChange={(val) => setNewQuestion({...newQuestion, subject: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Civic Education">Civic Education</SelectItem>
                          <SelectItem value="Biology">Biology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
          </div>
        </div>

        {/* AI Processing Queue (Mock) */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  AI Processing Pipeline
                </CardTitle>
                <CardDescription>
                  System automatically processes uploaded files.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary">View History</Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Show recently processed items if any */}
            <div className="space-y-3">
               <div className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-sm">JAMB_English_Past_Questions.docx</span>
                      <span className="text-xs text-green-600 font-medium">Completed</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-full" />
                    </div>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Question List Grouped by Exam/Subject */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search questions across all banks..." 
                className="pl-9 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {filterExam ? filterExam : "Filter by Exam"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterExam(null)}>All Exams</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterExam("WAEC")}>WAEC</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterExam("NECO")}>NECO</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterExam("JAMB")}>JAMB</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {Object.entries(groupedQuestions).length === 0 ? (
             <Card>
               <CardContent className="p-8 text-center text-muted-foreground">
                 No questions found matching your criteria.
               </CardContent>
             </Card>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(groupedQuestions)} className="space-y-4">
              {Object.entries(groupedQuestions).map(([groupTitle, groupItems]) => (
                <AccordionItem key={groupTitle} value={groupTitle} className="border border-border rounded-lg bg-card px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded text-primary">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-lg">{groupTitle}</span>
                      <Badge variant="secondary" className="ml-2">{groupItems.length} Questions</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                     <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Question</th>
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Topic</th>
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map((row) => (
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
