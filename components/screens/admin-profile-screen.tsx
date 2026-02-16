"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { ApiError, fetchCurrentUser, getAdminDashboard } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  User,
  Mail,
  Users,
  GraduationCap,
  FileText,
  BarChart3,
  ChevronRight,
  LogOut,
} from "lucide-react";

const menuItems = [
  { icon: Users, label: "Manage Users", screen: "admin-users" as const },
  { icon: BarChart3, label: "Reports", screen: "admin-reports" as const },
  { icon: FileText, label: "Content Moderation", screen: "admin-content" as const },
];

export function AdminProfileScreen() {
  const { userName, userEmail, authToken, navigate, clearAuth, setRole } = useApp();
  const [profileEmail, setProfileEmail] = useState(userEmail || "");
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalTeachers: number;
    activeTests: number;
  }>({
    totalStudents: 0,
    totalTeachers: 0,
    activeTests: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!authToken) {
        setError("Admin login is required.");
        return;
      }

      setError(null);
      try {
        const [me, dashboard] = await Promise.all([fetchCurrentUser(authToken), getAdminDashboard(authToken)]);
        if (!cancelled) {
          setProfileEmail(me.email);
          setStats({
            totalStudents: dashboard.total_students,
            totalTeachers: dashboard.total_teachers,
            activeTests: dashboard.active_tests,
          });
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
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/15">
            <User className="h-10 w-10 text-warning" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-lg font-bold text-foreground">{userName || "Admin"}</h1>
          <p className="text-xs text-muted-foreground">Principal</p>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{stats.totalStudents}</span>
            <span className="text-[10px] text-muted-foreground">Students</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{stats.totalTeachers}</span>
            <span className="text-[10px] text-muted-foreground">Teachers</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold text-foreground">{stats.activeTests}</span>
            <span className="text-[10px] text-muted-foreground">Active Tests</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Profile Details</h2>
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{profileEmail || userEmail || "--"}</span>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Role: Admin</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.screen)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
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
