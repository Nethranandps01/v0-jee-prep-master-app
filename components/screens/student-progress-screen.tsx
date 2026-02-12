"use client";

import { useApp } from "@/lib/app-context";
import { sampleProgress, sampleSubjectWiseMarks } from "@/lib/sample-data";
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

export function StudentProgressScreen() {
  const { studentYear } = useApp();
  const year = studentYear || "12th";
  const subjectMarks = sampleSubjectWiseMarks[year];

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            #{sampleProgress.overallRank}
          </span>
          <span className="text-[11px] text-muted-foreground">Overall Rank</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {(sampleProgress.totalStudents / 1000).toFixed(0)}K
          </span>
          <span className="text-[11px] text-muted-foreground">Total Students</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {sampleProgress.streak}
          </span>
          <span className="text-[11px] text-muted-foreground">Day Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {sampleProgress.testsCompleted}
          </span>
          <span className="text-[11px] text-muted-foreground">Tests Done</span>
        </div>
      </div>

      {/* Subject-wise Performance */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Subject-wise Marks
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          {subjectMarks.map((sub) => {
            const baseName = sub.subject.replace(/ [12]$/, "");
            const Icon = subjectIcons[baseName] || BarChart3;
            return (
              <div key={sub.subject} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${
                    baseName === "Physics" ? "text-primary" : baseName === "Chemistry" ? "text-accent" : "text-warning"
                  }`} />
                  <span className="text-xs font-semibold text-foreground">{sub.subject}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{sub.avg.toFixed(1)}% avg</span>
                </div>
                {/* Mini trend (last 5 scores) */}
                <div className="flex items-end gap-1.5">
                  {sub.scores.map((score, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-muted" style={{ height: "60px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            baseName === "Physics" ? "bg-primary/70" : baseName === "Chemistry" ? "bg-accent/70" : "bg-warning/70"
                          }`}
                          style={{ height: `${score}%`, marginTop: `${60 - (score / 100) * 60}px` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">T{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rank History Chart */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Rank History</h2>
        </div>
        <div className="flex h-40 items-end gap-2">
          {sampleProgress.rankHistory.map((point) => {
            const maxRank = Math.max(...sampleProgress.rankHistory.map((p) => p.rank));
            const height = ((maxRank - point.rank) / maxRank) * 100 + 20;
            return (
              <div key={point.week} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground">{point.rank}</span>
                <div className="w-full rounded-t-lg bg-primary/80 transition-all" style={{ height: `${height}%` }} />
                <span className="text-[10px] text-muted-foreground">{point.week}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic Mastery */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Topic Mastery</h2>
        </div>
        <div className="flex flex-col gap-3">
          {sampleProgress.topicMastery.map((topic) => (
            <div key={topic.topic} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{topic.topic}</span>
                <span className="text-xs font-semibold text-muted-foreground">{topic.mastery}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    topic.mastery >= 85 ? "bg-accent" : topic.mastery >= 70 ? "bg-primary" : "bg-warning"
                  }`}
                  style={{ width: `${topic.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
