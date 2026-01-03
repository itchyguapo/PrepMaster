import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Trash2, Edit, Copy, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tutorFetch } from "@/lib/tutorApi";
import { TutorLayout } from "@/components/layout/TutorLayout";

type TutorGroup = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  examBodyId: string | null;
  categoryId: string | null;
  maxStudents: number | null;
  isActive: boolean;
  groupCode: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
};

type GroupMember = {
  id: string;
  studentId: string;
  joinedAt: string;
  status: string;
  role: string;
  username: string | null;
  email: string | null;
};

type ExamBody = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  examBodyId: string;
};

export default function Groups() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [groups, setGroups] = useState<TutorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TutorGroup | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [members, setMembers] = useState<Record<string, GroupMember[]>>({});
  const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    examBodyId: "",
    categoryId: "",
    maxStudents: "",
  });

  // Add member state
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState<string | null>(null);

  useEffect(() => {
    void fetchGroups();
    void fetchExamBodies();
  }, []);

  useEffect(() => {
    if (formData.examBodyId) {
      void fetchCategories(formData.examBodyId);
    } else {
      setCategories([]);
    }
  }, [formData.examBodyId]);

  const fetchGroups = async () => {
    try {
      const res = await tutorFetch("/api/tutor/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        // Fetch members for each group
        for (const group of data) {
          void fetchGroupMembers(group.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load groups.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast({
        title: "Error",
        description: "Failed to load groups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const res = await tutorFetch(`/api/tutor/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) => ({ ...prev, [groupId]: data }));
      }
    } catch (err) {
      console.error("Error fetching group members:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await tutorFetch("/api/tutor/groups", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          subject: formData.subject || null,
          examBodyId: formData.examBodyId || null,
          categoryId: formData.categoryId || null,
          maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : null,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Group created successfully.",
        });
        setIsCreateDialogOpen(false);
        setFormData({
          name: "",
          description: "",
          subject: "",
          examBodyId: "",
          categoryId: "",
          maxStudents: "",
        });
        void fetchGroups();
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to create group");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create group.",
        variant: "destructive",
      });
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !formData.name.trim()) {
      return;
    }

    try {
      const res = await tutorFetch(`/api/tutor/groups/${selectedGroup.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          subject: formData.subject || null,
          examBodyId: formData.examBodyId || null,
          categoryId: formData.categoryId || null,
          maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : null,
          isActive: selectedGroup.isActive,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Group updated successfully.",
        });
        setIsEditDialogOpen(false);
        setSelectedGroup(null);
        void fetchGroups();
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to update group");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update group.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await tutorFetch(`/api/tutor/groups/${groupId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Group deleted successfully.",
        });
        void fetchGroups();
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete group");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete group.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!addMemberEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    setAddingMember(groupId);
    try {
      const res = await tutorFetch(`/api/tutor/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: addMemberEmail }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Student added to group successfully.",
        });
        setAddMemberEmail("");
        void fetchGroupMembers(groupId);
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to add student");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add student.",
        variant: "destructive",
      });
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    if (!confirm("Remove this student from the group?")) {
      return;
    }

    try {
      const res = await tutorFetch(`/api/tutor/groups/${groupId}/members/${studentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Student removed from group.",
        });
        void fetchGroupMembers(groupId);
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove student");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove student.",
        variant: "destructive",
      });
    }
  };

  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Group code copied to clipboard.",
    });
  };

  const openEditDialog = (group: TutorGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      subject: group.subject || "",
      examBodyId: group.examBodyId || "",
      categoryId: group.categoryId || "",
      maxStudents: group.maxStudents?.toString() || "",
    });
    if (group.examBodyId) {
      void fetchCategories(group.examBodyId);
    }
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading groups...</p>
          </div>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Student Groups</h1>
            <p className="text-muted-foreground">Manage your student groups and members.</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new student group to organize your students and assign tests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., SS3 Science Class A"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this group"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="examBody">Exam Body</Label>
                    <Select
                      value={formData.examBodyId}
                      onValueChange={(value) => {
                        setFormData({ ...formData, examBodyId: value, categoryId: "" });
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
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Physics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxStudents">Max Students</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No groups yet. Create your first group to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {group.name}
                        {!group.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {group.description || "No description"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {group.subject && (
                        <div>
                          <span className="text-muted-foreground">Subject: </span>
                          <span className="font-medium">{group.subject}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Students: </span>
                        <span className="font-medium">
                          {group.studentCount} {group.maxStudents ? `/ ${group.maxStudents}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Group Code: </span>
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                          {group.groupCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyGroupCode(group.groupCode)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Members</h3>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Student email"
                            value={addMemberEmail}
                            onChange={(e) => setAddMemberEmail(e.target.value)}
                            className="w-64"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && addMemberEmail) {
                                void handleAddMember(group.id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleAddMember(group.id)}
                            disabled={!addMemberEmail || addingMember === group.id}
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                      {members[group.id] && members[group.id].length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members[group.id].map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>{member.username || "N/A"}</TableCell>
                                <TableCell>{member.email || "N/A"}</TableCell>
                                <TableCell>
                                  {new Date(member.joinedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(group.id, member.studentId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No members yet. Add students using their email.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update group information and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Group Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-examBody">Exam Body</Label>
                  <Select
                    value={formData.examBodyId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, examBodyId: value, categoryId: "" });
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
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Input
                    id="edit-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxStudents">Max Students</Label>
                  <Input
                    id="edit-maxStudents"
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditGroup}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TutorLayout>
  );
}

