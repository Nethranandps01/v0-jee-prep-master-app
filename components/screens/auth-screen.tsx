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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center gap-2 px-6 pt-12">
        {step !== "role" && (
          <button
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">JEE Prep Master</span>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-8">
        {step === "role" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground text-balance">Welcome Back</h1>
              <p className="text-sm text-muted-foreground">
                Choose your role to continue
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-foreground">I am a...</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleRoleSelect("student")}
                  className="flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition-all hover:border-primary/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <GraduationCap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Student</span>
                </button>

                <button
                  onClick={() => handleRoleSelect("teacher")}
                  className="flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition-all hover:border-accent/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Teacher</span>
                </button>

                <button
                  onClick={() => handleRoleSelect("admin")}
                  className="flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition-all hover:border-warning/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "login" && selectedRole && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </h1>
              <p className="text-sm text-muted-foreground">{roleLabels[selectedRole]}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setAuthError(null);
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                    mode === "signin"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground"
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
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {mode === "signin" && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Demo {roleLabels[selectedRole]} Accounts
                    </span>
                    <span className="text-[10px] text-muted-foreground">Tap to autofill</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {demoCredentials[selectedRole].map((entry) => (
                      <button
                        key={entry.email}
                        type="button"
                        onClick={() => applyDemoCredentials(entry)}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{entry.label}</span>
                          <span className="text-[11px] text-muted-foreground">{entry.email}</span>
                        </div>
                        <span className="text-[11px] font-medium text-primary">Autofill</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border-border bg-card py-5 text-foreground placeholder:text-muted-foreground"
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-border bg-card py-5 text-foreground placeholder:text-muted-foreground"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-border bg-card py-5 text-foreground placeholder:text-muted-foreground"
                  placeholder="Enter your password"
                />
              </div>

              {mode === "signup" && selectedRole === "teacher" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                    Subject
                  </Label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as "Physics" | "Chemistry" | "Mathematics")}
                    className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>
              )}

              {mode === "signup" && selectedRole === "student" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="year" className="text-sm font-medium text-foreground">
                    Class Year
                  </Label>
                  <select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value as "11th" | "12th")}
                    className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground"
                  >
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </select>
                </div>
              )}

              {authError && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {authError}
                </p>
              )}

              <Button
                onClick={handleLogin}
                disabled={isSubmitting}
                className="mt-2 w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
                size="lg"
              >
                {isSubmitting
                  ? mode === "signup"
                    ? "Creating Account..."
                    : "Signing In..."
                  : mode === "signup"
                  ? "Create Account"
                  : "Sign In"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="px-6 pb-8 text-center text-xs text-muted-foreground">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
