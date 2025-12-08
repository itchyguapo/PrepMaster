import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter,
  MoreVertical,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function QuestionBank() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Question Bank</h1>
            <p className="text-muted-foreground">Manage and expand the repository of exam questions.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Bulk Import (PDF/Docx)
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </div>
        </div>

        {/* AI Processing Queue */}
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
                  3 files currently being analyzed and tagged.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary">View Queue</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { file: "WAEC_Math_2023.pdf", status: "Extracting Text", progress: 45 },
                { file: "JAMB_English_Past_Questions.docx", status: "Classifying Topics", progress: 80 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-sm">{item.file}</span>
                      <span className="text-xs text-muted-foreground">{item.status}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Question List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search questions..." className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Filter by Exam</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>WAEC</DropdownMenuItem>
                    <DropdownMenuItem>JAMB</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Question</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exam/Subject</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Topic</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { q: "Calculate the value of x if 2x + 5 = 15", exam: "WAEC", subject: "Math", topic: "Algebra", status: "Active" },
                    { q: "Which of the following is a noble gas?", exam: "JAMB", subject: "Chemistry", topic: "Periodic Table", status: "Review" },
                    { q: "The narrative technique used in the passage...", exam: "JAMB", subject: "Literature", topic: "Literary Devices", status: "Active" },
                    { q: "Identify the figure of speech in 'The wind whispered'", exam: "WAEC", subject: "English", topic: "Figurative Expr.", status: "Active" },
                    { q: "In a market economy, price is determined by...", exam: "WAEC", subject: "Economics", topic: "Price Mechanism", status: "Draft" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium max-w-[300px] truncate">{row.q}</td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{row.exam}</span>
                          <span className="text-muted-foreground">{row.subject}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant="secondary" className="font-normal">{row.topic}</Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={row.status === 'Active' ? 'default' : 'outline'} className={row.status === 'Review' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' : ''}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
