"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  StudentHomeSummaryResponse,
  StudentProgressResponse,
  StudentTestResponse,
  StudyPlanResponse,
  getStudentHomeSummary,
  getStudentProgress,
  getStudyPlan,
  listStudentTests,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Target,
  TrendingUp,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronRight,
  Atom,
  FlaskConical,
  Calculator,
} from "lucide-react";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics"] as const;

function formatDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StudentHomeScreen() {
  const {
    userName,
    navigate,
    setActiveTestId,
    setActiveAttemptId,
    setCompletedTestId,
    studentYear,
    authToken,
  } = useApp();
  const year = studentYear || "12th";

  const [tests, setTests] = useState<StudentTestResponse[]>([]);
  const [summary, setSummary] = useState<StudentHomeSummaryResponse | null>(null);
  const [progress, setProgress] = useState<StudentProgressResponse | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!authToken) {
        setError("Student login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, progressResponse, testsResponse, planResponse] = await Promise.all([
          getStudentHomeSummary(authToken),
          getStudentProgress(authToken),
          listStudentTests(authToken),
          getStudyPlan(authToken).catch(() => null),
        ]);

        if (!cancelled) {
          setSummary(summaryResponse);
          setProgress(progressResponse);
          setTests(testsResponse);
          setStudyPlan(planResponse);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load dashboard data.");
          }
          setSummary(null);
          setProgress(null);
          setTests([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const assignedTests = useMemo(
    () => tests.filter((test) => test.status === "assigned"),
    [tests],
  );

  const completedTests = useMemo(
    () => tests.filter((test) => test.status === "completed" && test.attempt_id),
    [tests],
  );

  const subjectStats = useMemo(() => {
    return SUBJECTS.map((subject) => {
      const completedForSubject = completedTests
        .filter((test) => test.subject === subject && typeof test.score === "number")
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aTime - bTime;
        });

      const latest = completedForSubject[completedForSubject.length - 1]?.score ?? null;
      return {
        subject,
        latest,
      };
    });
  }, [completedTests]);

  const subjectIcons: Record<string, typeof Atom> = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Mathematics: Calculator,
  };

  const streak = summary?.streak ?? 0;
  const avgScore = summary?.avg_score ?? 0;
  const overallRank = progress?.overall_rank ?? 0;

  const nextTask = useMemo(() => {
    if (!studyPlan || !studyPlan.tasks) return null;
    return studyPlan.tasks.find(t => t.status !== "completed") || studyPlan.tasks[0];
  }, [studyPlan]);

  const progressPercentage = useMemo(() => {
    if (!studyPlan || !studyPlan.tasks || studyPlan.tasks.length === 0) return 35; // Default if not found
    const completed = studyPlan.tasks.filter(t => t.status === "completed").length;
    return Math.round((completed / studyPlan.tasks.length) * 100);
  }, [studyPlan]);

  const daysRemaining = useMemo(() => {
    if (!studyPlan?.target_exam_date) return null;
    const target = new Date(studyPlan.target_exam_date);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [studyPlan]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="animate-fade-in flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {year} Class
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground text-balance">{userName || "Student"}</h1>
      </div>

      {error && (
        <div className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      )}

      <div className="animate-fade-in flex gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <span className="text-lg font-bold text-foreground">{loading ? "--" : streak}</span>
          <span className="text-[11px] text-muted-foreground">Day Streak</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {loading ? "--" : `${avgScore.toFixed(1)}%`}
          </span>
          <span className="text-[11px] text-muted-foreground">Avg Score</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-bold text-foreground">{loading ? "--" : `#${overallRank}`}</span>
          <span className="text-[11px] text-muted-foreground">Rank</span>
        </div>
      </div>

      <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "150ms" }}>
        <h2 className="text-base font-semibold text-foreground">Subject Scores</h2>
        <div className="flex gap-3">
          {subjectStats.map((item) => {
            const Icon = subjectIcons[item.subject] || BookOpen;
            return (
              <div
                key={item.subject}
                className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.subject === "Physics"
                    ? "bg-primary/15"
                    : item.subject === "Chemistry"
                      ? "bg-accent/15"
                      : "bg-warning/15"
                    }`}
                >
                  <Icon
                    className={`h-4 w-4 ${item.subject === "Physics"
                      ? "text-primary"
                      : item.subject === "Chemistry"
                        ? "text-accent"
                        : "text-warning"
                      }`}
                  />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {item.latest === null ? "--" : `${item.latest}%`}
                </span>
                <span className="text-[10px] text-muted-foreground text-center">{item.subject}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Plan Card */}
      <button
        onClick={() => navigate("student-study-plan")}
        className="animate-fade-in flex flex-col gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-left transition-colors hover:bg-accent/10"
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Clock className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">My Study Plan</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Timeline</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-accent">JEE {studyPlan?.target_exam_date ? new Date(studyPlan.target_exam_date).getFullYear() : "2026"}</span>
            <span className="text-[10px] text-muted-foreground">{daysRemaining !== null ? `${daysRemaining} Days Left` : "Target Date"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">Daily Goal: {studyPlan?.availability_hours ?? 4} Hours</span>
            <span className="text-accent font-bold">{progressPercentage}% Complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/20">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-background/50 p-2.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-medium text-foreground line-clamp-1">
            {nextTask ? `Next: ${nextTask.title} - ${nextTask.topic}` : "Plan your first study session"}
          </span>
          <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground" />
        </div>
      </button>

      <button
        onClick={() => navigate("ai-chat")}
        className="animate-fade-in flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">AI Study Assistant</span>
          <span className="text-xs text-muted-foreground">
            Ask doubts, get explanations, practice problems
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Upcoming Tests</h2>
          <button
            onClick={() => navigate("student-tests")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {loading && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading tests...</p>
            </div>
          )}
          {!loading && assignedTests.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No upcoming tests for {year} class</p>
            </div>
          )}
          {!loading &&
            assignedTests.slice(0, 3).map((test) => (
              <button
                key={test.id}
                onClick={() => {
                  setActiveTestId(test.id);
                  setActiveAttemptId(null);
                  setCompletedTestId(null);
                  navigate("student-test-active");
                }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{test.title}</span>
                  <span className="text-xs text-muted-foreground">{test.subject}</span>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {test.duration} min
                    </span>
                    <span className="text-[11px] text-muted-foreground">{test.questions} Qs</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${test.difficulty === "Hard"
                        ? "bg-destructive/15 text-destructive"
                        : test.difficulty === "Medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-accent/15 text-accent"
                        }`}
                    >
                      {test.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">{formatDate(test.created_at)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
        </div>
      </div>

      <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Results</h2>
          <button
            onClick={() => navigate("student-progress")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {!loading && completedTests.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No results yet</p>
            </div>
          )}
          {!loading &&
            completedTests.slice(0, 3).map((test) => (
              <button
                key={test.id}
                onClick={() => {
                  if (!test.attempt_id) return;
                  setCompletedTestId(test.attempt_id);
                  navigate("student-results");
                }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="4"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${((test.score ?? 0) / 100) * 125.6} 125.6`}
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-foreground">{test.score ?? 0}%</span>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{test.title}</span>
                  <span className="text-xs text-muted-foreground">{test.subject}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </div>
      </div>

      <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "500ms" }}>
        <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("student-library")}
            className="flex h-auto flex-col items-center gap-2 rounded-2xl border-border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Study Material</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("ai-chat")}
            className="flex h-auto flex-col items-center gap-2 rounded-2xl border-border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <Sparkles className="h-6 w-6 text-accent" />
            <span className="text-xs font-medium">Ask AI</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("student-progress")}
            className="flex h-auto flex-col items-center gap-2 rounded-2xl border-border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <TrendingUp className="h-6 w-6 text-warning" />
            <span className="text-xs font-medium">My Progress</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("student-tests")}
            className="flex h-auto flex-col items-center gap-2 rounded-2xl border-border bg-card p-4 text-foreground hover:bg-muted/50"
          >
            <Target className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">All Tests</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
