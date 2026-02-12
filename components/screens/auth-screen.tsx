"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Zap,
  GraduationCap,
  BookOpen,
  Shield,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  FlaskConical,
  Calculator,
  Atom,
} from "lucide-react";

type AuthStep = "role" | "subject" | "year" | "login";

export function AuthScreen() {
  const { navigate, setRole, setUserName, setTeacherSubject, setStudentYear } = useApp();
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "admin" | null>(null);
  const [step, setStep] = useState<AuthStep>("role");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<"11th" | "12th" | null>(null);
  const [name, setName] = useState("");

  const handleRoleSelect = (role: "student" | "teacher" | "admin") => {
    setSelectedRole(role);
    if (role === "teacher") {
      setStep("subject");
    } else if (role === "student") {
      setStep("year");
    } else {
      setStep("login");
    }
  };

  const handleLogin = () => {
    if (!selectedRole) return;
    setRole(selectedRole);
    if (selectedRole === "teacher" && selectedSubject) {
      setTeacherSubject(selectedSubject);
    }
    if (selectedRole === "student" && selectedYear) {
      setStudentYear(selectedYear);
    }
    if (name.trim()) {
      setUserName(name.trim());
    } else {
      setUserName(
        selectedRole === "student"
          ? "Rahul"
          : selectedRole === "teacher"
          ? "Dr. Sharma"
          : "Principal"
      );
    }
    navigate(
      selectedRole === "student"
        ? "student-home"
        : selectedRole === "teacher"
        ? "teacher-home"
        : "admin-dashboard"
    );
  };

  const handleBack = () => {
    if (step === "subject" || step === "year") {
      setStep("role");
      setSelectedSubject(null);
      setSelectedYear(null);
    } else if (step === "login") {
      if (selectedRole === "teacher") {
        setStep("subject");
      } else if (selectedRole === "student") {
        setStep("year");
      } else {
        setStep("role");
      }
    }
  };

  const subjectOptions = [
    { key: "Physics", icon: Atom, color: "primary" },
    { key: "Chemistry", icon: FlaskConical, color: "accent" },
    { key: "Mathematics", icon: Calculator, color: "warning" },
  ];

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
        {/* Step: Role Selection */}
        {step === "role" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-foreground text-balance">
                Welcome Back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to continue your JEE preparation journey
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-foreground">
                I am a...
              </Label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleRoleSelect("student")}
                  className={`flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all ${
                    selectedRole === "student"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      selectedRole === "student" ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <GraduationCap
                      className={`h-6 w-6 ${
                        selectedRole === "student" ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      selectedRole === "student" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    Student
                  </span>
                </button>
                <button
                  onClick={() => handleRoleSelect("teacher")}
                  className={`flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all ${
                    selectedRole === "teacher"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      selectedRole === "teacher" ? "bg-accent" : "bg-muted"
                    }`}
                  >
                    <BookOpen
                      className={`h-6 w-6 ${
                        selectedRole === "teacher" ? "text-accent-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      selectedRole === "teacher" ? "text-accent" : "text-foreground"
                    }`}
                  >
                    Teacher
                  </span>
                </button>
                <button
                  onClick={() => handleRoleSelect("admin")}
                  className={`flex flex-1 flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all ${
                    selectedRole === "admin"
                      ? "border-warning bg-warning/10"
                      : "border-border bg-card hover:border-warning/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      selectedRole === "admin" ? "bg-warning" : "bg-muted"
                    }`}
                  >
                    <Shield
                      className={`h-6 w-6 ${
                        selectedRole === "admin" ? "text-warning-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      selectedRole === "admin" ? "text-warning" : "text-foreground"
                    }`}
                  >
                    Admin
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Teacher Subject Selection */}
        {step === "subject" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                Your Subject
              </h1>
              <p className="text-sm text-muted-foreground">
                Select your area of specialization
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {subjectOptions.map((sub) => {
                const Icon = sub.icon;
                const isActive = selectedSubject === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => setSelectedSubject(sub.key)}
                    className={`flex items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                      isActive
                        ? `border-${sub.color} bg-${sub.color}/10`
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isActive ? `bg-${sub.color}` : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isActive ? `text-${sub.color}-foreground` : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? `text-${sub.color}` : "text-foreground"
                      }`}
                    >
                      {sub.key}
                    </span>
                    <div className="ml-auto">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isActive ? `border-${sub.color} bg-${sub.color}` : "border-border"
                        }`}
                      >
                        {isActive && (
                          <div className="h-2 w-2 rounded-full bg-card" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setStep("login")}
              disabled={!selectedSubject}
              className="mt-2 w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
              size="lg"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step: Student Year Selection */}
        {step === "year" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                Your Class
              </h1>
              <p className="text-sm text-muted-foreground">
                Select your current class year
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelectedYear("11th")}
                className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all ${
                  selectedYear === "11th"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                    selectedYear === "11th" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`text-lg font-bold ${
                      selectedYear === "11th" ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    11
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-sm font-semibold ${
                      selectedYear === "11th" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    11th Class (Junior)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Physics 1, Chemistry 1, Mathematics 1
                  </span>
                </div>
              </button>

              <button
                onClick={() => setSelectedYear("12th")}
                className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all ${
                  selectedYear === "12th"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent/50"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                    selectedYear === "12th" ? "bg-accent" : "bg-muted"
                  }`}
                >
                  <span
                    className={`text-lg font-bold ${
                      selectedYear === "12th" ? "text-accent-foreground" : "text-muted-foreground"
                    }`}
                  >
                    12
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-sm font-semibold ${
                      selectedYear === "12th" ? "text-accent" : "text-foreground"
                    }`}
                  >
                    12th Class (Senior)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Physics 2, Chemistry 2, Mathematics 2
                  </span>
                </div>
              </button>
            </div>

            <Button
              onClick={() => setStep("login")}
              disabled={!selectedYear}
              className="mt-2 w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
              size="lg"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step: Login */}
        {step === "login" && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                Almost There
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedRole === "student"
                  ? `${selectedYear} Class Student`
                  : selectedRole === "teacher"
                  ? `${selectedSubject} Teacher`
                  : "Admin (Principal)"}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Your Name
                </Label>
                <Input
                  id="name"
                  placeholder={
                    selectedRole === "student"
                      ? "e.g. Rahul Kumar"
                      : selectedRole === "teacher"
                      ? "e.g. Dr. Sharma"
                      : "e.g. Principal Mehta"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-border bg-card py-5 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-foreground">
                  Continue with
                </Label>
                <Button
                  variant="outline"
                  onClick={handleLogin}
                  className="flex items-center gap-3 rounded-2xl border-border bg-card py-6 text-foreground hover:bg-muted"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogin}
                  className="flex items-center gap-3 rounded-2xl border-border bg-card py-6 text-foreground hover:bg-muted"
                >
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  Continue with Phone
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogin}
                  className="flex items-center gap-3 rounded-2xl border-border bg-card py-6 text-foreground hover:bg-muted"
                >
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Continue with Email
                </Button>
              </div>

              <Button
                onClick={handleLogin}
                className="mt-2 w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
                size="lg"
              >
                Get Started
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
