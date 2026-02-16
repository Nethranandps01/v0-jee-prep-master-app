"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  StudentHomeSummaryResponse,
  StudentProgressResponse,
  StudentTestResponse,
  getStudentHomeSummary,
  getStudentProgress,
  listStudentTests,
} from "@/lib/api-client";
import {
  TrendingUp,
  Flame,
  Target,
  Award,
  Users,
  BarChart3,
  Atom,
  FlaskConical,
  Calculator,
} from "lucide-react";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics"] as const;

export function StudentProgressScreen() {
  const { studentYear, authToken, studentProgressData, setStudentProgressData } = useApp();
  const year = studentYear || "12th";

  const [progress, setProgress] = useState<StudentProgressResponse | null>(
    studentProgressData?.progress || null,
  );
  const [summary, setSummary] = useState<StudentHomeSummaryResponse | null>(
    studentProgressData?.summary || null,
  );
  const [tests, setTests] = useState<StudentTestResponse[]>(studentProgressData?.tests || []);

  // SWR: Loading is false if we have data
  const [loading, setLoading] = useState(!studentProgressData);
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
      if (!studentProgressData) {
        setLoading(true);
      }
      setError(null);

      try {
        const [progressResponse, summaryResponse, testsResponse] = await Promise.all([
          getStudentProgress(authToken),
          getStudentHomeSummary(authToken),
          listStudentTests(authToken, { status: "completed" }),
        ]);

        if (!cancelled) {
          setProgress(progressResponse);
          setSummary(summaryResponse);
          setTests(testsResponse);
          setStudentProgressData({
            progress: progressResponse,
            summary: summaryResponse,
            tests: testsResponse,
          });
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load progress data.");
          }
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

  const subjectMarks = useMemo(() => {
    return SUBJECTS.map((subject) => {
      const scores = tests
        .filter((test) => test.subject === subject && typeof test.score === "number")
        .map((test) => Number(test.score))
        .reverse()
        .slice(-5);

      const normalized = scores.length > 0 ? scores : [0, 0, 0, 0, 0];
      const avg = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;

      return {
        subject,
        scores: normalized,
        avg,
      };
    });
  }, [tests]);

  const rankHistory = progress?.rank_history ?? [];
  const topicMastery = progress?.topic_mastery ?? [];

  const subjectIcons: Record<string, typeof Atom> = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Mathematics: Calculator,
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">My Progress</h1>
        <p className="text-sm text-muted-foreground">
          {year} Class - Track your JEE preparation journey
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {loading ? "--" : `#${progress?.overall_rank ?? 0}`}
          </span>
          <span className="text-[11px] text-muted-foreground">Overall Rank</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {loading ? "--" : progress?.total_students ?? 0}
          </span>
          <span className="text-[11px] text-muted-foreground">Total Students</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <span className="text-2xl font-bold text-foreground">{loading ? "--" : summary?.streak ?? 0}</span>
          <span className="text-[11px] text-muted-foreground">Day Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {loading ? "--" : progress?.tests_completed ?? 0}
          </span>
          <span className="text-[11px] text-muted-foreground">Tests Done</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Subject-wise Marks</h2>
        </div>
        <div className="flex flex-col gap-4">
          {subjectMarks.map((subject) => {
            const Icon = subjectIcons[subject.subject] || BarChart3;
            return (
              <div key={subject.subject} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${subject.subject === "Physics"
                      ? "text-primary"
                      : subject.subject === "Chemistry"
                        ? "text-accent"
                        : "text-warning"
                      }`}
                  />
                  <span className="text-xs font-semibold text-foreground">{subject.subject}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{subject.avg.toFixed(1)}% avg</span>
                </div>
                <div className="flex items-end gap-1.5">
                  {subject.scores.map((score, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-muted" style={{ height: "60px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${subject.subject === "Physics"
                            ? "bg-primary/70"
                            : subject.subject === "Chemistry"
                              ? "bg-accent/70"
                              : "bg-warning/70"
                            }`}
                          style={{
                            height: `${Math.max(0, Math.min(score, 100))}%`,
                            marginTop: `${60 - (Math.max(0, Math.min(score, 100)) / 100) * 60}px`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">T{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Rank History</h2>
        </div>
        <div className="flex h-40 items-end gap-2">
          {rankHistory.length === 0 ? (
            <div className="w-full text-center text-xs text-muted-foreground">No history available</div>
          ) : (
            rankHistory.map((point, index) => {
              const maxRank = Math.max(...rankHistory.map((item) => item.rank));
              const height = ((maxRank - point.rank) / Math.max(maxRank, 1)) * 100 + 20;
              return (
                <div key={`${point.week}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">{point.rank}</span>
                  <div className="w-full rounded-t-lg bg-primary/80 transition-all" style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-muted-foreground">{point.week}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Topic Mastery</h2>
        </div>
        <div className="flex flex-col gap-3">
          {(topicMastery.length === 0
            ? [{ topic: "General", mastery: 0 }]
            : topicMastery.map((item) => ({ topic: item.topic, mastery: item.mastery }))
          ).map((topic) => (
            <div key={topic.topic} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{topic.topic}</span>
                <span className="text-xs font-semibold text-muted-foreground">{topic.mastery}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${topic.mastery >= 85
                    ? "bg-accent"
                    : topic.mastery >= 70
                      ? "bg-primary"
                      : "bg-warning"
                    }`}
                  style={{ width: `${Math.max(0, Math.min(topic.mastery, 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
