"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useApp } from "@/lib/app-context";
import {
  AdminDashboardResponse,
  ApiError,
  getAdminDashboard,
  setGlobalJeeDate,
} from "@/lib/api-client";
import {
  Users,
  GraduationCap,
  FileText,
  TrendingUp,
  BarChart3,
  ChevronRight,
  BookOpen,
  FolderOpen,
  Clock,
} from "lucide-react";

type ActivityAppearance = {
  container: string;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
};

const activityAppearanceByType: Record<string, ActivityAppearance> = {
  paper: { container: "bg-primary/15", icon: FileText, iconClass: "text-primary" },
  test: { container: "bg-accent/15", icon: BookOpen, iconClass: "text-accent" },
  material: { container: "bg-warning/15", icon: FolderOpen, iconClass: "text-warning" },
  achievement: { container: "bg-accent/15", icon: TrendingUp, iconClass: "text-accent" },
  chat: { container: "bg-primary/15", icon: BookOpen, iconClass: "text-primary" },
  feedback: { container: "bg-warning/15", icon: TrendingUp, iconClass: "text-warning" },
  user: { container: "bg-accent/15", icon: Users, iconClass: "text-accent" },
  class: { container: "bg-primary/15", icon: GraduationCap, iconClass: "text-primary" },
  plan: { container: "bg-warning/15", icon: BookOpen, iconClass: "text-warning" },
};

const defaultActivityAppearance: ActivityAppearance = {
  container: "bg-muted",
  icon: FileText,
  iconClass: "text-muted-foreground",
};

export function AdminDashboardScreen() {
  const { userName, navigate, authToken } = useApp();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (!authToken) {
        setDashboard(null);
        setError("Admin login is required to view dashboard data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getAdminDashboard(authToken);
        if (!cancelled) {
          setDashboard(response);
        }
      } catch (err) {
        if (!cancelled) {
          setDashboard(null);
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load dashboard.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Greeting */}
      <div className="animate-fade-in flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground text-balance">{userName || "Admin"}</h1>
        <span className="mt-1 w-fit rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
          Principal
        </span>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setReloadKey((value) => value + 1)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("auth")}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          {/* Stats Grid */}
          <div className="animate-fade-in grid grid-cols-2 gap-3" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">{dashboard.total_students}</span>
              <span className="text-[11px] text-muted-foreground">Students</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <span className="text-2xl font-bold text-foreground">{dashboard.total_teachers}</span>
              <span className="text-[11px] text-muted-foreground">Teachers</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <span className="text-2xl font-bold text-foreground">{dashboard.active_tests}</span>
              <span className="text-[11px] text-muted-foreground">Active Tests</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">{dashboard.pass_rate}%</span>
              <span className="text-[11px] text-muted-foreground">Pass Rate</span>
            </div>
          </div>

          {/* Subject-wise Performance */}
          <div
            className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Department Performance</h2>
            </div>
            <div className="flex flex-col gap-3">
              {dashboard.departments.map((dept) => (
                <div key={dept.subject} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{dept.subject}</span>
                      <span className="text-[10px] text-muted-foreground">{dept.teachers} teachers</span>
                    </div>
                    <span className="text-xs font-semibold text-primary">{dept.avg_score}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${dept.avg_score >= 80
                        ? "bg-accent"
                        : dept.avg_score >= 70
                          ? "bg-primary"
                          : "bg-warning"
                        }`}
                      style={{ width: `${dept.avg_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className="animate-fade-in flex flex-col gap-3"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigate("admin-users")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <Users className="h-6 w-6 text-primary" />
                <span className="text-[11px] font-medium text-foreground">Manage Users</span>
              </button>
              <button
                onClick={() => navigate("admin-reports")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <BarChart3 className="h-6 w-6 text-accent" />
                <span className="text-[11px] font-medium text-foreground">View Reports</span>
              </button>
              <button
                onClick={() => navigate("admin-content")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <FolderOpen className="h-6 w-6 text-warning" />
                <span className="text-[11px] font-medium text-foreground">Moderate</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div
            className="animate-fade-in flex flex-col gap-3"
            style={{ animationDelay: "400ms" }}
          >
            <h2 className="text-base font-semibold text-foreground text-balance">Global Exam Settings</h2>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">JEE Main 2026</span>
                    <span className="text-[11px] text-muted-foreground">Sets the deadline for all study plans</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    id="jee-date-input"
                    defaultValue="2026-06-15"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById("jee-date-input") as HTMLInputElement;
                      if (!input || !input.value || !authToken) return;
                      try {
                        const res = await setGlobalJeeDate(authToken, `${input.value}T00:00:00Z`);
                        alert(res.message);
                        setReloadKey(prev => prev + 1);
                      } catch (err) {
                        alert("Failed to set exam date");
                      }
                    }}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
                  >
                    Set Date & Sync Plans
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div
            className="animate-fade-in flex flex-col gap-3"
            style={{ animationDelay: "450ms" }}
          >
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <div className="flex flex-col gap-2">
              {dashboard.recent_activity.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                  No recent activity yet. Actions from admin, teacher, and student modules will appear here.
                </div>
              ) : (
                dashboard.recent_activity.map((activity) => {
                  const appearance = activityAppearanceByType[activity.type] ?? defaultActivityAppearance;
                  const ActivityIcon = appearance.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${appearance.container}`}
                      >
                        <ActivityIcon className={`h-4 w-4 ${appearance.iconClass}`} />
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground">{activity.text}</span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {activity.time}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
