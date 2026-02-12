"use client";

import { useApp } from "@/lib/app-context";
import { sampleAdminStats } from "@/lib/sample-data";
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

export function AdminDashboardScreen() {
  const { userName, navigate } = useApp();

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Greeting */}
      <div className="animate-fade-in flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground text-balance">{userName}</h1>
        <span className="mt-1 w-fit rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
          Principal
        </span>
      </div>

      {/* Stats Grid */}
      <div className="animate-fade-in grid grid-cols-2 gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">{sampleAdminStats.totalStudents}</span>
          <span className="text-[11px] text-muted-foreground">Students</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <span className="text-2xl font-bold text-foreground">{sampleAdminStats.totalTeachers}</span>
          <span className="text-[11px] text-muted-foreground">Teachers</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <FileText className="h-5 w-5 text-warning" />
          </div>
          <span className="text-2xl font-bold text-foreground">{sampleAdminStats.activeTests}</span>
          <span className="text-[11px] text-muted-foreground">Active Tests</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">{sampleAdminStats.passRate}%</span>
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
          {sampleAdminStats.departments.map((dept) => (
            <div key={dept.subject} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{dept.subject}</span>
                  <span className="text-[10px] text-muted-foreground">{dept.teachers} teachers</span>
                </div>
                <span className="text-xs font-semibold text-primary">{dept.avgScore}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    dept.avgScore >= 80 ? "bg-accent" : dept.avgScore >= 70 ? "bg-primary" : "bg-warning"
                  }`}
                  style={{ width: `${dept.avgScore}%` }}
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
        <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
        <div className="flex flex-col gap-2">
          {sampleAdminStats.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  activity.type === "paper"
                    ? "bg-primary/15"
                    : activity.type === "test"
                    ? "bg-accent/15"
                    : activity.type === "material"
                    ? "bg-warning/15"
                    : activity.type === "achievement"
                    ? "bg-accent/15"
                    : "bg-muted"
                }`}
              >
                {activity.type === "paper" ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : activity.type === "test" ? (
                  <BookOpen className="h-4 w-4 text-accent" />
                ) : activity.type === "material" ? (
                  <FolderOpen className="h-4 w-4 text-warning" />
                ) : activity.type === "achievement" ? (
                  <TrendingUp className="h-4 w-4 text-accent" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
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
          ))}
        </div>
      </div>
    </div>
  );
}
