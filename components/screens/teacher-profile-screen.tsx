"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  TeacherClassResponse,
  TeacherHomeSummaryResponse,
  fetchCurrentUser,
  getTeacherHomeSummary,
  listTeacherClasses,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Award,
  Bell,
  BookOpen,
  ChevronRight,
  HelpCircle,
  LogOut,
  Mail,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

const menuItems = [
  { icon: Bell, label: "Notifications", screen: "notifications" as const },
  { icon: Shield, label: "Privacy & Security", screen: null },
  { icon: Settings, label: "Preferences", screen: null },
  { icon: HelpCircle, label: "Help & Support", screen: null },
];

export function TeacherProfileScreen() {
  const {
    userName,
    userEmail,
    teacherSubject,
    navigate,
    authToken,
    clearAuth,
    setRole,
  } = useApp();
  const [summary, setSummary] = useState<TeacherHomeSummaryResponse | null>(null);
  const [classes, setClasses] = useState<TeacherClassResponse[]>([]);
  const [displayEmail, setDisplayEmail] = useState(userEmail ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        return;
      }

      setError(null);
      try {
        const [me, summaryRes, classesRes] = await Promise.all([
          fetchCurrentUser(authToken),
          getTeacherHomeSummary(authToken),
          listTeacherClasses(authToken),
        ]);

        if (!cancelled) {
          setDisplayEmail(me.email);
          setSummary(summaryRes);
          setClasses(classesRes);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load profile details.");
          }
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleSignOut = () => {
    clearAuth();
    setRole(null);
    navigate("auth");
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <User className="h-10 w-10 text-accent" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <Award className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-lg font-bold text-foreground">{userName || "Teacher"}</h1>
          <p className="text-xs text-muted-foreground">{teacherSubject ?? "Physics"} Teacher</p>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{classes.length}</span>
            <span className="text-[10px] text-muted-foreground">Classes</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{summary?.total_students ?? 0}</span>
            <span className="text-[10px] text-muted-foreground">Students</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{summary?.total_papers ?? 0}</span>
            <span className="text-[10px] text-muted-foreground">Papers</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Profile Details</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{displayEmail || "-"}</span>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{teacherSubject ?? "Physics"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{summary?.total_students ?? 0} active students</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => item.screen && navigate(item.screen)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        onClick={handleSignOut}
        className="gap-2 rounded-2xl border-destructive/30 bg-transparent py-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
