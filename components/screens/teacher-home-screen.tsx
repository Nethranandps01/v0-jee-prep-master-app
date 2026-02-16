"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  LessonPlanResponse,
  TeacherClassResponse,
  TeacherHomeSummaryResponse,
  TeacherPaperResponse,
  getTeacherHomeSummary,
  listTeacherClasses,
  listTeacherLessonPlans,
  listTeacherPapers,
} from "@/lib/api-client";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

export function TeacherHomeScreen() {
  const { userName, navigate, teacherSubject, authToken } = useApp();
  const [summary, setSummary] = useState<TeacherHomeSummaryResponse | null>(null);
  const [classes, setClasses] = useState<TeacherClassResponse[]>([]);
  const [papers, setPapers] = useState<TeacherPaperResponse[]>([]);
  const [lessons, setLessons] = useState<LessonPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const subject = teacherSubject || "Physics";

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [summaryRes, classesRes, papersRes, lessonsRes] = await Promise.all([
          getTeacherHomeSummary(authToken),
          listTeacherClasses(authToken),
          listTeacherPapers(authToken),
          listTeacherLessonPlans(authToken),
        ]);

        if (!cancelled) {
          setSummary(summaryRes);
          setClasses(classesRes);
          setPapers(papersRes);
          setLessons(lessonsRes);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load teacher dashboard.");
          }
          setSummary(null);
          setClasses([]);
          setPapers([]);
          setLessons([]);
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

  const recentLessons = useMemo(() => lessons.slice(0, 2), [lessons]);
  const recentPapers = useMemo(() => papers.slice(0, 3), [papers]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="animate-fade-in flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground text-balance">{userName || "Teacher"}</h1>
        <span className="mt-1 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {subject} Teacher
        </span>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading teacher dashboard...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <div className="animate-fade-in flex gap-3" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">{summary.total_students}</span>
              <span className="text-[11px] text-muted-foreground">Students</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <span className="text-lg font-bold text-foreground">{summary.total_papers}</span>
              <span className="text-[11px] text-muted-foreground">Papers</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <span className="text-lg font-bold text-foreground">{summary.subject_avg}%</span>
              <span className="text-[11px] text-muted-foreground">{subject} Avg</span>
            </div>
          </div>

          <button
            onClick={() => navigate("teacher-paper-generator")}
            className="animate-fade-in flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">AI Paper Generator</span>
              <span className="text-xs text-muted-foreground">Create custom {subject} papers with AI</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate("teacher-library")}
            className="animate-fade-in flex items-center gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-4 text-left transition-colors hover:bg-warning/10"
            style={{ animationDelay: "225ms" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning">
              <Upload className="h-6 w-6 text-warning-foreground" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">Upload Materials</span>
              <span className="text-xs text-muted-foreground">Add files for student library</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate("teacher-lesson-plans")}
            className="animate-fade-in flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-left transition-colors hover:bg-accent/10"
            style={{ animationDelay: "250ms" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
              <ClipboardList className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">Lesson Plans</span>
              <span className="text-xs text-muted-foreground">{lessons.length} plans available</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <div
            className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Class Performance</h2>
            </div>
            <div className="flex flex-col gap-3">
              {classes.length === 0 && (
                <p className="text-xs text-muted-foreground">No classes yet.</p>
              )}
              {classes.map((cls) => (
                <div key={cls.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{cls.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{cls.avg_score}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        cls.avg_score >= 80
                          ? "bg-accent"
                          : cls.avg_score >= 70
                          ? "bg-primary"
                          : "bg-warning"
                      }`}
                      style={{ width: `${cls.avg_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {recentLessons.length > 0 && (
            <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "350ms" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Recent Lesson Plans</h2>
                <button
                  onClick={() => navigate("teacher-lesson-plans")}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {recentLessons.map((lp) => (
                  <div
                    key={lp.id}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                  >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <FolderOpen className="h-6 w-6 text-accent" />
                  </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-sm font-semibold text-foreground">{lp.topic}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{lp.year}</span>
                        <span className="text-xs text-muted-foreground">{lp.duration} min</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        lp.status === "published"
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {lp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recent Papers</h2>
              <button
                onClick={() => navigate("teacher-tests")}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {recentPapers.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
                  No papers yet.
                </div>
              )}
              {recentPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">{paper.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{paper.questions} Qs</span>
                      <span className="text-xs text-muted-foreground">{paper.duration} min</span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      paper.assigned ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {paper.assigned ? `${paper.students} students` : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in flex flex-col gap-3" style={{ animationDelay: "500ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">My Classes</h2>
              <button
                onClick={() => navigate("teacher-classes")}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {classes.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
                  No classes created yet.
                </div>
              )}
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => navigate("teacher-classes")}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">{cls.name}</span>
                    <span className="text-xs text-muted-foreground">{cls.students} students</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-primary">{cls.avg_score}%</span>
                    <span className="text-[10px] text-muted-foreground">avg score</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
