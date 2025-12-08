import { Link } from "wouter";
import { 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  PlusCircle,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";

export default function TutorDashboard() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display">Tutor Dashboard</h1>
            <p className="text-muted-foreground">Manage your student groups and assignments.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" /> Manage Groups
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Test
            </Button>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            { name: "SS3 Science Class A", students: 34, avgScore: 72, subject: "Physics", nextTest: "Tomorrow" },
            { name: "JAMB Prep - Morning", students: 12, avgScore: 65, subject: "Mathematics", nextTest: "Fri, 12th" },
            { name: "Private Lessons", students: 5, avgScore: 88, subject: "Chemistry", nextTest: "No test scheduled" },
          ].map((group, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">{group.name}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{group.subject}</Badge>
                  <span className="text-xs text-muted-foreground">{group.students} Students</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Class Average</span>
                    <span className="font-bold text-primary">{group.avgScore}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next Assessment</span>
                    <span className="font-medium">{group.nextTest}</span>
                  </div>
                  <div className="pt-2">
                    <Button className="w-full" variant="outline" size="sm">View Progress</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Track status of tests assigned to your groups.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Test Name</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Assigned To</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Completion</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Motion & Vectors Quiz", group: "SS3 Science Class A", due: "Dec 15, 2024", completion: "28/34", status: "Active" },
                    { name: "Organic Chemistry Intro", group: "Private Lessons", due: "Dec 10, 2024", completion: "5/5", status: "Closed" },
                    { name: "Calculus Mock", group: "JAMB Prep - Morning", due: "Dec 18, 2024", completion: "0/12", status: "Scheduled" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{row.name}</td>
                      <td className="p-4">{row.group}</td>
                      <td className="p-4 text-muted-foreground">{row.due}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{row.completion}</span>
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${(parseInt(row.completion.split('/')[0]) / parseInt(row.completion.split('/')[1])) * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" className="text-primary">View Report</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
