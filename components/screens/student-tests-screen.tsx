"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sampleTests } from "@/lib/sample-data";
import {
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Filter,
} from "lucide-react";

const statusFilters = ["All", "Assigned", "Completed"];

export function StudentTestsScreen() {
  const { navigate, setActiveTestId, studentYear } = useApp();
  const year = studentYear || "12th";
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSubject, setActiveSubject] = useState("All");

  const subjectSuffix = year === "11th" ? "1" : "2";
  const subjectFilters = [
    "All",
    `Physics ${subjectSuffix}`,
    `Chemistry ${subjectSuffix}`,
    `Mathematics ${subjectSuffix}`,
  ];

  const filteredTests = sampleTests.filter((test) => {
    if (test.year !== year) return false;
    if (activeFilter !== "All" && test.status !== activeFilter.toLowerCase()) return false;
    if (activeSubject !== "All" && !test.subject.includes(activeSubject.replace(` ${subjectSuffix}`, ""))) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">My Tests</h1>
        <p className="text-sm text-muted-foreground">
          {year} Class - {filteredTests.length} tests
        </p>
      </div>

      {/* Status Filters */}
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

      {/* Subject Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjectFilters.map((subject) => (
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

      {/* Test List */}
      <div className="flex flex-col gap-3">
        {filteredTests.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No tests found</p>
          </div>
        )}
        {filteredTests.map((test, index) => (
          <button
            key={test.id}
            onClick={() => {
              if (test.status === "assigned") {
                setActiveTestId(test.id);
                navigate("student-test-active");
              } else {
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
            <div className="flex flex-col items-end gap-1">
              {test.score !== null && (
                <span className="text-lg font-bold text-primary">
                  {test.score}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {test.dueDate}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
