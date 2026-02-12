"use client";

import { useApp } from "@/lib/app-context";
import { sampleTeacherData, sampleLessonPlans } from "@/lib/sample-data";
import {
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ArrowRight,
  BarChart3,
  ClipboardList,
  BookOpen,
} from "lucide-react";

export function TeacherHomeScreen() {
  const { userName, navigate, teacherSubject } = useApp();
  const subject = teacherSubject || "Physics";

  const subjectPerformance = sampleTeacherData.performanceOverview.find(
    (p) => p.subject === subject
  );

  const recentLessons = sampleLessonPlans
    .filter((lp) => lp.subject === subject)
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Greeting */}
      <div className="animate-fade-in flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-bold text-foreground text-balance">
          {userName}
        </h1>
        <span className="mt-1 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {subject} Teacher
        </span>
      </div>

      {/* Quick Stats */}
      <div className="animate-fade-in flex gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {sampleTeacherData.classes.reduce((sum, c) => sum + c.students, 0)}
          </span>
          <span className="text-[11px] text-muted-foreground">Students</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {sampleTeacherData.recentPapers.length}
          </span>
          <span className="text-[11px] text-muted-foreground">Papers</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <TrendingUp className="h-5 w-5 text-warning" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {subjectPerformance?.avg || 0}%
          </span>
          <span className="text-[11px] text-muted-foreground">{subject} Avg</span>
        </div>
      </div>

      {/* Generate Paper CTA */}
      <button
        onClick={() => navigate("teacher-paper-generator")}
        className="animate-fade-in flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            AI Paper Generator
          </span>
          <span className="text-xs text-muted-foreground">
            Create custom {subject} papers with AI
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Lesson Plans Quick Action */}
      <button
        onClick={() => navigate("teacher-lesson-plans")}
        className="animate-fade-in flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-left transition-colors hover:bg-accent/10"
        style={{ animationDelay: "250ms" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <ClipboardList className="h-6 w-6 text-accent-foreground" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            Lesson Plans
          </span>
          <span className="text-xs text-muted-foreground">
            {recentLessons.length} plans for {subject}
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Subject Performance */}
      <div
        className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {subject} Performance
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {sampleTeacherData.classes.map((cls) => (
            <div key={cls.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{cls.name}</span>
                <span className="text-xs font-semibold text-muted-foreground">{cls.avgScore}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    cls.avgScore >= 80 ? "bg-accent" : cls.avgScore >= 70 ? "bg-primary" : "bg-warning"
                  }`}
                  style={{ width: `${cls.avgScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Lesson Plans */}
      {recentLessons.length > 0 && (
        <div
          className="animate-fade-in flex flex-col gap-3"
          style={{ animationDelay: "350ms" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Lesson Plans</h2>
            <button onClick={() => navigate("teacher-lesson-plans")} className="flex items-center gap-1 text-xs font-medium text-primary">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {recentLessons.map((lp) => (
              <div key={lp.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <BookOpen className="h-6 w-6 text-accent" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{lp.topic}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{lp.year}</span>
                    <span className="text-xs text-muted-foreground">{lp.duration} min</span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  lp.status === "published" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {lp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Papers */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Papers</h2>
          <button onClick={() => navigate("teacher-tests")} className="flex items-center gap-1 text-xs font-medium text-primary">
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {sampleTeacherData.recentPapers.map((paper) => (
            <div key={paper.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">{paper.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{paper.questions} Qs</span>
                  <span className="text-xs text-muted-foreground">{paper.created}</span>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                paper.assigned ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
              }`}>
                {paper.assigned ? `${paper.students} students` : "Draft"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Classes */}
      <div
        className="animate-fade-in flex flex-col gap-3"
        style={{ animationDelay: "500ms" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">My Classes</h2>
          <button onClick={() => navigate("teacher-classes")} className="flex items-center gap-1 text-xs font-medium text-primary">
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {sampleTeacherData.classes.map((cls) => (
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
                <span className="text-sm font-bold text-primary">{cls.avgScore}%</span>
                <span className="text-[10px] text-muted-foreground">avg score</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
