"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { ApiError, StudentTestResponse, listStudentTests } from "@/lib/api-client";
import {
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Filter,
} from "lucide-react";

const statusFilters = ["All", "Assigned", "Completed"] as const;
const subjects = ["All", "Physics", "Chemistry", "Mathematics"] as const;

type StatusFilter = (typeof statusFilters)[number];
type SubjectFilter = (typeof subjects)[number];

function formatDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function StudentTestsScreen() {
  const {
    navigate,
    setActiveTestId,
    setActiveAttemptId,
    setCompletedTestId,
    studentYear,
    authToken,
  } = useApp();
  const year = studentYear || "12th";

  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");
  const [activeSubject, setActiveSubject] = useState<SubjectFilter>("All");
  const [tests, setTests] = useState<StudentTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadTests = async () => {
      if (!authToken) {
        setError("Student login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const status =
          activeFilter === "All"
            ? undefined
            : (activeFilter.toLowerCase() as "assigned" | "completed");
        const subject = activeSubject === "All" ? undefined : activeSubject;
        const response = await listStudentTests(authToken, { status, subject });
        if (!cancelled) {
          setTests(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load tests.");
          }
          setTests([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [activeFilter, activeSubject, authToken, reloadKey]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">My Tests</h1>
        <p className="text-sm text-muted-foreground">
          {year} Class - {loading ? "Loading..." : `${tests.length} tests`}
        </p>
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

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {statusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              activeSubject === subject
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading tests...</p>
          </div>
        )}

        {!loading && tests.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No tests found</p>
          </div>
        )}

        {!loading &&
          tests.map((test, index) => (
            <button
              key={test.id}
              onClick={() => {
                if (test.status === "assigned") {
                  setActiveTestId(test.id);
                  setActiveAttemptId(null);
                  setCompletedTestId(null);
                  navigate("student-test-active");
                } else if (test.attempt_id) {
                  setCompletedTestId(test.attempt_id);
                  navigate("student-results");
                }
              }}
              className="animate-fade-in flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  test.status === "completed" ? "bg-accent/15" : "bg-primary/10"
                }`}
              >
                {test.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-accent" />
                ) : (
                  <BookOpen className="h-6 w-6 text-primary" />
                )}
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
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      test.difficulty === "Hard"
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
                {test.score !== null && test.score !== undefined && (
                  <span className="text-lg font-bold text-primary">{test.score}%</span>
                )}
                <span className="text-[10px] text-muted-foreground">{formatDate(test.created_at)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
