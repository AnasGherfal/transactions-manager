"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);
    if (!email || !password) {
      setMessage("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Account created. Check your email (if confirmation is enabled), then try logging in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Logged in successfully. You can now go to /companies.");
      }
    } catch (err: any) {
      setMessage(err.message || "Auth failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {mode === "login" ? "Log in" : "Create account"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          {message && (
            <p className="text-sm text-red-500 whitespace-pre-line">
              {message}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() =>
              setMode((m) => (m === "login" ? "register" : "login"))
            }
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Already have an account? Log in"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
