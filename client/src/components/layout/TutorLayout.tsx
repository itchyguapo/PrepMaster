import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  BookOpen,
  BarChart,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TutorLayoutProps {
  children: React.ReactNode;
}

export function TutorLayout({ children }: TutorLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState<{
    username: string;
  } | null>(null);

  // Fetch user data for display
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        return;
      }

      try {
        const res = await fetch(`/api/auth/me?supabaseId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserData({
            username: data.username || user.email?.split("@")[0] || "Tutor",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to Supabase user data
        setUserData({
          username: user.email?.split("@")[0] || "Tutor",
        });
      }
    };

    if (user) {
      void fetchUserData();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  const displayName = userData?.username || user?.email?.split("@")[0] || "Tutor";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "T";

  const sidebarLinks = [
    { href: "/tutor", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/tutor/groups", icon: Users, label: "Groups" },
    { href: "/tutor/create-assignment", icon: FileText, label: "Create Test" },
    { href: "/tutor/reports", icon: BarChart, label: "Reports" },
    { href: "/tutor/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <div className="w-64 bg-sidebar border-r border-border fixed h-full z-30">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary tracking-tight hover:opacity-80 transition-opacity">
            <BookOpen className="h-5 w-5" />
            PrepMaster <span className="text-foreground/70 text-sm font-sans font-normal ml-1">Tutor</span>
          </Link>
        </div>
        <div className="px-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location === link.href || (link.href !== "/tutor" && location.startsWith(link.href));
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Exit Tutor
            </Button>
          </Link>
        </div>
      </div>
      <main className="flex-1 ml-64 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Tutor Mode</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground">PrepMaster Tutor</p>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-background ring-2 ring-border">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-primary font-medium mt-1">
                      PrepMaster Tutor
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/tutor/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

