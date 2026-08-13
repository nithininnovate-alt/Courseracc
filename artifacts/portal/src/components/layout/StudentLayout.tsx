import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Globe, BookOpen, CreditCard, GraduationCap, LayoutDashboard, Menu, CheckSquare, FileText, X, LogOut, UserCircle } from "lucide-react";
import { useState } from "react";
import { ChatWidget } from "@/components/student/ChatWidget";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const navItems = [
    { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
    { label: "Courses", href: "/portal/courses", icon: Globe },
    { label: "My Learning", href: "/portal/learning", icon: BookOpen },
    { label: "Assignments", href: "/portal/assignments", icon: CheckSquare },
    { label: "Payments", href: "/portal/payments", icon: CreditCard },
    { label: "Certificates", href: "/portal/certificates", icon: GraduationCap },
    { label: "Applications", href: "/portal/applications", icon: FileText },
    { label: "Profile", href: "/portal/profile", icon: UserCircle },
  ];

  const isActive = (href: string) =>
    location === href || (href !== "/portal" && location.startsWith(href));

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initial = (user?.firstName?.[0] || email[0] || "S").toUpperCase();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-secondary selection:text-secondary-foreground flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-6 h-6" />
            </Button>
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-primary-foreground w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-serif tracking-tight text-primary hidden lg:inline-block whitespace-nowrap">
                Central Global
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 mx-2">
            {navItems.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-2.5 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "text-primary bg-primary/10 font-semibold after:absolute after:left-3 after:right-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 max-w-[200px]">
              <div className="w-8 h-8 rounded-full bg-secondary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {initial}
              </div>
              <span className="hidden xl:inline text-sm font-medium text-muted-foreground truncate">
                {email}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut(() => setLocation("/"))}>
              <LogOut className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden">
          <div className="px-4 h-16 flex justify-between items-center border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-primary-foreground w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-serif tracking-tight text-primary">
                Central Global
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X className="w-6 h-6" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            {navItems.map(item => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-base">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {initial}
              </div>
              <span className="text-sm font-medium text-muted-foreground truncate">{email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut(() => setLocation("/"))}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <ChatWidget />
    </div>
  );
}
