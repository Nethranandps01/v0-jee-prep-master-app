"use client";

import { useState } from "react";
import { sampleAdminStats, sampleBillingReports } from "@/lib/sample-data";
import {
  BarChart3,
  TrendingUp,
  Download,
  CreditCard,
  Calendar,
  Users,
  FileText,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

export function AdminReportsScreen() {
  const [activeSection, setActiveSection] = useState<"analytics" | "billing">("analytics");
  const [showExportToast, setShowExportToast] = useState(false);

  const handleExport = () => {
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-xs text-muted-foreground">Institution analytics & billing</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-transform active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Section Toggle */}
      <div className="animate-fade-in flex gap-2" style={{ animationDelay: "50ms" }}>
        <button
          onClick={() => setActiveSection("analytics")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
            activeSection === "analytics"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
        </button>
        <button
          onClick={() => setActiveSection("billing")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
            activeSection === "billing"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Billing
        </button>
      </div>

      {activeSection === "analytics" ? (
        <>
          {/* Overview Stats */}
          <div className="animate-fade-in grid grid-cols-2 gap-3" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{sampleAdminStats.totalStudents}</span>
              <span className="text-[10px] text-muted-foreground">Total Students</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-xl font-bold text-foreground">{sampleAdminStats.totalTeachers}</span>
              <span className="text-[10px] text-muted-foreground">Total Teachers</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <FileText className="h-5 w-5 text-warning" />
              <span className="text-xl font-bold text-foreground">{sampleAdminStats.activeTests}</span>
              <span className="text-[10px] text-muted-foreground">Active Tests</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{sampleAdminStats.passRate}%</span>
              <span className="text-[10px] text-muted-foreground">Pass Rate</span>
            </div>
          </div>

          {/* Department Performance */}
          <div
            className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Department Breakdown</h2>
            </div>
            <div className="flex flex-col gap-4">
              {sampleAdminStats.departments.map((dept) => (
                <div key={dept.subject} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{dept.subject}</span>
                    <span className="text-xs font-semibold text-primary">{dept.avgScore}% avg</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dept.avgScore >= 80
                          ? "bg-accent"
                          : dept.avgScore >= 70
                          ? "bg-primary"
                          : "bg-warning"
                      }`}
                      style={{ width: `${dept.avgScore}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>{dept.teachers} teachers</span>
                    <span>{dept.students} students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends */}
          <div
            className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Monthly Test Activity</h2>
            </div>
            <div className="flex flex-col gap-2">
              {sampleBillingReports.monthlyUsage.map((month) => (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="w-8 text-[11px] font-medium text-muted-foreground">{month.month}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(month.tests / 80) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-[10px] font-medium text-foreground">
                      {month.tests}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Tests administered per month</p>
          </div>
        </>
      ) : (
        <>
          {/* Billing Info */}
          <div
            className="animate-fade-in flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Plan</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {sampleBillingReports.plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Students Used</span>
                <span className="text-xs font-medium text-foreground">
                  {sampleBillingReports.studentsUsed} / {sampleBillingReports.studentsAllowed}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    sampleBillingReports.studentsUsed / sampleBillingReports.studentsAllowed > 0.9
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${(sampleBillingReports.studentsUsed / sampleBillingReports.studentsAllowed) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Renewal Date</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {sampleBillingReports.renewalDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Usage */}
          <div
            className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Usage Breakdown</h2>
            </div>
            <div className="flex flex-col gap-2">
              {sampleBillingReports.monthlyUsage.map((month) => (
                <div
                  key={month.month}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-foreground">{month.month}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="text-[11px] text-muted-foreground">{month.tests} tests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-accent" />
                      <span className="text-[11px] text-muted-foreground">{month.papers} papers</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <button
            className="animate-fade-in flex items-center justify-between rounded-2xl bg-primary/5 border border-primary/20 p-4 text-left transition-colors hover:bg-primary/10"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">Need more capacity?</span>
              <span className="text-[11px] text-muted-foreground">
                Upgrade to support more students and features
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        </>
      )}

      {/* Export Toast */}
      {showExportToast && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 shadow-lg">
          <span className="text-xs font-medium text-background">Report export started</span>
        </div>
      )}
    </div>
  );
}
