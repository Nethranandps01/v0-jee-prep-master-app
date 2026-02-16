"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  AnalyticsReportResponse,
  ApiError,
  BillingReportResponse,
  exportAdminReportCsv,
  getAnalyticsReport,
  getBillingReport,
} from "@/lib/api-client";
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
  const { authToken } = useApp();
  const [activeSection, setActiveSection] = useState<"analytics" | "billing">("analytics");
  const [showExportToast, setShowExportToast] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsReportResponse | null>(null);
  const [billing, setBilling] = useState<BillingReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      if (!authToken) {
        setAnalytics(null);
        setBilling(null);
        setLoading(false);
        setError("Admin login is required to view reports.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [analyticsRes, billingRes] = await Promise.all([
          getAnalyticsReport(authToken),
          getBillingReport(authToken),
        ]);

        if (!cancelled) {
          setAnalytics(analyticsRes);
          setBilling(billingRes);
        }
      } catch (err) {
        if (!cancelled) {
          setAnalytics(null);
          setBilling(null);
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load reports.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const usageForChart = useMemo(() => {
    if (activeSection === "analytics") {
      return analytics?.monthly_usage ?? [];
    }
    return billing?.monthly_usage ?? [];
  }, [activeSection, analytics?.monthly_usage, billing?.monthly_usage]);

  const maxMonthlyTests = useMemo(() => {
    if (usageForChart.length === 0) return 1;
    return Math.max(...usageForChart.map((item) => item.tests), 1);
  }, [usageForChart]);

  const handleExport = async () => {
    if (!authToken || isExporting) return;

    setExportError(null);
    setIsExporting(true);

    try {
      const { blob, filename } = await exportAdminReportCsv(authToken, activeSection);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setShowExportToast(true);
      window.setTimeout(() => setShowExportToast(false), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setExportError(err.detail);
      } else {
        setExportError("Unable to export report.");
      }
    } finally {
      setIsExporting(false);
    }
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
          disabled={isExporting || loading}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-transform active:scale-95 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>

      {exportError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {exportError}
        </div>
      )}

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

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading reports...
        </div>
      ) : error ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : activeSection === "analytics" && analytics ? (
        <>
          {/* Overview Stats */}
          <div className="animate-fade-in grid grid-cols-2 gap-3" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{analytics.total_students}</span>
              <span className="text-[10px] text-muted-foreground">Total Students</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-xl font-bold text-foreground">{analytics.total_teachers}</span>
              <span className="text-[10px] text-muted-foreground">Total Teachers</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <FileText className="h-5 w-5 text-warning" />
              <span className="text-xl font-bold text-foreground">{analytics.active_tests}</span>
              <span className="text-[10px] text-muted-foreground">Active Tests</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{analytics.pass_rate}%</span>
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
              {analytics.departments.map((dept) => (
                <div key={dept.subject} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{dept.subject}</span>
                    <span className="text-xs font-semibold text-primary">{dept.avg_score}% avg</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dept.avg_score >= 80
                          ? "bg-accent"
                          : dept.avg_score >= 70
                          ? "bg-primary"
                          : "bg-warning"
                      }`}
                      style={{ width: `${dept.avg_score}%` }}
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
              {analytics.monthly_usage.map((month) => (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="w-8 text-[11px] font-medium text-muted-foreground">{month.month}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(month.tests / maxMonthlyTests) * 100}%` }}
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
      ) : billing ? (
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
                  {billing.plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Students Used</span>
                <span className="text-xs font-medium text-foreground">
                  {billing.students_used} / {billing.students_allowed}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    billing.students_allowed > 0 &&
                    billing.students_used / billing.students_allowed > 0.9
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${
                      billing.students_allowed > 0
                        ? (billing.students_used / billing.students_allowed) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Renewal Date</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{billing.renewal_date}</span>
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
              {billing.monthly_usage.map((month) => (
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
            className="animate-fade-in flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
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
      ) : null}

      {/* Export Toast */}
      {showExportToast && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 shadow-lg">
          <span className="text-xs font-medium text-background">Report export started</span>
        </div>
      )}
    </div>
  );
}
