"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  fetchCurrentUser,
  loginWithPassword,
  registerWithPassword,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Shield,
  Zap,
} from "lucide-react";

type AuthStep = "role" | "login";
type AuthMode = "signin" | "signup";

type RoleOption = "student" | "teacher" | "admin";

const roleLabels: Record<RoleOption, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

const demoCredentials: Record<
  RoleOption,
  Array<{ label: string; email: string; password: string }>
> = {
  admin: [{ label: "Principal", email: "admin@jpee.com", password: "admin12345" }],
  teacher: [
    { label: "Dr. Sharma", email: "sharma@example.com", password: "password123" },
    { label: "Dr. Gupta", email: "gupta@example.com", password: "password123" },
    { label: "Prof. Verma", email: "verma@example.com", password: "password123" },
  ],
  student: [
    { label: "Rahul Kumar", email: "rahul@example.com", password: "password123" },
    { label: "Priya Singh", email: "priya@example.com", password: "password123" },
    { label: "Amit Verma", email: "amit@example.com", password: "password123" },
  ],
};

export function AuthScreen() {
  const {
    navigate,
    setRole,
    setUserId,
    setUserEmail,
    setUserName,
    setTeacherSubject,
    setStudentYear,
    setAuthToken,
    setRefreshToken,
    clearAuth,
  } = useApp();

  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<AuthStep>("role");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState<"Physics" | "Chemistry" | "Mathematics">("Physics");
  const [year, setYear] = useState<"11th" | "12th">("12th");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    if (mode === "signup") {
      setName("");
      setEmail("");
      setPassword("");
      return;
    }

    const firstDemo = demoCredentials[selectedRole][0];
    setEmail(firstDemo.email);
    setPassword(firstDemo.password);
  }, [mode, selectedRole]);

  const applyDemoCredentials = (entry: { email: string; password: string }) => {
    setEmail(entry.email);
    setPassword(entry.password);
    setAuthError(null);
  };

  const handleRoleSelect = (role: RoleOption) => {
    setSelectedRole(role);
    setMode("signin");
    setName("");
    setSubject("Physics");
    setYear("12th");
    setAuthError(null);
    setStep("login");
  };

  const handleBack = () => {
    if (step === "login") {
      setStep("role");
      setMode("signin");
      setName("");
      setAuthError(null);
      setPassword("");
    }
  };

  const handleLogin = async () => {
    if (!selectedRole || isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setAuthError("Email and password are required.");
      return;
    }
    if (mode === "signup") {
      if (selectedRole === "admin") {
        setAuthError("Admin signup is disabled. Sign in with an existing admin account.");
        return;
      }
      if (!name.trim()) {
        setAuthError("Full name is required.");
        return;
      }
      if (password.trim().length < 8) {
        setAuthError("Password must be at least 8 characters.");
        return;
      }
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      const tokens =
        mode === "signin"
          ? await loginWithPassword({
            email: normalizedEmail,
            password,
          })
          : await registerWithPassword({
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: selectedRole === "teacher" ? "teacher" : "student",
            subject: selectedRole === "teacher" ? subject : undefined,
            year: selectedRole === "student" ? year : undefined,
          });

      const me = await fetchCurrentUser(tokens.access_token);
      if (me.role !== selectedRole) {
        setAuthError(`This account is \"${me.role}\", not \"${selectedRole}\".`);
        return;
      }

      clearAuth();
      setRole(me.role);
      setUserId(me.id);
      setUserEmail(me.email);
      setUserName(me.name);
      setTeacherSubject(me.subject ?? null);
      setStudentYear(me.year ?? null);
      setAuthToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);

      navigate(
        me.role === "admin"
          ? "admin-dashboard"
          : me.role === "teacher"
            ? "teacher-home"
            : "student-home",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setAuthError(error.detail);
      } else {
        setAuthError("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <div className="flex items-center justify-between px-6 pt-12">
        <div className="flex items-center gap-2">
          {step !== "role" && (
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted/50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-base font-bold tracking-tight">
            JEE Prep Master
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-10">
        {step === "role" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome Friend
              </h1>
              <p className="text-sm text-muted-foreground">
                Let's get started on your journey today
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Label className="text-sm font-semibold text-foreground/90">
                I am a...
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  onClick={() => handleRoleSelect("student")}
                  className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95 shadow-sm group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <GraduationCap className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-sm font-bold">Student</span>
                </button>

                <button
                  onClick={() => handleRoleSelect("teacher")}
                  className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 transition-all hover:border-secondary/50 hover:bg-secondary/5 active:scale-95 shadow-sm group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted group-hover:bg-secondary/10 transition-colors">
                    <BookOpen className="h-7 w-7 text-secondary" />
                  </div>
                  <span className="text-sm font-bold">Teacher</span>
                </button>

                <button
                  onClick={() => handleRoleSelect("admin")}
                  className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:bg-accent/5 active:scale-95 shadow-sm group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted group-hover:bg-accent/10 transition-colors">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-sm font-bold">Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "login" && selectedRole && (
          <div className="animate-fade-in flex flex-col gap-8 max-w-md w-full mx-auto">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Access as {roleLabels[selectedRole]}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex p-1 gap-1 rounded-2xl bg-muted/50 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setAuthError(null);
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${mode === "signin"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-card/50"
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRole === "admin") return;
                    setMode("signup");
                    setAuthError(null);
                  }}
                  disabled={selectedRole === "admin"}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-30 ${mode === "signup"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-card/50"
                    }`}
                >
                  Sign Up
                </button>
              </div>

              {mode === "signin" && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground/80">
                      Demo Accounts
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      One-tap access
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {demoCredentials[selectedRole].map((entry) => (
                      <button
                        key={entry.email}
                        type="button"
                        onClick={() => applyDemoCredentials(entry)}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-all hover:bg-primary/5 hover:border-primary/30"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {entry.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {entry.email}
                          </span>
                        </div>
                        <Zap className="h-3.5 w-3.5 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl h-12 bg-card border-border focus:ring-primary"
                      placeholder="Your full name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl h-12 bg-card border-border focus:ring-primary"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl h-12 bg-card border-border focus:ring-primary"
                    placeholder="Min 8 characters"
                  />
                </div>

                {mode === "signup" && selectedRole === "teacher" && (
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-semibold">
                      Your Specialization
                    </Label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as "Physics" | "Chemistry" | "Mathematics")}
                      className="w-full flex h-12 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                    </select>
                  </div>
                )}

                {mode === "signup" && selectedRole === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-semibold">
                      Class Level
                    </Label>
                    <select
                      id="year"
                      value={year}
                      onChange={(e) => setYear(e.target.value as "11th" | "12th")}
                      className="w-full flex h-12 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="11th">11th Standard</option>
                      <option value="12th">12th Standard</option>
                    </select>
                  </div>
                )}
              </div>

              {authError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0" />
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl text-base font-bold transition-all shadow-md active:scale-95"
                size="lg"
              >
                {isSubmitting
                  ? mode === "signup"
                    ? "Creating Account..."
                    : "Signing In..."
                  : mode === "signup"
                    ? "Create Account"
                    : "Continue"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 text-center text-xs text-muted-foreground/60 max-w-xs mx-auto">
        By continuing, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>
      </div>
    </div>
  );
}
