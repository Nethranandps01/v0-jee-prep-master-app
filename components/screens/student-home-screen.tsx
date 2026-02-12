"use client";

import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { sampleTests, sampleProgress, sampleSubjectWiseMarks } from "@/lib/sample-data";
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

export function StudentHomeScreen() {
  const { userName, navigate, setActiveTestId, studentYear } = useApp();
  const year = studentYear || "12th";

  const assignedTests = sampleTests.filter(
    (t) => t.status === "assigned" && t.year === year
  );
  const completedTests = sampleTests.filter(
    (t) => t.status === "completed" && t.year === year
  );

  const subjectMarks = sampleSubjectWiseMarks[year];
  const subjectSuffix = year === "11th" ? "1" : "2";

  const subjectIcons: Record<string, typeof Atom> = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Mathematics: Calculator,
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Greeting */}
      <div className="animate-fade-in flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {year} Class
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground text-balance">
          {userName}
        </h1>
      </div>

      {/* Stats Row */}
      <div className="animate-fade-in flex gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-card p-4 border border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {sampleProgress.streak}
          </span>
          <span className="text-[11px] text-muted-foreground">Day Streak</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-card p-4 border border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {sampleProgress.avgScore}%
          </span>
          <span className="text-[11px] text-muted-foreground">Avg Score</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-card p-4 border border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-bold text-foreground">
            #{sampleProgress.overallRank}
          </span>
          <span className="text-[11px] text-muted-foreground">Rank</span>
        </div>
      </div>

      {/* Subject-wise Latest Scores */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="text-base font-semibold text-foreground">
          Subject Scores
        </h2>
        <div className="flex gap-3">
          {subjectMarks.map((sub) => {
            const baseName = sub.subject.replace(` ${subjectSuffix}`, "");
            const Icon = subjectIcons[baseName] || BookOpen;
            const latestScore = sub.scores[sub.scores.length - 1];
            return (
              <div
                key={sub.subject}
                className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  baseName === "Physics" ? "bg-primary/15" : baseName === "Chemistry" ? "bg-accent/15" : "bg-warning/15"
                }`}>
                  <Icon className={`h-4 w-4 ${
                    baseName === "Physics" ? "text-primary" : baseName === "Chemistry" ? "text-accent" : "text-warning"
                  }`} />
                </div>
                <span className="text-lg font-bold text-foreground">{latestScore}%</span>
                <span className="text-[10px] text-muted-foreground text-center">{sub.subject}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Assistant Card */}
      <button
        onClick={() => navigate("ai-chat")}
        className="animate-fade-in flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            AI Study Assistant
          </span>
          <span className="text-xs text-muted-foreground">
            Ask doubts, get explanations, practice problems
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Upcoming Tests */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Upcoming Tests
          </h2>
          <button
            onClick={() => navigate("student-tests")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {assignedTests.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No upcoming tests for {year} class</p>
            </div>
          )}
          {assignedTests.map((test) => (
            <button
              key={test.id}
              onClick={() => {
                setActiveTestId(test.id);
                navigate("student-test-active");
              }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {test.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {test.subject}
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {test.duration} min
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {test.questions} Qs
                  </span>
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
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Results */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Recent Results
          </h2>
          <button
            onClick={() => navigate("student-progress")}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {completedTests.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No results yet</p>
            </div>
          )}
          {completedTests.map((test) => (
            <button
              key={test.id}
              onClick={() => {
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
                    strokeDasharray={`${(test.score! / 100) * 125.6} 125.6`}
                  />
                </svg>
                <span className="absolute text-xs font-bold text-foreground">
                  {test.score}%
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {test.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {test.subject}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "500ms" }}
      >
        <h2 className="text-base font-semibold text-foreground">
          Quick Actions
        </h2>
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
