import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X, Shield, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Resources" },
    { href: "/dashboard", label: "Student Dashboard" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-2xl text-primary tracking-tight">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          PrepMaster<span className="text-secondary">NG</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}

          <div className="h-4 w-[1px] bg-border mx-1" />

          <Link href="/tutor/login" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <GraduationCap className="h-4 w-4" /> Tutor
          </Link>
          <Link href="/admin" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Shield className="h-4 w-4" /> Admin
          </Link>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                Start Practicing
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Nav */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-8 mt-8">
              <div className="flex flex-col gap-4">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <Link href="/admin" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <Shield className="h-4 w-4" /> Admin Portal
                </Link>
                <Link href="/tutor/login" className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <GraduationCap className="h-4 w-4" /> Tutor Login
                </Link>
              </div>
              <div className="flex flex-col gap-4">
                <Button variant="outline" className="w-full">Log in</Button>
                <Button className="w-full">Start Practicing</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
