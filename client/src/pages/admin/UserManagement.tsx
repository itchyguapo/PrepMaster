import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  MoreVertical, 
  Filter, 
  UserX, 
  UserCheck, 
  Mail,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const initialUsers = [
  { id: 1, name: "Chidimma Okonkwo", email: "chidimma@example.com", role: "Student", plan: "Premium", status: "Active", joined: "2 days ago" },
  { id: 2, name: "Mr. Adebayo", email: "adebayo.tutor@example.com", role: "Tutor", plan: "N/A", status: "Active", joined: "1 month ago" },
  { id: 3, name: "Emmanuel Kalu", email: "emmanuel.k@example.com", role: "Student", plan: "Basic", status: "Inactive", joined: "3 months ago" },
  { id: 4, name: "Sarah Johnson", email: "sarah.j@example.com", role: "Student", plan: "Standard", status: "Active", joined: "1 week ago" },
  { id: 5, name: "Admin User", email: "admin@prepmaster.ng", role: "Admin", plan: "N/A", status: "Active", joined: "1 year ago" },
];

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleStatusChange = (userId: number, newStatus: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    toast({
      title: "User Status Updated",
      description: `User has been marked as ${newStatus}.`,
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">User Management</h1>
            <p className="text-muted-foreground">Manage students, tutors, and administrators.</p>
          </div>
          <Button>
            <Mail className="mr-2 h-4 w-4" /> Send Broadcast Email
          </Button>
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
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Filter Role</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>All Users</DropdownMenuItem>
                    <DropdownMenuItem>Students</DropdownMenuItem>
                    <DropdownMenuItem>Tutors</DropdownMenuItem>
                    <DropdownMenuItem>Admins</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
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
                          {user.role === 'Admin' && <Shield className="h-3 w-3 text-primary" />}
                          <span>{user.role}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.plan !== 'N/A' && (
                          <Badge variant="outline" className={
                            user.plan === 'Premium' ? 'border-primary text-primary bg-primary/5' : ''
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
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit Subscription</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === 'Active' ? (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(user.id, 'Suspended')}>
                                <UserX className="mr-2 h-4 w-4" /> Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-green-600" onClick={() => handleStatusChange(user.id, 'Active')}>
                                <UserCheck className="mr-2 h-4 w-4" /> Activate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
