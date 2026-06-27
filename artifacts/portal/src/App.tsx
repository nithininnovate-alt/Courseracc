import React, { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ChevronRight, PlayCircle, BookOpen, Award, Globe, Users, ArrowRight, CheckCircle2, Menu, X, MonitorPlay, GraduationCap, Clock, HelpCircle, Laptop } from "lucide-react";

import heroImg from "./assets/hero.png";
import course1Img from "./assets/course1.png";
import course2Img from "./assets/course2.png";
import course3Img from "./assets/course3.png";
import testimonialImg from "./assets/testimonial.png";
import faculty1Img from "./assets/faculty1.png";
import platformImg from "./assets/platform.png";

const queryClient = new QueryClient();

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-secondary selection:text-secondary-foreground">
      {/* 1. Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/90 backdrop-blur-lg shadow-sm py-4 border-b border-border/50' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Globe className="text-primary-foreground w-6 h-6" />
            </div>
            <span className={`text-2xl font-bold font-serif tracking-tight text-primary`}>
              Central Global
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#programs" className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">Programs</a>
            <a href="#platform" className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">Platform</a>
            <a href="#faculty" className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">Faculty</a>
            <a href="#about" className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">About</a>
            <div className="flex items-center gap-4 ml-4">
              <Button variant="ghost" className="font-semibold hover:bg-primary/5 hover:text-primary">Log In</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20">Apply Now</Button>
            </div>
          </nav>

          <button className="md:hidden text-foreground p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-24 px-6 border-b border-border">
          <div className="flex flex-col gap-6 text-lg">
            <a href="#programs" className="font-serif font-bold text-2xl text-primary" onClick={() => setMobileMenuOpen(false)}>Programs</a>
            <a href="#platform" className="font-serif font-bold text-2xl text-primary" onClick={() => setMobileMenuOpen(false)}>Platform</a>
            <a href="#faculty" className="font-serif font-bold text-2xl text-primary" onClick={() => setMobileMenuOpen(false)}>Faculty</a>
            <a href="#about" className="font-serif font-bold text-2xl text-primary" onClick={() => setMobileMenuOpen(false)}>About</a>
            <hr className="my-4 border-border" />
            <Button variant="outline" size="lg" className="w-full justify-center border-primary/20 text-primary">Log In</Button>
            <Button size="lg" className="w-full justify-center bg-primary text-primary-foreground">Apply Now</Button>
          </div>
        </div>
      )}

      <main className="flex-grow pt-24">
        {/* 2. Hero Section */}
        <section className="relative pt-12 pb-24 md:pt-24 md:pb-32 overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3"></div>
          
          <div className="container mx-auto px-6 md:px-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="max-w-2xl">
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-yellow-800 dark:text-yellow-500 text-sm font-bold mb-8 border border-secondary/30">
                  <Award className="w-4 h-4" />
                  <span>World-Class Online Education</span>
                </motion.div>
                <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-serif font-bold text-primary leading-[1.1] mb-6">
                  Advance Your Career, <br/>
                  <span className="text-foreground">From Anywhere.</span>
                </motion.h1>
                <motion.p variants={fadeIn} className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg">
                  Earn your degree from a globally recognized university. Join a community of innovators, leaders, and thinkers shaping the future.
                </motion.p>
                <motion.div variants={fadeIn} className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base h-14 px-8 shadow-xl shadow-primary/20 rounded-xl">
                    Explore Programs <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="text-base h-14 px-8 border-primary/20 hover:bg-primary/5 text-primary rounded-xl backdrop-blur-sm">
                    <PlayCircle className="mr-2 w-5 h-5" /> Watch Video
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }} className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-tr from-secondary/40 to-primary/20 rounded-[2.5rem] transform translate-x-6 translate-y-6"></div>
                <img src={heroImg} alt="Student learning in library" className="relative rounded-[2.5rem] shadow-2xl object-cover w-full h-[650px] border-4 border-white/50 dark:border-gray-800/50" />
                
                {/* Floating stats card */}
                <div className="absolute -bottom-8 -left-8 bg-card/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl max-w-[220px] border border-border">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Users className="text-green-600 dark:text-green-400 w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-2xl text-primary">50k+</h4>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Students</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. Stats / Trust Section */}
        <section className="py-16 bg-primary text-primary-foreground relative overflow-hidden">
          {/* Subtle pattern overlay */}
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
        <section id="about" className="py-32 bg-muted/30">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">The Global Standard for Online Learning</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">We combine the academic rigor of a traditional top-tier university with the flexibility of modern technology to provide an unparalleled learning experience.</p>
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
        <section id="platform" className="py-32">
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

        {/* 6. Featured Programs */}
        <section id="programs" className="py-32 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">Featured Programs</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">Discover our most popular degree programs designed to accelerate your career in today's most demanding fields.</p>
              </div>
              <Button variant="outline" className="h-12 px-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl">
                View All Programs <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { img: course1Img, title: "Master of Computer Science", category: "Technology", duration: "18-24 Months", credits: "36 Credits" },
                { img: course2Img, title: "Master of Business Administration", category: "Business", duration: "12-18 Months", credits: "42 Credits" },
                { img: course3Img, title: "B.S. in Data Analytics", category: "Data Science", duration: "3-4 Years", credits: "120 Credits" }
              ].map((program, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group cursor-pointer rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-2xl hover:border-primary/30 transition-all duration-500 flex flex-col">
                  <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                    <img src={program.img} alt={program.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-primary uppercase tracking-wider z-20 shadow-sm">
                      {program.category}
                    </div>
                  </div>
                  <div className="p-8 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold text-primary mb-4 font-serif group-hover:text-secondary transition-colors leading-snug">{program.title}</h3>
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
        <section id="faculty" className="py-32">
          <div className="container mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">Learn from World-Renowned Experts</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">Our online programs are taught by the same distinguished faculty who teach on our physical campus. You'll learn directly from industry leaders, active researchers, and award-winning educators.</p>
                <Button variant="outline" className="h-12 px-6 border-primary/20 text-primary hover:bg-primary/5 rounded-xl">
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
              {/* Decorative rings */}
              <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 border-[20px] border-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6">Ready to Take the Next Step?</h2>
                <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">Join thousands of students worldwide who are transforming their lives through world-class education at Central Global University.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-16 px-10 rounded-xl shadow-xl shadow-primary/20">
                    Start Your Application
                  </Button>
                  <Button size="lg" variant="outline" className="bg-background text-primary border-primary/20 hover:bg-muted text-lg h-16 px-10 rounded-xl">
                    Request Information
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-20 border-t border-gray-900">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center border border-secondary/30">
                  <Globe className="text-secondary w-6 h-6" />
                </div>
                <span className="text-2xl font-bold font-serif text-white tracking-tight">
                  Central Global
                </span>
              </div>
              <p className="max-w-sm mb-8 leading-relaxed text-gray-500">Empowering global learners with accessible, high-quality education to shape the future of our world. Excellence without borders.</p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-400 border border-gray-800">in</div>
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-400 border border-gray-800">tw</div>
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-400 border border-gray-800">fb</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Academics</h4>
              <ul className="space-y-4 text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Degree Programs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certificates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Short Courses</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Faculty Directory</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Admissions</h4>
              <ul className="space-y-4 text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Apply Now</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tuition & Aid</a></li>
                <li><a href="#" className="hover:text-white transition-colors">International</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">University</h4>
              <ul className="space-y-4 text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">News & Events</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Alumni Network</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} Central Global University. All rights reserved.</p>
            <div className="flex gap-8">
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={Home} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
