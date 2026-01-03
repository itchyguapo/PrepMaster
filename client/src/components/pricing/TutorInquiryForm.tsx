import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Users, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TutorInquiryForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institutionName: "",
    contactName: "",
    email: "",
    phone: "",
    studentCount: "",
    useCase: "",
    preferredContact: "email",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tutor-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit inquiry");
      }

      toast({
        title: "Inquiry Submitted!",
        description: "We'll contact you soon with custom pricing for your institution.",
      });

      // Reset form
      setFormData({
        institutionName: "",
        contactName: "",
        email: "",
        phone: "",
        studentCount: "",
        useCase: "",
        preferredContact: "email",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Building2 className="h-6 w-6 text-primary" />
          For Tutors & Schools
        </CardTitle>
        <CardDescription className="text-base">
          Get custom pricing tailored to your institution's needs. Perfect for schools, tutoring centers, and educational organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institutionName">
                <Building2 className="h-4 w-4 inline mr-2" />
                Institution Name *
              </Label>
              <Input
                id="institutionName"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                placeholder="e.g., ABC High School"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">
                Contact Person Name *
              </Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@institution.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentCount">
              <Users className="h-4 w-4 inline mr-2" />
              Number of Students
            </Label>
            <Select
              value={formData.studentCount}
              onValueChange={(value) => setFormData({ ...formData, studentCount: value })}
            >
              <SelectTrigger id="studentCount">
                <SelectValue placeholder="Select student count range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-50">1-50 students</SelectItem>
                <SelectItem value="51-100">51-100 students</SelectItem>
                <SelectItem value="101-250">101-250 students</SelectItem>
                <SelectItem value="251-500">251-500 students</SelectItem>
                <SelectItem value="500+">500+ students</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="useCase">Use Case / Requirements</Label>
            <Textarea
              id="useCase"
              value={formData.useCase}
              onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
              placeholder="Tell us about your institution's needs, how you plan to use PrepMaster, and any specific requirements..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <RadioGroup
              value={formData.preferredContact}
              onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="contact-email" />
                <Label htmlFor="contact-email" className="font-normal cursor-pointer">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="contact-phone" />
                <Label htmlFor="contact-phone" className="font-normal cursor-pointer">Phone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="contact-both" />
                <Label htmlFor="contact-both" className="font-normal cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <AlertDescription>
              We'll review your inquiry and contact you within 24-48 hours with a custom quote tailored to your needs.
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Get Custom Pricing Quote"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

