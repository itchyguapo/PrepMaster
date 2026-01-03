import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tutorFetch } from "@/lib/tutorApi";
import { TutorLayout } from "@/components/layout/TutorLayout";

type ExamBody = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  examBodyId: string;
};

type Subject = {
  id: string;
  name: string;
  categoryId: string;
  examBodyId: string;
};

type TutorGroup = {
  id: string;
  name: string;
  studentCount: number;
};

export default function CreateAssignment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"criteria" | "configure" | "assign">("criteria");

  // Data
  const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [groups, setGroups] = useState<TutorGroup[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    examBodyId: "",
    categoryId: "",
    subjectId: "",
    selectedTopics: [] as string[],
    questionCount: "20",
    title: "",
    instructions: "",
    dueDate: "",
    dueTime: "",
    timeLimit: "",
    maxAttempts: "1",
    randomizeQuestions: true,
    showResultsImmediately: true,
    groupId: "",
    studentId: "",
  });

  useEffect(() => {
    void fetchExamBodies();
    void fetchGroups();
  }, []);

  useEffect(() => {
    if (formData.examBodyId) {
      void fetchCategories(formData.examBodyId);
    } else {
      setCategories([]);
      setSubjects([]);
      setTopics([]);
    }
  }, [formData.examBodyId]);

  useEffect(() => {
    if (formData.categoryId && formData.examBodyId) {
      void fetchSubjects(formData.examBodyId, formData.categoryId);
    } else {
      setSubjects([]);
      setTopics([]);
    }
  }, [formData.categoryId, formData.examBodyId]);

  useEffect(() => {
    if (formData.subjectId && formData.examBodyId && formData.categoryId) {
      void fetchTopics();
      void checkAvailableQuestions();
    } else {
      setTopics([]);
      setAvailableQuestions(0);
    }
  }, [formData.subjectId, formData.examBodyId, formData.categoryId, formData.selectedTopics]);

  const fetchExamBodies = async () => {
    try {
      const res = await fetch("/api/exam-bodies");
      if (res.ok) {
        const data = await res.json();
        setExamBodies(data);
      }
    } catch (err) {
      console.error("Error fetching exam bodies:", err);
    }
  };

  const fetchCategories = async (examBodyId: string) => {
    try {
      const res = await fetch(`/api/categories?examBodyId=${examBodyId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchSubjects = async (examBodyId: string, categoryId: string) => {
    try {
      const res = await fetch(`/api/admin/subjects?examBodyId=${examBodyId}&categoryId=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(
        `/api/admin/questions?examBodyId=${formData.examBodyId}&categoryId=${formData.categoryId}&subjectId=${formData.subjectId}`
      );
      if (res.ok) {
        const data = await res.json();
        // Extract unique topics
        const uniqueTopics = Array.from(
          new Set(data.map((q: any) => q.topic).filter((t: string) => t))
        ) as string[];
        setTopics(uniqueTopics.sort());
      }
    } catch (err) {
      console.error("Error fetching topics:", err);
    }
  };

  const checkAvailableQuestions = async () => {
    try {
      const res = await fetch(
        `/api/admin/questions?examBodyId=${formData.examBodyId}&categoryId=${formData.categoryId}&subjectId=${formData.subjectId}`
      );
      if (res.ok) {
        const data = await res.json();
        let filtered = data;
        if (formData.selectedTopics.length > 0) {
          filtered = data.filter((q: any) =>
            formData.selectedTopics.includes(q.topic)
          );
        }
        setAvailableQuestions(filtered.length);
      }
    } catch (err) {
      console.error("Error checking available questions:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await tutorFetch("/api/tutor/groups");
      if (res.ok) {
        const data = await res.json();
        // @ts-ignore
        setGroups(data.filter((g: TutorGroup) => g.isActive));
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const toggleTopic = (topic: string) => {
    setFormData((prev) => {
      const newTopics = prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter((t) => t !== topic)
        : [...prev.selectedTopics, topic];
      return { ...prev, selectedTopics: newTopics };
    });
  };

  const handleNext = () => {
    if (step === "criteria") {
      if (!formData.examBodyId || !formData.categoryId || !formData.subjectId) {
        toast({
          title: "Error",
          description: "Please select exam body, category, and subject.",
          variant: "destructive",
        });
        return;
      }
      if (availableQuestions === 0) {
        toast({
          title: "Error",
          description: "No questions available for the selected criteria.",
          variant: "destructive",
        });
        return;
      }
      setStep("configure");
    } else if (step === "configure") {
      if (!formData.title.trim()) {
        toast({
          title: "Error",
          description: "Assignment title is required.",
          variant: "destructive",
        });
        return;
      }
      setStep("assign");
    }
  };

  const handleSubmit = async () => {
    if (!formData.groupId && !formData.studentId) {
      toast({
        title: "Error",
        description: "Please assign to a group or individual student.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Combine due date and time
      let dueDate: string | null = null;
      if (formData.dueDate) {
        if (formData.dueTime) {
          dueDate = new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString();
        } else {
          dueDate = new Date(`${formData.dueDate}T23:59:59`).toISOString();
        }
      }

      const res = await tutorFetch("/api/tutor/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          instructions: formData.instructions || null,
          examBodyId: formData.examBodyId,
          categoryId: formData.categoryId,
          subjectId: formData.subjectId,
          topics: formData.selectedTopics,
          questionCount: parseInt(formData.questionCount),
          dueDate,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) * 60 : null, // Convert minutes to seconds
          maxAttempts: parseInt(formData.maxAttempts),
          randomizeQuestions: formData.randomizeQuestions,
          showResultsImmediately: formData.showResultsImmediately,
          groupId: formData.groupId || null,
          studentId: formData.studentId || null,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Assignment created successfully.",
        });
        setLocation("/tutor");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to create assignment");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create assignment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/tutor")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Assignment</h1>
            <p className="text-muted-foreground">Create a new test assignment for your students.</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-2 rounded ${step === "criteria" ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex-1 h-2 rounded ${step === "configure" ? "bg-primary" : step === "assign" ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex-1 h-2 rounded ${step === "assign" ? "bg-primary" : "bg-muted"}`} />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className={step === "criteria" ? "font-semibold text-foreground" : ""}>Select Criteria</span>
          <span className={step === "configure" ? "font-semibold text-foreground" : ""}>Configure</span>
          <span className={step === "assign" ? "font-semibold text-foreground" : ""}>Assign</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === "criteria" && "Step 1: Select Questions"}
              {step === "configure" && "Step 2: Configure Assignment"}
              {step === "assign" && "Step 3: Assign to Students"}
            </CardTitle>
            <CardDescription>
              {step === "criteria" && "Choose exam body, category, subject, and topics for your assignment."}
              {step === "configure" && "Set assignment details, due date, and options."}
              {step === "assign" && "Assign this test to a group or individual student."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Criteria */}
            {step === "criteria" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="examBody">Exam Body *</Label>
                    <Select
                      value={formData.examBodyId}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          examBodyId: value,
                          categoryId: "",
                          subjectId: "",
                          selectedTopics: [],
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam body" />
                      </SelectTrigger>
                      <SelectContent>
                        {examBodies.map((body) => (
                          <SelectItem key={body.id} value={body.id}>
                            {body.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          categoryId: value,
                          subjectId: "",
                          selectedTopics: [],
                        });
                      }}
                      disabled={!formData.examBodyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subjectId}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        subjectId: value,
                        selectedTopics: [],
                      });
                    }}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subj) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {topics.length > 0 && (
                  <div>
                    <Label>Select Topics (Optional - leave empty for all topics)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg">
                      {topics.map((topic) => (
                        <div key={topic} className="flex items-center space-x-2">
                          <Checkbox
                            id={`topic-${topic}`}
                            checked={formData.selectedTopics.includes(topic)}
                            onCheckedChange={() => toggleTopic(topic)}
                          />
                          <label
                            htmlFor={`topic-${topic}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {topic}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.selectedTopics.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {formData.selectedTopics.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="questionCount">Number of Questions *</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    max={availableQuestions}
                    value={formData.questionCount}
                    onChange={(e) => setFormData({ ...formData, questionCount: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Available: {availableQuestions} questions
                    {formData.selectedTopics.length > 0 && ` (filtered by selected topics)`}
                  </p>
                </div>
              </>
            )}

            {/* Step 2: Configure */}
            {step === "configure" && (
              <>
                <div>
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Motion & Vectors Quiz"
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Optional instructions for students..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueTime">Due Time</Label>
                    <Input
                      id="dueTime"
                      type="time"
                      value={formData.dueTime}
                      onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes, optional)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="1"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                      placeholder="e.g., 60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAttempts">Max Attempts</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      min="1"
                      value={formData.maxAttempts}
                      onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="randomize"
                      checked={formData.randomizeQuestions}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, randomizeQuestions: checked === true })
                      }
                    />
                    <label
                      htmlFor="randomize"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Randomize question order
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showResults"
                      checked={formData.showResultsImmediately}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showResultsImmediately: checked === true })
                      }
                    />
                    <label
                      htmlFor="showResults"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show results immediately after submission
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Assign */}
            {step === "assign" && (
              <>
                <div>
                  <Label htmlFor="groupId">Assign to Group</Label>
                  <Select
                    value={formData.groupId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, groupId: value, studentId: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.studentCount} students)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center text-muted-foreground">OR</div>

                <div>
                  <Label htmlFor="studentId">Assign to Individual Student (Email)</Label>
                  <Input
                    id="studentId"
                    type="email"
                    value={formData.studentId}
                    onChange={(e) => {
                      setFormData({ ...formData, studentId: e.target.value, groupId: "" });
                    }}
                    placeholder="student@example.com"
                    disabled={!!formData.groupId}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Assignment Summary:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {formData.questionCount} questions</li>
                    {formData.selectedTopics.length > 0 && (
                      <li>• Topics: {formData.selectedTopics.join(", ")}</li>
                    )}
                    {formData.dueDate && (
                      <li>• Due: {new Date(formData.dueDate).toLocaleDateString()}</li>
                    )}
                    {formData.timeLimit && <li>• Time limit: {formData.timeLimit} minutes</li>}
                    <li>• Max attempts: {formData.maxAttempts}</li>
                  </ul>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (step === "configure") {
                    setStep("criteria");
                  } else if (step === "assign") {
                    setStep("configure");
                  } else {
                    setLocation("/tutor");
                  }
                }}
              >
                {step === "criteria" ? "Cancel" : "Back"}
              </Button>
              {step === "assign" ? (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Assignment"
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorLayout>
  );
}

