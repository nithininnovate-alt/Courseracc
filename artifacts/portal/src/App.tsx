import React, { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, ChevronLeft, PlayCircle, BookOpen, Award, Globe, Users, ArrowRight, CheckCircle2, Menu, X, MonitorPlay, GraduationCap, Clock, HelpCircle, Laptop, Briefcase, LineChart, Megaphone, Lightbulb } from "lucide-react";
import { setExtraHeadersGetter } from "@workspace/api-client-react";
import { ClerkProvider, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

import slide1Img from "./assets/slide1.jpg";
import slide2Img from "./assets/slide2.jpg";
import slide3Img from "./assets/slide3.jpg";
import cguLogo from "@assets/cropped-cgu_logo-768x244_1782643160003.png";
import course1Img from "./assets/course1.png";
import course2Img from "./assets/course2.png";
import course3Img from "./assets/course3.png";
import testimonialImg from "./assets/testimonial.png";
import faculty1Img from "./assets/faculty1.png";
import platformImg from "./assets/platform.png";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import SignInPage from "@/pages/auth/SignIn";
import SignUpPage from "@/pages/auth/SignUp";
import AdminLoginPage from "@/pages/auth/AdminLogin";
import StudentDashboard from "@/pages/student/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import NotFound from "@/pages/not-found";
import ApplyPage from "@/pages/Apply";
import StudentCourses from "@/pages/student/Courses";
import StudentLearning from "@/pages/student/Learning";
import StudentCourseLearning from "@/pages/student/CourseLearning";
import StudentAssignments from "@/pages/student/Assignments";
import StudentPayments from "@/pages/student/Payments";
import StudentCertificates from "@/pages/student/Certificates";
import StudentApplications from "@/pages/student/Applications";
import StudentProfile from "@/pages/student/Profile";
import AdminApplications from "@/pages/admin/Applications";
import AdminCourses from "@/pages/admin/Courses";
import AdminCourseBuilder from "@/pages/admin/CourseBuilder";
import AdminStudents from "@/pages/admin/Students";
import AdminAssignments from "@/pages/admin/Assignments";
import AdminPayments from "@/pages/admin/Payments";
import AdminCertificates from "@/pages/admin/Certificates";
import AdminNewsletters from "@/pages/admin/Newsletters";
import AdminPartnerCenters from "@/pages/admin/PartnerCenters";
import AdminEmails from "@/pages/admin/Emails";
import AdminCourier from "@/pages/admin/Courier";
import AdminReports from "@/pages/admin/Reports";

// On Replit-managed hosting, Clerk keys are provisioned per-domain, so the
// key is derived from the current hostname. When self-hosting on a custom
// domain, that derivation produces a wrong Frontend API (e.g.
// clerk.lms.example.com when the instance lives at clerk.example.com), so we
// use the configured key literally on non-Replit hosts.
const REPLIT_HOST_RE = /(\.replit\.app|\.replit\.dev|\.repl\.co)$/i;
const envClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey =
  envClerkKey && !REPLIT_HOST_RE.test(window.location.hostname)
    ? envClerkKey
    : publishableKeyFromHost(window.location.hostname, envClerkKey);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL || "/";

// Tag API requests originating from the admin console so the server prefers
// the staff session when both a staff cookie and a Clerk session exist. The
// header alone grants nothing — a valid staff cookie is still required.
setExtraHeadersGetter(() =>
  window.location.pathname.startsWith(`${basePath.replace(/\/$/, "")}/admin`)
    ? { "x-portal": "admin" }
    : null,
);

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath,
    logoImageUrl: `${window.location.origin}${import.meta.env.BASE_URL}logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(262, 30%, 32%)",
    colorForeground: "hsl(262, 25%, 18%)",
    colorMutedForeground: "hsl(262, 12%, 44%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "hsl(262, 25%, 18%)",
    colorNeutral: "hsl(262, 14%, 30%)",
    fontFamily: "'Source Sans 3', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    cardBox: { width: "440px", maxWidth: "100%" },
    headerTitle: { fontFamily: "'Roboto Slab', serif", fontWeight: 700 },
  },
};

const CGU_NAME = "Central Global University";
const CGU_CONTINUE = `to continue to ${CGU_NAME}`;

// Override every Clerk sign-in/sign-up string that would otherwise render the
// Clerk instance application name ("Coursera Clone") so applicants only ever
// see "Central Global University" on the sign-in screen and its sub-steps.
const clerkLocalization = {
  signIn: {
    start: {
      title: `Welcome to ${CGU_NAME}`,
      subtitle: "Sign in to access your student portal",
    },
    emailCode: { title: "Check your email", subtitle: CGU_CONTINUE },
    emailLink: { title: "Check your email", subtitle: CGU_CONTINUE },
    password: { title: "Enter your password", subtitle: CGU_CONTINUE },
    phoneCode: { title: "Check your phone", subtitle: CGU_CONTINUE },
    alternativeMethods: { subtitle: CGU_CONTINUE },
    forgotPassword: { subtitle_email: CGU_CONTINUE, subtitle_phone: CGU_CONTINUE },
  },
  signUp: {
    start: {
      title: "Create your CGU account",
      subtitle: `Begin your journey with ${CGU_NAME}`,
    },
    emailCode: { title: "Verify your email", subtitle: CGU_CONTINUE },
    emailLink: { title: "Verify your email", subtitle: CGU_CONTINUE },
    phoneCode: { title: "Verify your phone", subtitle: CGU_CONTINUE },
    continue: { title: "Fill in missing fields", subtitle: CGU_CONTINUE },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

type HeroSlide = {
  img: string;
  eyebrow: string;
  title: string;
  text: string;
  primary: { label: string; to?: string; section?: string };
};

const heroSlides: HeroSlide[] = [
  {
    img: slide1Img,
    eyebrow: "Shape Your Tomorrow",
    title: "Earn the Degree That Defines You",
    text: "Discover flexible degree programs designed to fit your goals and lifestyle. Start your journey toward a future built on knowledge, confidence, and purpose.",
    primary: { label: "Apply Now", to: "/apply" },
  },
  {
    img: slide2Img,
    eyebrow: "ACBSP Candidacy Programs",
    title: "Globally Respected Business Degrees",
    text: "Our candidacy programs prepare future leaders with internationally recognized BBA, MBA, and DBA degrees that open doors across industries and continents.",
    primary: { label: "Explore Programs", section: "programs" },
  },
  {
    img: slide3Img,
    eyebrow: "A Global University for a Global Era",
    title: "Study 100% Online, From Anywhere",
    text: "Flexible, US-accredited programs designed around your career, your schedule, and your ambitions.",
    primary: { label: "Get Started", to: "/apply" },
  },
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [, setLocation] = useLocation();
  const count = heroSlides.length;

  const go = (dir: number) => setCurrent((c) => (c + dir + count) % count);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  const slide = heroSlides[current];

  return (
    <section className="relative h-[88vh] min-h-[560px] max-h-[820px] w-full overflow-hidden bg-[#1a1a2e]">
      {heroSlides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === current ? "opacity-100" : "opacity-0"}`}
          aria-hidden={i !== current}
        >
          <img
            src={s.img}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-[7000ms] ease-out ${i === current ? "scale-110" : "scale-100"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
        </div>
      ))}

      <div className="relative z-10 h-full container mx-auto px-6 md:px-12 flex items-center">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-2xl pt-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs sm:text-sm font-bold mb-6 border border-white/20">
            <Award className="w-4 h-4" />
            <span>{slide.eyebrow}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-5 drop-shadow-sm">
            {slide.title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-xl">
            {slide.text}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base h-14 px-8 shadow-xl rounded-xl"
              onClick={() => {
                if (slide.primary.section) {
                  document
                    .getElementById(slide.primary.section)
                    ?.scrollIntoView({ behavior: "smooth" });
                } else if (slide.primary.to) {
                  setLocation(slide.primary.to);
                }
              }}
            >
              {slide.primary.label} <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-14 px-8 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white rounded-xl backdrop-blur-sm"
              onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
            >
              <PlayCircle className="mr-2 w-5 h-5" /> Watch Video
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Arrows */}
      <button
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white hidden sm:flex items-center justify-center transition-colors border border-white/20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next slide"
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white hidden sm:flex items-center justify-center transition-colors border border-white/20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
          />
        ))}
      </div>
    </section>
  );
}

