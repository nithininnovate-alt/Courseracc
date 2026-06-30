import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useStaffLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Globe, Users, BookOpen, CreditCard, GraduationCap, LogOut, Menu, Inbox, Plane, Mail, FileText, ClipboardList, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser();
  const logout = useStaffLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthorized =
    !!user && (user.role === "admin" || user.role === "superadmin");

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      setLocation("/admin/login");
    }
  }, [isLoading, isAuthorized, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/admin/login");
      }
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <Globe className="w-4 h-4" /> },
    { label: "Applications", href: "/admin/applications", icon: <Inbox className="w-4 h-4" /> },
    { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
    { label: "Students", href: "/admin/students", icon: <Users className="w-4 h-4" /> },
    { label: "Exams", href: "/admin/exams", icon: <FileText className="w-4 h-4" /> },
    { label: "Assignments", href: "/admin/assignments", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "Payments", href: "/admin/payments", icon: <CreditCard className="w-4 h-4" /> },
    { label: "Certificates", href: "/admin/certificates", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Email Logs", href: "/admin/emails", icon: <Mail className="w-4 h-4" /> },
    { label: "Courier", href: "/admin/courier", icon: <Plane className="w-4 h-4" /> },
    { label: "Reports", href: "/admin/reports", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-muted/20 font-sans selection:bg-secondary selection:text-secondary-foreground">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 w-64 h-screen bg-primary text-primary-foreground transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Globe className="text-secondary-foreground w-5 h-5" />
            </div>
            <span className="text-xl font-bold font-serif tracking-tight text-white">CGU Admin</span>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? "bg-white/10 text-white font-medium" : "text-primary-foreground/70 hover:text-white hover:bg-white/5"}`} onClick={() => setMobileMenuOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/10 mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="font-medium text-sm text-white">
                  {user.firstName?.charAt(0) || "A"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-primary-foreground/60 capitalize">{user.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-primary-foreground/70 hover:text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between md:justify-end">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-4">
            {/* Search, Notifications, etc */}
          </div>
        </header>
        
        <div className="p-6 md:p-8 flex-1">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}