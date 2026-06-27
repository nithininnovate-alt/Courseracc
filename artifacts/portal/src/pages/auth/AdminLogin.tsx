import { useState } from "react";
import { useLocation } from "wouter";
import { useStaffLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useStaffLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { username, password } }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Logged in successfully" });
        setLocation("/admin");
      },
      onError: () => {
        toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 font-sans">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Globe className="text-primary-foreground w-8 h-8" />
        </div>
        <span className="text-3xl font-bold font-serif tracking-tight text-primary">
          Central Global
        </span>
      </div>

      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-2xl font-serif text-primary">Staff Portal</CardTitle>
          <CardDescription>Enter your credentials to access the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={login.isPending}>
              {login.isPending ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}