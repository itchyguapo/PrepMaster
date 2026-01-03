import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Users, 
  PlusCircle,
  MoreHorizontal,
  FileText,
  Clock,
  Filter,
  ArrowRight,
  Eye,
  Edit,
  Copy,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { tutorFetch } from "@/lib/tutorApi";
import { TutorLayout } from "@/components/layout/TutorLayout";

type TutorGroup = {
  id: string;
  name: string;
  subject: string | null;
  studentCount: number;
  isActive: boolean;
};

type TutorAssignment = {
  id: string;
  title: string;
  groupName: string | null;
  dueDate: string | null;
  completionCount: number;
  totalStudents: number;
  status: string;
  createdAt: string;
};

export default function TutorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [groups, setGroups] = useState<TutorGroup[]>([]);
  const [assignments, setAssignments] = useState<TutorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  useEffect(() => {
    void fetchData();
  }, [statusFilter, groupFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, assignmentsRes] = await Promise.all([
        tutorFetch("/api/tutor/groups"),
        tutorFetch(`/api/tutor/assignments${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.filter((g: TutorGroup) => g.isActive));
      }

      if (assignmentsRes.ok) {
        let assignmentsData = await assignmentsRes.json();
        if (groupFilter !== "all") {
          assignmentsData = assignmentsData.filter((a: TutorAssignment) => a.groupName === groupFilter);
        }
        setAssignments(assignmentsData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      scheduled: "secondary",
      active: "default",
      completed: "default",
      closed: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const stats = {
    totalGroups: groups.length,
    totalStudents: groups.reduce((sum, g) => sum + g.studentCount, 0),
    activeAssignments: assignments.filter((a) => a.status === "active").length,
    pendingSubmissions: assignments.reduce(
      (sum, a) => sum + (a.totalStudents - a.completionCount),
      0
    ),
    avgPerformance: assignments.length > 0
      ? Math.round(
          assignments.reduce((sum, a) => {
            // Mock average - in real implementation, calculate from attempts
            return sum + 70;
          }, 0) / assignments.length
        )
      : 0,
  };

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tutor Dashboard</h1>
            <p className="text-muted-foreground">Manage your student groups and assignments.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/tutor/groups")}>
              <Users className="mr-2 h-4 w-4" /> Manage Groups
            </Button>
            <Button onClick={() => setLocation("/tutor/create-assignment")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Test
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Groups</p>
                  <p className="text-2xl font-bold">{stats.totalGroups}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Assignments</p>
                  <p className="text-2xl font-bold">{stats.activeAssignments}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Submissions</p>
                  <p className="text-2xl font-bold">{stats.pendingSubmissions}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Groups Grid */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Groups</h2>
            <Button variant="outline" size="sm" onClick={() => setLocation("/tutor/groups")}>
              View All
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No groups yet. Create your first group to get started.</p>
                <Button onClick={() => setLocation("/tutor/groups")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.slice(0, 6).map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/tutor/groups`)}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold">{group.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation("/tutor/groups"); }}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation("/tutor/create-assignment"); }}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Create Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      {group.subject && <Badge variant="secondary">{group.subject}</Badge>}
                      <span className="text-xs text-muted-foreground">{group.studentCount} Students</span>
                    </div>
                    <Button className="w-full" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setLocation("/tutor/groups"); }}>
                      View Progress <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Assignments</CardTitle>
                <CardDescription>Track status of tests assigned to your groups.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No assignments yet. Create your first assignment.</p>
                <Button onClick={() => setLocation("/tutor/create-assignment")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Assignment
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Test Name</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Assigned To</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Due Date</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Completion</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => {
                      const completionRate = assignment.totalStudents > 0
                        ? (assignment.completionCount / assignment.totalStudents) * 100
                        : 0;
                      return (
                        <tr key={assignment.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{assignment.title}</td>
                          <td className="p-4">{assignment.groupName || "Individual"}</td>
                          <td className="p-4 text-muted-foreground">
                            {formatDate(assignment.dueDate)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {assignment.completionCount}/{assignment.totalStudents}
                              </span>
                              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">{getStatusBadge(assignment.status)}</td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setLocation(`/tutor/reports?assignment=${assignment.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Report
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TutorLayout>
  );
}
