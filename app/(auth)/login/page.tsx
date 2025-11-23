"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  TrendingUp,
  LayoutDashboard 
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  
  // State
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.refresh();
        router.push("/");
      } else {
        // --- REGISTER LOGIC ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        
        setSuccessMsg("Account created! Check your email to confirm.");
        setMode("login"); 
      }
    } catch (error: any) {
      console.error("Auth error:", error.message);
      setErrorMsg(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      {/* LEFT SIDE - FINTECH BRANDING (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-10 text-white dark:border-r">
        <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <CreditCard className="h-6 w-6" />
          </div>
          <span>CardFlow Manager</span>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-tight">
              Control your distribution.<br />
              Track every penny.
            </h2>
            <p className="text-slate-400 text-lg">
              The complete solution for managing prepaid card inventory, 
              merchant partners, and financial reconciliation.
            </p>
          </div>

          <blockquote className="space-y-2 border-l-2 border-blue-600 pl-6 italic text-slate-300">
            <p>
              &ldquo;Finally, a system that matches exact order values with 
              incoming payments. We have total clarity on our merchant balances now.&rdquo;
            </p>
            <footer className="text-sm font-semibold text-white not-italic">
              — Financial Operations Team
            </footer>
          </blockquote>
        </div>
        
        <div className="flex gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <LayoutDashboard className="h-3 w-3" /> Dashboard
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Analytics
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> Secure
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-background">
        <Card className="w-full max-w-[400px] border-0 shadow-xl sm:border sm:shadow-sm">
          <CardHeader className="space-y-1 text-center sm:text-left">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === "login" ? "Financial Portal" : "Partner Access"}
            </CardTitle>
            <CardDescription>
              {mode === "login" 
                ? "Sign in to access your dashboard and reports" 
                : "Create a secure account to start tracking"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* ERROR MESSAGE */}
              {errorMsg && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* SUCCESS MESSAGE */}
              {successMsg && (
                <div className="p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    placeholder="admin@company.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button 
                      type="button"
                      className="text-xs text-blue-600 underline-offset-4 hover:underline"
                      onClick={() => alert("Contact admin for password reset")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-white"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button className="w-full bg-slate-900 hover:bg-slate-800" type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Access Dashboard" : "Register Account"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-muted-foreground">
                  Authorized Personnel Only
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center">
            <div className="text-sm text-muted-foreground">
              {mode === "login" ? "New system user? " : "Already have credentials? "}
              <button
                className="text-blue-600 font-medium underline-offset-4 transition-colors hover:underline"
                onClick={toggleMode}
              >
                {mode === "login" ? "Request Access" : "Log in"}
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}