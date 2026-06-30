import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Globe, BookOpen, CreditCard, GraduationCap, LayoutDashboard, Menu, CheckSquare, FileText, ArrowRight, X, LogOut, UserCircle } from "lucide-react";
import { useState } from "react";
import { ChatWidget } from "@/components/student/ChatWidget";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const navItems = [
    { label: "Dashboard", href: "/portal", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Course Catalog", href: "/portal/courses", icon: <Globe className="w-5 h-5" /> },
    { label: "My Learning", href: "/portal/learning", icon: <BookOpen className="w-5 h-5" /> },
    { label: "Assignments", href: "/portal/assignments", icon: <CheckSquare className="w-5 h-5" /> },
    { label: "Exams", href: "/portal/exams", icon: <FileText className="w-5 h-5" /> },
    { label: "Payments", href: "/portal/payments", icon: <CreditCard className="w-5 h-5" /> },
    { label: "Certificates", href: "/portal/certificates", icon: <GraduationCap className="w-5 h-5" /> },
    { label: "My Applications", href: "/portal/applications", icon: <ArrowRight className="w-5 h-5" /> },
    { label: "Profile", href: "/portal/profile", icon: <UserCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-secondary selection:text-secondary-foreground flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-primary-foreground w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-serif tracking-tight text-primary hidden sm:inline-block">
                Central Global
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1 mx-6">
             {navItems.map(item => {
               const isActive = location === item.href || (item.href !== "/portal" && location.startsWith(item.href));
               return (
                 <Link key={item.href} href={item.href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-primary/5 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}>
                   {item.label}
                 </Link>
               );
             })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium text-muted-foreground max-w-[180px] truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut(() => setLocation("/"))}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
           <div className="p-4 flex justify-between items-center border-b border-border">
              <span className="text-xl font-bold font-serif text-primary">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
           </div>
           <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
             {navItems.map(item => (
               <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 p-4 rounded-xl ${location === item.href ? "bg-primary/5 text-primary font-bold" : "text-foreground hover:bg-muted"}`}>
                 {item.icon}
                 <span className="text-lg">{item.label}</span>
               </Link>
             ))}
           </nav>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <ChatWidget />
    </div>
  );
}