function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-secondary selection:text-secondary-foreground">
      {/* 1. Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/90 backdrop-blur-lg shadow-sm py-4 border-b border-border/50' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => setLocation('/')}>
            <img
              src={cguLogo}
              alt="Central Global University"
              className={`h-10 md:h-12 w-auto transition-all duration-300 ${isScrolled ? '' : 'brightness-0 invert drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'}`}
            />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }} className={`text-sm font-semibold transition-colors cursor-pointer ${isScrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/90 hover:text-white'}`}>Programs</a>
            <a href="#platform" onClick={(e) => { e.preventDefault(); scrollToSection('platform'); }} className={`text-sm font-semibold transition-colors cursor-pointer ${isScrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/90 hover:text-white'}`}>Platform</a>
            <a href="#faculty" onClick={(e) => { e.preventDefault(); scrollToSection('faculty'); }} className={`text-sm font-semibold transition-colors cursor-pointer ${isScrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/90 hover:text-white'}`}>Faculty</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} className={`text-sm font-semibold transition-colors cursor-pointer ${isScrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/90 hover:text-white'}`}>About</a>
            <div className="flex items-center gap-4 ml-4">
              <Button variant="ghost" className={`font-semibold ${isScrolled ? 'hover:bg-primary/5 hover:text-primary' : 'text-white hover:bg-white/10 hover:text-white'}`} onClick={() => setLocation('/sign-in')}>Log In</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20" onClick={() => setLocation('/apply')}>Apply Now</Button>
            </div>
          </nav>

          <button className={`md:hidden p-2 ${isScrolled || mobileMenuOpen ? 'text-foreground' : 'text-white'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-24 px-6 border-b border-border">
          <div className="flex flex-col gap-6 text-lg">
            <a href="#programs" className="font-serif font-bold text-2xl text-primary" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToSection('programs'); }}>Programs</a>
            <a href="#platform" className="font-serif font-bold text-2xl text-primary" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToSection('platform'); }}>Platform</a>
            <a href="#faculty" className="font-serif font-bold text-2xl text-primary" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToSection('faculty'); }}>Faculty</a>
            <a href="#about" className="font-serif font-bold text-2xl text-primary" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToSection('about'); }}>About</a>
            <hr className="my-4 border-border" />
            <Button variant="outline" size="lg" className="w-full justify-center border-primary/20 text-primary" onClick={() => { setMobileMenuOpen(false); setLocation('/sign-in'); }}>Log In</Button>
            <Button size="lg" className="w-full justify-center bg-primary text-primary-foreground" onClick={() => { setMobileMenuOpen(false); setLocation('/apply'); }}>Apply Now</Button>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {/* 2. Hero Slider */}
        <HeroSlider />

        {/* Trusted-by strip */}
        <section className="py-10 border-b border-border bg-muted/30">
          <div className="container mx-auto px-6 md:px-12">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              Trusted by learners and employers in 150+ countries
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 md:gap-x-12 gap-y-4 text-lg md:text-xl font-bold text-muted-foreground/60">
              <span>Northbridge</span>
              <span>Veltrix</span>
              <span>Quantum&nbsp;Labs</span>
              <span>Meridian</span>
              <span>Aerolink</span>
              <span>Helios&nbsp;Group</span>
            </div>
          </div>
        </section>

        {/* 3. Stats / Trust Section */}
        <section className="py-16 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          <div className="container mx-auto px-6 md:px-12 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center divide-x divide-primary-foreground/10">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <h3 className="text-5xl font-serif font-bold text-secondary mb-3">120+</h3>
                <p className="text-primary-foreground/80 font-medium tracking-wide uppercase text-sm">Online Degrees</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <h3 className="text-5xl font-serif font-bold text-secondary mb-3">Top 50</h3>
                <p className="text-primary-foreground/80 font-medium tracking-wide uppercase text-sm">Global Ranking</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                <h3 className="text-5xl font-serif font-bold text-secondary mb-3">94%</h3>
                <p className="text-primary-foreground/80 font-medium tracking-wide uppercase text-sm">Employment Rate</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
                <h3 className="text-5xl font-serif font-bold text-secondary mb-3">150+</h3>
                <p className="text-primary-foreground/80 font-medium tracking-wide uppercase text-sm">Countries</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 4. Why Choose Us */}
        <section id="about" className="py-32 bg-muted/30 scroll-mt-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">A Global University for a Global Era</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">Central Global University is a hub for academic excellence, innovation, and global engagement — empowering students with the knowledge, skills, and opportunities to thrive in an interconnected world.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <BookOpen className="w-8 h-8 text-primary" />, title: "Rigorous Curriculum", desc: "Our programs are designed by industry experts and world-renowned faculty to ensure you learn the most relevant, future-proof skills." },
                { icon: <MonitorPlay className="w-8 h-8 text-primary" />, title: "Interactive Platform", desc: "Engage with high-definition video lectures, interactive assignments, and real-time collaboration tools designed for adult learners." },
                { icon: <Award className="w-8 h-8 text-primary" />, title: "Accredited Degrees", desc: "Earn a fully accredited degree that holds the exact same weight, prestige, and alumni benefits as an on-campus qualification." }
              ].map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="bg-card border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full rounded-2xl group">
                    <CardContent className="p-10">
                      <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-primary mb-4 font-serif">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Platform Showcase */}
        <section id="platform" className="py-32 scroll-mt-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-secondary/20 rounded-3xl transform -translate-x-4 translate-y-4"></div>
                  <img src={platformImg} alt="Online Learning Platform" className="relative rounded-3xl shadow-2xl border border-border" />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-1 lg:order-2">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">A Campus in the Cloud</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">Our proprietary learning platform is designed specifically for online education, providing everything you need to succeed without the friction of traditional classroom management software.</p>
                
                <ul className="space-y-6">
                  {[
                    { icon: <Laptop className="w-5 h-5" />, title: "Learn on any device", text: "Seamlessly switch between your phone, tablet, and laptop." },
                    { icon: <Clock className="w-5 h-5" />, title: "Asynchronous lectures", text: "Watch high-quality video content on your own schedule." },
                    { icon: <HelpCircle className="w-5 h-5" />, title: "24/7 Academic support", text: "Access tutoring and technical support whenever you need it." }
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex flex-shrink-0 items-center justify-center text-primary mt-1">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-primary">{item.title}</h4>
                        <p className="text-muted-foreground">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Browse Top Categories */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-5">Browse Top Categories</h2>
              <p className="text-lg text-muted-foreground">Explore the fields driving tomorrow's careers and find the program that fits your ambition.</p>
            </div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {[
                { icon: <Briefcase className="w-7 h-7" />, label: "Management" },
                { icon: <LineChart className="w-7 h-7" />, label: "Finance & Accounting" },
                { icon: <Megaphone className="w-7 h-7" />, label: "Marketing" },
                { icon: <Lightbulb className="w-7 h-7" />, label: "Entrepreneurship" },
                { icon: <Globe className="w-7 h-7" />, label: "International Business" },
                { icon: <Users className="w-7 h-7" />, label: "Leadership & Strategy" },
              ].map((cat, i) => (
                <motion.button key={i} variants={fadeIn} onClick={() => setLocation('/apply')} className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-accent text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {cat.icon}
                  </div>
                  <span className="text-sm font-bold text-foreground text-center leading-tight">{cat.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* 6. Featured Programs */}
        <section id="programs" className="py-32 bg-muted/30 border-y border-border/50 scroll-mt-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">Featured Programs</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">Discover our most popular degree programs designed to accelerate your career in today's most demanding fields.</p>
              </div>
              <Button variant="outline" className="h-12 px-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl" onClick={() => setLocation('/apply')}>
                View All Programs <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { img: course1Img, title: "Bachelor of Business Administration", category: "Undergraduate", duration: "3–4 Years", credits: "ACBSP Candidate" },
                { img: course2Img, title: "Master of Business Administration", category: "Graduate", duration: "12–18 Months", credits: "Strategic Leadership" },
                { img: course3Img, title: "Doctor of Business Administration", category: "Doctorate", duration: "3–4 Years", credits: "Research & Practice" }
              ].map((program, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} role="button" tabIndex={0} onClick={() => setLocation('/apply')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLocation('/apply'); } }} className="group cursor-pointer rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-2xl hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-500 flex flex-col">
                  <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                    <img src={program.img} alt={program.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-primary uppercase tracking-wider z-20 shadow-sm">
                      {program.category}
                    </div>
                  </div>
                  <div className="p-8 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold text-primary mb-4 font-serif group-hover:text-primary/80 transition-colors leading-snug">{program.title}</h3>
                    <div className="flex flex-col gap-2 mb-8 text-sm text-muted-foreground flex-grow">
                      <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 100% Online</span>
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary/50" /> {program.duration}</span>
                      <span className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary/50" /> {program.credits}</span>
                    </div>
                    <div className="flex items-center text-primary font-bold group-hover:gap-3 transition-all border-t border-border pt-4">
                      Program Details <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Faculty Spotlight */}
        <section id="faculty" className="py-32 scroll-mt-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">Learn from World-Renowned Experts</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">Our online programs are taught by the same distinguished faculty who teach on our physical campus. You'll learn directly from industry leaders, active researchers, and award-winning educators.</p>
                <Button variant="outline" className="h-12 px-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl" onClick={() => setLocation('/apply')}>
                  Meet Our Faculty
                </Button>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
                 <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform translate-x-4 -translate-y-4"></div>
                 <div className="relative bg-card rounded-[3rem] p-4 border border-border shadow-xl">
                   <img src={faculty1Img} alt="Professor" className="rounded-[2.5rem] w-full h-[400px] object-cover" />
                   <div className="absolute bottom-10 left-10 right-10 bg-background/95 backdrop-blur-xl p-6 rounded-2xl border border-border shadow-lg">
                     <h4 className="font-serif font-bold text-xl text-primary">Dr. Robert Chen</h4>
                     <p className="text-sm text-muted-foreground mb-2">Chair of Computer Science</p>
                     <p className="text-xs text-primary/70 italic">Former Lead AI Researcher at Tech Innovations Inc.</p>
                   </div>
                 </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8. Testimonials */}
        <section className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="container mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Student Success Stories</h2>
              <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">Hear from our alumni who have transformed their careers through our online programs.</p>
            </div>
            
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto bg-card/10 backdrop-blur-xl border border-primary-foreground/10 rounded-[3rem] p-10 md:p-16 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-10 items-center">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-secondary/50 shadow-xl relative">
                    <img src={testimonialImg} alt="Sarah Jenkins" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <div className="text-secondary mb-6 flex gap-1">
                    {[1,2,3,4,5].map(star => <span key={star} className="text-xl">★</span>)}
                  </div>
                  <p className="text-xl md:text-3xl font-serif leading-relaxed mb-8 text-primary-foreground/90 font-medium">"The flexibility of the online Master's program allowed me to continue working full-time while advancing my education. The curriculum was immediately applicable to my job, and I received a promotion before even graduating."</p>
                  <div>
                    <h4 className="font-bold text-xl text-secondary">Sarah Jenkins</h4>
                    <p className="text-primary-foreground/60 tracking-wide uppercase text-sm mt-1">MBA Graduate, Class of 2023</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 9. CTA */}
        <section className="py-32">
          <div className="container mx-auto px-6 md:px-12">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-muted to-background rounded-[3rem] p-12 md:p-24 text-center max-w-5xl mx-auto border border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 border-[20px] border-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6">Ready to Take the Next Step?</h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">Join thousands of students worldwide who are advancing their careers with a degree from Central Global University.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-16 px-10 shadow-xl shadow-primary/20 rounded-xl" onClick={() => setLocation('/apply')}>
                    Apply Now <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground py-16 border-t border-primary-foreground/10">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-6">
                <img src={cguLogo} alt="Central Global University" className="h-12 w-auto brightness-0 invert" />
              </div>
              <p className="text-primary-foreground/70 max-w-sm mb-6 leading-relaxed">Empowering the next generation of leaders through accessible, world-class online education.</p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Academics</h4>
              <ul className="space-y-3 text-primary-foreground/70">
                <li><a href="#" className="hover:text-white transition-colors">Master's Degrees</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bachelor's Degrees</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certificates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bootcamps</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6 text-white">University</h4>
              <ul className="space-y-3 text-primary-foreground/70">
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#faculty" className="hover:text-white transition-colors">Faculty</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><Link href="/admin/login" className="hover:text-white transition-colors">Staff Login</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-primary-foreground/60 text-sm">
            <p>© {new Date().getFullYear()} Central Global University. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ClerkHomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        setLocation("/portal");
      }
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Home />;
  return null;
}

