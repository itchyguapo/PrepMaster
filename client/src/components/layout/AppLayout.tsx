import { Link, useLocation } from "wouter";
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

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const sidebarLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/practice", icon: BookOpen, label: "Practice Center" },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-6">
        <Link href="/">
          <a className="flex items-center gap-2 font-display font-bold text-2xl text-primary tracking-tight">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            PrepMaster<span className="text-secondary">NG</span>
          </a>
        </Link>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}>
                <link.icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                <span className="font-medium">{link.label}</span>
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 gap-3">
          <LogOut className="h-5 w-5" />
          Log out
        </Button>
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
            <span className="font-display font-bold text-lg">PrepMaster</span>
          </div>

          <div className="hidden md:flex items-center max-w-md w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for topics, exams..." className="pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all" />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
            </Button>
            <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">Chidimma O.</p>
                <p className="text-xs text-muted-foreground">Premium Student</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-background ring-2 ring-border">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CO</AvatarFallback>
              </Avatar>
            </div>
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
