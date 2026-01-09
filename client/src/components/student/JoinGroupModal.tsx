import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Mail, User, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JoinGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function JoinGroupModal({ isOpen, onClose }: JoinGroupModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [groupCode, setGroupCode] = useState("");
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [success, setSuccess] = useState<string | null>(null);

    const joinMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/student/join-group", data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/student/groups"] });
            setSuccess(data.groupName);
            toast({
                title: "Successfully Joined!",
                description: `You are now a member of ${data.groupName}`,
            });
            setTimeout(() => {
                handleClose();
            }, 2000);
        },
        onError: (error: any) => {
            toast({
                title: "Failed to join",
                description: error.message || "Please check the group code and try again.",
                variant: "destructive",
            });
        },
    });

    const handleClose = () => {
        setGroupCode("");
        setGuestName("");
        setGuestEmail("");
        setSuccess(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        joinMutation.mutate({
            groupCode,
            supabaseId: user?.id,
            guestName: !user ? guestName : undefined,
            guestEmail: !user ? guestEmail : undefined,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">Join Class Group</DialogTitle>
                    <DialogDescription className="text-center">
                        Enter the 6-digit code provided by your tutor to join their class.
                    </DialogDescription>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8 text-center"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Welcome to {success}!</h3>
                            <p className="text-sm text-slate-500 mt-2">Redirecting to your dashboard...</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="groupCode">Group Code</Label>
                                <Input
                                    id="groupCode"
                                    placeholder="e.g. A7B2X9"
                                    value={groupCode}
                                    onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                    className="text-center font-mono text-lg tracking-widest uppercase"
                                />
                            </div>

                            {!user && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="space-y-4 pt-2 border-t mt-4"
                                >
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Guest Information
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="guestName" className="flex items-center gap-2">
                                            <User className="h-3 w-3" /> Full Name
                                        </Label>
                                        <Input
                                            id="guestName"
                                            placeholder="Your full name"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            required={!user}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guestEmail" className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" /> Email Address
                                        </Label>
                                        <Input
                                            id="guestEmail"
                                            type="email"
                                            placeholder="student@example.com"
                                            value={guestEmail}
                                            onChange={(e) => setGuestEmail(e.target.value)}
                                            required={!user}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        Joining as a guest allows your tutor to see your progress and grade your assignments.
                                    </p>
                                </motion.div>
                            )}

                            <DialogFooter className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={joinMutation.isPending}
                                >
                                    {joinMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Joining...
                                        </>
                                    ) : (
                                        "Join Group"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