// Clears all cached API data whenever the signed-in Clerk user changes so a
// new sign-in never sees the previous user's cached dashboard/data.
function QueryCacheUserSync() {
  const { isLoaded, user } = useUser();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const currentUserId = user?.id ?? null;
    if (previousUserId.current === undefined) {
      previousUserId.current = currentUserId;
      return;
    }
    if (previousUserId.current !== currentUserId) {
      previousUserId.current = currentUserId;
      queryClient.clear();
    }
  }, [isLoaded, user?.id]);

  return null;
}

function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  // Redirect instead of rendering SignInPage inline: Clerk's <SignIn> uses
  // path routing and will not render when the URL doesn't match /sign-in.
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
    >
      <QueryClientProvider client={queryClient}>
        <QueryCacheUserSync />
        <WouterRouter base={basePath}>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Switch>
                <Route path="/" component={ClerkHomeRedirect} />
                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                {/* Common URL aliases */}
                <Route path="/signin"><Redirect to="/sign-in" /></Route>
                <Route path="/login"><Redirect to="/sign-in" /></Route>
                <Route path="/signup"><Redirect to="/sign-up" /></Route>
                <Route path="/register"><Redirect to="/sign-up" /></Route>
                <Route path="/admin/login" component={AdminLoginPage} />
                <Route path="/apply">
                  <RequireSignedIn>
                    <ApplyPage />
                  </RequireSignedIn>
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/*?">
                  <AdminLayout>
                    <Switch>
                      <Route path="/admin" component={AdminDashboard} />
                      <Route path="/admin/applications" component={AdminApplications} />
                      <Route path="/admin/courses" component={AdminCourses} />
                      <Route path="/admin/courses/:id" component={AdminCourseBuilder} />
                      <Route path="/admin/students" component={AdminStudents} />
                      <Route path="/admin/assignments" component={AdminAssignments} />
                      <Route path="/admin/payments" component={AdminPayments} />
                      <Route path="/admin/certificates" component={AdminCertificates} />
                      <Route path="/admin/newsletters" component={AdminNewsletters} />
                      <Route path="/admin/partners" component={AdminPartnerCenters} />
                      <Route path="/admin/emails" component={AdminEmails} />
                      <Route path="/admin/courier" component={AdminCourier} />
                      <Route path="/admin/reports" component={AdminReports} />
                      <Route component={NotFound} />
                    </Switch>
                  </AdminLayout>
                </Route>

                {/* Student Portal Routes */}
                <Route path="/portal/*?">
                  <RequireSignedIn>
                    <StudentLayout>
                      <Switch>
                        <Route path="/portal" component={StudentDashboard} />
                        <Route path="/portal/courses" component={StudentCourses} />
                        <Route path="/portal/learning" component={StudentLearning} />
                        <Route path="/portal/learning/:id" component={StudentCourseLearning} />
                        <Route path="/portal/assignments" component={StudentAssignments} />
                        <Route path="/portal/payments" component={StudentPayments} />
                        <Route path="/portal/certificates" component={StudentCertificates} />
                        <Route path="/portal/applications" component={StudentApplications} />
                        <Route path="/portal/profile" component={StudentProfile} />
                        <Route component={NotFound} />
                      </Switch>
                    </StudentLayout>
                  </RequireSignedIn>
                </Route>

                <Route component={NotFound} />
              </Switch>
            </div>
            <Toaster />
          </TooltipProvider>
        </WouterRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}