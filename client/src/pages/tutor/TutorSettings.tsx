import { TutorLayout } from "@/components/layout/TutorLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Shield, Bell, GraduationCap, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function TutorSettings() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [userData, setUserData] = useState<any>(null);
    const [settings, setSettings] = useState({
        notifications: true,
        emailUpdates: true,
        darkMode: false,
    });

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                const res = await fetch(`/api/auth/me?supabaseId=${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [user]);

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your tutor profile preferences have been updated.",
        });
    };

    return (
        <TutorLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Tutor Settings</h1>
                    <p className="text-muted-foreground">Manage your institutional account and tutor profile.</p>
                </div>

                {/* Tutor Profile & Plan */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <GraduationCap className="h-5 w-5" />
                            Tutor Account Details
                        </CardTitle>
                        <CardDescription>Your current plan and enrollment capacity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-background border rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                                <p className="text-lg font-bold text-primary">{userData?.tutorPlan || "Standard Tutor"}</p>
                            </div>
                            <div className="p-4 bg-background border rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Student Quota</p>
                                <p className="text-lg font-bold">{userData?.studentQuota || 0} Students</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-700 text-sm">
                            <Building2 className="h-4 w-4" />
                            Institutions requesting higher quotas can contact support via the inquiry form.
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Tutor Profile
                        </CardTitle>
                        <CardDescription>Update your display information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Display Name</Label>
                                <Input id="username" placeholder="Tutor Name" defaultValue={userData?.username || ""} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email</Label>
                                <Input id="email" type="email" placeholder="email@institution.com" defaultValue={userData?.email || ""} disabled />
                                <p className="text-[10px] text-muted-foreground">Email changes must be requested through admin.</p>
                            </div>
                        </div>
                        <Button onClick={handleSave}>Update Profile</Button>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security
                        </CardTitle>
                        <CardDescription>Manage your access and password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" placeholder="Enter current password" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" type="password" placeholder="New password" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" placeholder="Confirm password" />
                            </div>
                        </div>
                        <Button variant="outline">Reset Password</Button>
                    </CardContent>
                </Card>

                {/* Communication Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Communication
                        </CardTitle>
                        <CardDescription>How PrepMaster contacts you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>System Notifications</Label>
                                <p className="text-sm text-muted-foreground">Alerts for test submissions and group updates</p>
                            </div>
                            <Switch
                                checked={settings.notifications}
                                onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Admin Updates</Label>
                                <p className="text-sm text-muted-foreground">Receive periodic product and feature updates</p>
                            </div>
                            <Switch
                                checked={settings.emailUpdates}
                                onCheckedChange={(checked) => setSettings({ ...settings, emailUpdates: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TutorLayout>
    );
}
