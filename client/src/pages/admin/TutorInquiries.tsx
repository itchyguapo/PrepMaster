import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/adminApi";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Loader2, Mail, Phone, Building2, Users, Calendar, Search, Filter, Download } from "lucide-react";

type TutorInquiry = {
  id: string;
  institutionName: string;
  contactName: string;
  email: string;
  phone: string | null;
  studentCount: string | null;
  useCase: string | null;
  preferredContact: string | null;
  status: "pending" | "contacted" | "quoted" | "converted" | "closed";
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export default function TutorInquiries() {
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState<TutorInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<TutorInquiry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/tutor-inquiries");
      const data = await res.json();
      setInquiries(data || []);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast({
        title: "Error",
        description: "Failed to load tutor inquiries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (inquiryId: string, status: string, notes?: string) => {
    try {
      const res = await adminFetch(`/api/admin/tutor-inquiries/${inquiryId}`, {
        method: "PUT",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update");

      toast({
        title: "Success",
        description: "Inquiry updated successfully",
      });

      await fetchInquiries();
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inquiry",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      contacted: "secondary",
      quoted: "default",
      converted: "default",
      closed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      inquiry.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ["Institution", "Contact", "Email", "Phone", "Students", "Status", "Date"];
    const rows = filteredInquiries.map((inq) => [
      inq.institutionName,
      inq.contactName,
      inq.email,
      inq.phone || "",
      inq.studentCount || "",
      inq.status,
      new Date(inq.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-inquiries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Tutor & School Inquiries</h1>
          <p className="text-muted-foreground">Manage quote requests from tutors and educational institutions</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by institution, contact, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inquiries List */}
        <div className="space-y-4">
          {filteredInquiries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No inquiries found</p>
              </CardContent>
            </Card>
          ) : (
            filteredInquiries.map((inquiry) => (
              <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{inquiry.institutionName}</h3>
                        {getStatusBadge(inquiry.status)}
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Contact:</span>
                          <span>{inquiry.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{inquiry.email}</span>
                        </div>
                        {inquiry.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{inquiry.phone}</span>
                          </div>
                        )}
                        {inquiry.studentCount && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{inquiry.studentCount} students</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(inquiry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                      {inquiry.useCase && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{inquiry.useCase}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedInquiry(inquiry);
                        setDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInquiry?.institutionName}</DialogTitle>
              <DialogDescription>Inquiry Details</DialogDescription>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Name</Label>
                    <p className="text-sm font-medium">{selectedInquiry.contactName}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{selectedInquiry.email}</p>
                  </div>
                  {selectedInquiry.phone && (
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm font-medium">{selectedInquiry.phone}</p>
                    </div>
                  )}
                  {selectedInquiry.studentCount && (
                    <div>
                      <Label>Student Count</Label>
                      <p className="text-sm font-medium">{selectedInquiry.studentCount}</p>
                    </div>
                  )}
                  <div>
                    <Label>Preferred Contact</Label>
                    <p className="text-sm font-medium capitalize">{selectedInquiry.preferredContact || "Email"}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedInquiry.status)}</div>
                  </div>
                </div>
                {selectedInquiry.useCase && (
                  <div>
                    <Label>Use Case / Requirements</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selectedInquiry.useCase}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="notes">Admin Notes</Label>
                  <Textarea
                    id="notes"
                    defaultValue={selectedInquiry.notes || ""}
                    placeholder="Add notes about this inquiry..."
                    rows={4}
                    onChange={(e) => {
                      setSelectedInquiry({ ...selectedInquiry, notes: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select
                    value={selectedInquiry.status}
                    onValueChange={(value) => {
                      setSelectedInquiry({ ...selectedInquiry, status: value as any });
                    }}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedInquiry) {
                    handleStatusUpdate(selectedInquiry.id, selectedInquiry.status, selectedInquiry.notes || undefined);
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

