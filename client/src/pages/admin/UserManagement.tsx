import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MoreVertical,
  Filter,
  UserX,
  UserCheck,
  Mail,
  Shield,
  Edit,
  Loader2,
  Download,
  CheckSquare,
  Square,
  Trash2,
  Ban,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminApi";

type User = {
  id: string | number;
  name: string;
  email: string;
  role: string;
  roleValue?: string;
  plan: string;
  planValue?: string;
  status: string;
  joined: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ role: "student", plan: "basic", subscriptionStatus: "active" });
  const [saving, setSaving] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string | number>>(new Set());
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [banConfirmUser, setBanConfirmUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [banning, setBanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await adminFetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
  }, [toast]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      role: user.roleValue || "student",
      plan: user.planValue || "basic",
      subscriptionStatus: user.status === "Active" ? "active" : "inactive",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "User updated successfully.",
        });
        setIsEditDialogOpen(false);
        setEditingUser(null);

        // Refresh users list
        const usersRes = await adminFetch("/api/admin/users");
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId: string | number, newStatus: string) => {
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionStatus: newStatus.toLowerCase() === 'active' ? 'active' : 'inactive'
        }),
      });

      if (res.ok) {
        toast({
          title: "User Status Updated",
          description: `User has been marked as ${newStatus}.`,
        });

        // Refresh users list
        const usersRes = await adminFetch("/api/admin/users");
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update user status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "User Deleted",
          description: `${user.email} has been permanently deleted.`,
        });
        setUsers(users.filter(u => u.id !== user.id));
        setDeleteConfirmUser(null);
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBanUser = async (user: User, isBanned: boolean) => {
    setBanning(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user.id}/ban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned, reason: isBanned ? "Banned by admin" : undefined }),
      });

      if (res.ok) {
        toast({
          title: isBanned ? "User Banned" : "User Unbanned",
          description: `${user.email} has been ${isBanned ? "banned" : "unbanned"}.`,
        });
        // Update local state
        setUsers(users.map(u =>
          u.id === user.id
            ? { ...u, status: isBanned ? "Banned" : "Active" }
            : u
        ));
        setBanConfirmUser(null);
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to update ban status");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update user ban status.",
        variant: "destructive",
      });
    } finally {
      setBanning(false);
    }
  };

  const handleDeleteTestUsers = async () => {
    try {
      const res = await adminFetch("/api/admin/users/test-users", {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Test Users Deleted",
          description: data.message,
        });
        // Refresh users list
        const usersRes = await adminFetch("/api/admin/users");
        if (usersRes.ok) {
          const userData = await usersRes.json();
          setUsers(userData);
        }
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete test users");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete test users.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: "csv" | "json" = "csv") => {
    try {
      const params = new URLSearchParams({
        format,
        ...(planFilter !== "all" && { plan: planFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(search && { search }),
      });

      const res = await adminFetch(`/api/admin/users/export?${params.toString()}`);
      if (res.ok) {
        if (format === "csv") {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `users-export-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        toast({
          title: "Export Successful",
          description: `Users exported as ${format.toUpperCase()}.`,
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (err) {
      console.error("Error exporting users:", err);
      toast({
        title: "Export Failed",
        description: "Failed to export users.",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async (role?: string, plan?: string, subscriptionStatus?: string) => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/users/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          ...(role && { role }),
          ...(plan && { plan }),
          ...(subscriptionStatus && { subscriptionStatus }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Bulk Update Successful",
          description: data.message,
        });
        setSelectedUsers(new Set());
        // Refresh users list
        const usersRes = await adminFetch("/api/admin/users");
        if (usersRes.ok) {
          const userData = await usersRes.json();
          setUsers(userData);
        }
      } else {
        throw new Error("Bulk update failed");
      }
    } catch (err: any) {
      toast({
        title: "Bulk Update Failed",
        description: err.message || "Failed to update users.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userId: string | number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || u.planValue === planFilter;
    const matchesStatus = statusFilter === "all" || u.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesRole = roleFilter === "all" || u.roleValue === roleFilter;
    return matchesSearch && matchesPlan && matchesStatus && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">User Management</h1>
            <p className="text-muted-foreground">Manage students, tutors, and administrators.</p>
          </div>
          <div className="flex gap-2">
            {selectedUsers.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Bulk Actions ({selectedUsers.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Update Role</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBulkUpdate("student")}>Set as Student</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate("tutor")}>Set as Tutor</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate("admin")}>Set as Admin</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Update Plan</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBulkUpdate(undefined, "basic")}>Set to Basic</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate(undefined, "standard")}>Set to Standard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkUpdate(undefined, "premium")}>Set to Premium</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>Export as JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>
              <Mail className="mr-2 h-4 w-4" /> Send Broadcast Email
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm min-w-[800px] sm:min-w-0">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center"
                        >
                          {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">User</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Role</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Plan</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Joined</th>
                      <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => toggleUserSelection(user.id)}
                            className="flex items-center justify-center"
                          >
                            {selectedUsers.has(user.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {(user.role === 'Admin' || user.roleValue === 'admin') && <Shield className="h-3 w-3 text-primary" />}
                            <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'Tutor' ? 'secondary' : 'outline'}>
                              {user.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.plan !== 'N/A' && (
                            <Badge variant="outline" className={
                              user.plan === 'Premium' ? 'border-primary text-primary bg-primary/5' :
                                user.plan === 'Standard' ? 'border-blue-500 text-blue-600 bg-blue-50' : ''
                            }>
                              {user.plan}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={
                            user.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''
                          }>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{user.joined}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === 'Active' ? (
                                <DropdownMenuItem className="text-amber-600" onClick={() => setBanConfirmUser(user)}>
                                  <Ban className="mr-2 h-4 w-4" /> Ban User
                                </DropdownMenuItem>
                              ) : user.status === 'Banned' ? (
                                <DropdownMenuItem className="text-green-600" onClick={() => handleBanUser(user, false)}>
                                  <UserCheck className="mr-2 h-4 w-4" /> Unban User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-green-600" onClick={() => handleStatusChange(user.id, 'Active')}>
                                  <UserCheck className="mr-2 h-4 w-4" /> Activate User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteConfirmUser(user)}
                                disabled={user.roleValue === 'admin' || user.role === 'Admin'}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
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

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user role and subscription plan for {editingUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select
                  value={editFormData.plan}
                  onValueChange={(value) => setEditFormData({ ...editFormData, plan: value })}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Subscription Status</Label>
                <Select
                  value={editFormData.subscriptionStatus}
                  onValueChange={(value) => setEditFormData({ ...editFormData, subscriptionStatus: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete <strong>{deleteConfirmUser?.email}</strong>?
                This action cannot be undone and will remove all associated data including:
                <ul className="list-disc ml-6 mt-2">
                  <li>All exam attempts</li>
                  <li>Subscription records</li>
                  <li>Created exams</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmUser && handleDeleteUser(deleteConfirmUser)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban User Confirmation Dialog */}
        <Dialog open={!!banConfirmUser} onOpenChange={() => setBanConfirmUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Ban className="h-5 w-5" /> Ban User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to ban <strong>{banConfirmUser?.email}</strong>?
                They will no longer be able to access the platform until unbanned.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBanConfirmUser(null)}
                disabled={banning}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => banConfirmUser && handleBanUser(banConfirmUser, true)}
                disabled={banning}
              >
                {banning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Banning...
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
