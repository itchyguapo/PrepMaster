import { Link, useLocation } from "wouter";
import { Branding } from "@/components/common/Branding";
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
// Ads removed
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, subscriptionStatus, signOut } = useAuth();
  const [userData, setUserData] = useState<{
    username: string;
    subscriptionPlan: string;
  } | null>(null);

  // Strict Role Enforcement
  if (user?.role === 'tutor') {
    window.location.href = '/tutor';
    return null;
  }

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
            username: data.username || user.email?.split("@")[0] || "User",
            subscriptionPlan: data.subscriptionPlan || "basic",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to Supabase user data
        setUserData({
          username: user.email?.split("@")[0] || "User",
          subscriptionPlan: "basic",
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

  const displayName = userData?.username || user?.email?.split("@")[0] || "User";
  // Show plan name in subscription label
  const planDisplayName = userData?.subscriptionPlan
    ? userData.subscriptionPlan.charAt(0).toUpperCase() + userData.subscriptionPlan.slice(1)
    : "Basic";
  const subscriptionLabel = `PrepMaster Student • ${planDisplayName}`;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const sidebarLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/practice", icon: BookOpen, label: "Practice Center" },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-2xl text-primary tracking-tight">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          PrepMaster<span className="text-secondary">NG</span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              <link.icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Ads removed */}
      <div className="mt-auto p-6 border-t border-border/50">
        <Branding />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 fixed h-full z-30">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg text-primary hover:opacity-80 transition-opacity">
              <BookOpen className="h-5 w-5" />
              PrepMaster
            </Link>
          </div>

          <div className="hidden lg:flex items-center max-w-md w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for topics, exams..." className="pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all" />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="relative hidden sm:flex">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
            </Button>
            <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{subscriptionLabel}</p>
                  </div>
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-background ring-2 ring-border">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings")}>
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
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
