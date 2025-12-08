import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Files, 
  Users, 
  Settings, 
  LogOut, 
  BarChart, 
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  const sidebarLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/questions", icon: Files, label: "Question Bank" },
    { href: "/admin/users", icon: Users, label: "User Management" },
    { href: "/admin/finance", icon: CreditCard, label: "Revenue" },
    { href: "/admin/settings", icon: Settings, label: "System Settings" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <div className="w-64 bg-sidebar border-r border-border fixed h-full z-30">
        <div className="p-6">
          <h1 className="font-display font-bold text-xl text-primary tracking-tight">
            PrepMaster <span className="text-foreground/70 text-sm font-sans font-normal ml-1">Admin</span>
          </h1>
        </div>
        <div className="px-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <a className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </a>
              </Link>
            );
          })}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Exit Admin
            </Button>
          </Link>
        </div>
      </div>
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
