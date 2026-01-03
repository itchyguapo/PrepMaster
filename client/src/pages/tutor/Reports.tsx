import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Download, TrendingUp, Users, Clock, CheckCircle2, XCircle, FileText, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tutorFetch } from "@/lib/tutorApi";
import { TutorLayout } from "@/components/layout/TutorLayout";

type AssignmentReport = {
  assignment: {
    id: string;
    title: string;
    instructions: string | null;
    dueDate: string | null;
    timeLimit: number | null;
    maxAttempts: number;
    status: string;
  };
  attempts: Array<{
    id: string;
    studentId: string;
    score: number | null;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    username: string | null;
    email: string | null;
  }>;
  questions: Array<{
    id: string;
    text: string;
    options: Array<{ id: string; text: string }>;
    correctAnswer: string;
  }>;
  statistics: {
    totalStudents: number;
    submittedCount: number;
    pendingCount: number;
    averageScore: number;
  };
};

export default function Reports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [report, setReport] = useState<AssignmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // Check for assignment ID in URL query
  const routeMatch = useRoute("/tutor/reports");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assignmentId = params.get("assignment");
    if (assignmentId) {
      setSelectedAssignmentId(assignmentId);
      void fetchReport(assignmentId);
    }
  }, []);

  useEffect(() => {
    void fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await tutorFetch("/api/tutor/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      toast({
        title: "Error",
        description: "Failed to load assignments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (assignmentId: string) => {
    setLoadingReport(true);
    try {
      const res = await tutorFetch(`/api/tutor/assignments/${assignmentId}/report`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        throw new Error("Failed to fetch report");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load report.",
        variant: "destructive",
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    if (!report) return;

    try {
      if (format === "csv") {
        const csvRows = [
          ["Student", "Score", "Status", "Submitted At"].join(","),
          ...report.attempts.map((attempt) =>
            [
              attempt.username || attempt.email || "Unknown",
              attempt.score?.toString() || "N/A",
              attempt.status,
              attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "N/A",
            ].join(",")
          ),
        ];

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assignment-report-${report.assignment.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify(report, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assignment-report-${report.assignment.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: "Report exported successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to export report.",
        variant: "destructive",
      });
    }
  };

  if (selectedAssignmentId && report) {
    return (
      <TutorLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedAssignmentId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{report.assignment.title}</h1>
              <p className="text-muted-foreground">Assignment Report & Analytics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("csv")}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("json")}>
                <Download className="mr-2 h-4 w-4" /> Export JSON
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{report.statistics.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="text-2xl font-bold">{report.statistics.submittedCount}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{report.statistics.pendingCount}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{report.statistics.averageScore}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Attempts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Performance</CardTitle>
              <CardDescription>Individual student scores and submission status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Student</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Score</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Submitted</th>
                    </tr>
                  </thead>
                  <TableBody>
                    {report.attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">
                          {attempt.username || attempt.email || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {attempt.score !== null ? (
                            <span className="font-bold text-primary">{attempt.score}%</span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              attempt.status === "submitted"
                                ? "default"
                                : attempt.status === "graded"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {attempt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {attempt.submittedAt
                            ? new Date(attempt.submittedAt).toLocaleString()
                            : "Not submitted"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Question Analysis */}
          {report.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Question Analysis</CardTitle>
                <CardDescription>Questions included in this assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.questions.map((question, idx) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">
                          Question {idx + 1}: {question.text}
                        </p>
                      </div>
                      <div className="mt-2 space-y-1">
                        {question.options.map((option) => (
                          <div
                            key={option.id}
                            className={`text-sm ${
                              option.id === question.correctAnswer
                                ? "text-green-600 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {option.id}. {option.text}
                            {option.id === question.correctAnswer && " ✓"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">View detailed reports for your assignments.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No assignments yet. Create your first assignment to see reports.</p>
              <Button onClick={() => setLocation("/tutor/create-assignment")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select Assignment</CardTitle>
              <CardDescription>Choose an assignment to view its detailed report.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedAssignmentId(assignment.id);
                      void fetchReport(assignment.id);
                    }}
                  >
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.groupName || "Individual"} • {assignment.completionCount}/{assignment.totalStudents} completed
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Report <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TutorLayout>
  );
}

