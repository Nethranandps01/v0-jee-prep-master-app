"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sampleResults, sampleDetailedQuestions } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  Share2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Filter,
} from "lucide-react";

type QuestionFilter = "all" | "correct" | "wrong" | "skipped";
type SubjectFilter = "All" | "Physics" | "Chemistry" | "Mathematics";

export function StudentResultsScreen() {
  const { navigate } = useApp();
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("All");

  const filteredQuestions = sampleDetailedQuestions.filter((q) => {
    if (subjectFilter !== "All" && q.subject !== subjectFilter) return false;
    if (questionFilter === "correct" && !q.isCorrect) return false;
    if (questionFilter === "wrong" && (q.isCorrect || q.selectedAnswer === null)) return false;
    if (questionFilter === "skipped" && q.selectedAnswer !== null) return false;
    return true;
  });

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("student-home")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Test Results</h1>
        <button
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Share results"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Score Card */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(sampleResults.totalScore / 100) * 301.6} 301.6`} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">{sampleResults.totalScore}%</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <span className="text-base font-semibold text-foreground">Great Performance!</span>
          </div>
          <span className="text-sm text-muted-foreground">Percentile: {sampleResults.percentile}</span>
        </div>
        <div className="flex w-full gap-3 pt-2">
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-accent/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span className="text-lg font-bold text-foreground">{sampleResults.correctAnswers}</span>
            <span className="text-[10px] text-muted-foreground">Correct</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-destructive/10 p-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-lg font-bold text-foreground">{sampleResults.incorrectAnswers}</span>
            <span className="text-[10px] text-muted-foreground">Incorrect</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-muted p-3">
            <MinusCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-bold text-foreground">{sampleResults.unattempted}</span>
            <span className="text-[10px] text-muted-foreground">Skipped</span>
          </div>
        </div>
      </div>

      {/* Subject-wise Breakdown */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Subject-wise Performance</h2>
        </div>
        <div className="flex flex-col gap-3">
          {sampleResults.subjectWise.map((sub) => (
            <div key={sub.subject} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{sub.subject}</span>
                <span className="text-xs font-semibold text-muted-foreground">{sub.score}/{sub.total * 10}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(sub.score / (sub.total * 10)) * 100}%`, backgroundColor: sub.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Difficulty Breakdown</h2>
        </div>
        <div className="flex gap-3">
          {sampleResults.difficultyWise.map((diff) => (
            <div key={diff.name} className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-muted/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${diff.color}20` }}>
                <span className="text-sm font-bold" style={{ color: diff.color }}>{diff.value}</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{diff.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Question Analysis Toggle */}
      <button
        onClick={() => setShowAnalysis(!showAnalysis)}
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">Detailed Question Analysis</span>
        </div>
        {showAnalysis ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {showAnalysis && (
        <div className="animate-fade-in flex flex-col gap-4">
          {/* Question Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2 overflow-x-auto">
                {(["all", "correct", "wrong", "skipped"] as QuestionFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setQuestionFilter(f)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                      questionFilter === f
                        ? f === "correct" ? "bg-accent text-accent-foreground"
                          : f === "wrong" ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(["All", "Physics", "Chemistry", "Mathematics"] as SubjectFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    subjectFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Question List */}
          <div className="flex flex-col gap-3">
            {filteredQuestions.map((q, idx) => (
              <div key={q.questionId} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleQuestion(q.questionId)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    q.isCorrect ? "bg-accent/15" : q.selectedAnswer === null ? "bg-muted" : "bg-destructive/15"
                  }`}>
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : q.selectedAnswer === null ? (
                      <MinusCircle className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground line-clamp-2">
                      Q{idx + 1}. {q.questionText}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {q.topic}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{q.subject}</span>
                    </div>
                  </div>
                  {expandedQuestion === q.questionId ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {expandedQuestion === q.questionId && (
                  <div className="animate-fade-in border-t border-border p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground">Your Answer:</span>
                          <span className={`text-[11px] font-semibold ${q.isCorrect ? "text-accent" : "text-destructive"}`}>
                            {q.selectedAnswer || "Not Attempted"}
                          </span>
                        </div>
                        {!q.isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">Correct Answer:</span>
                            <span className="text-[11px] font-semibold text-accent">{q.correctAnswer}</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-[11px] leading-relaxed text-foreground">
                          <span className="font-semibold">Explanation: </span>
                          {q.explanation}
                        </p>
                      </div>

                      {q.isCorrect && (
                        <div className="rounded-xl bg-accent/10 p-3">
                          <p className="text-[11px] font-medium text-accent">Well done! You got this one right.</p>
                        </div>
                      )}

                      {!q.isCorrect && q.improvisation && (
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-foreground">Improvisation Tips</span>
                              <p className="text-[11px] leading-relaxed text-muted-foreground">{q.improvisation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate("student-feedback")}
          className="flex-1 rounded-2xl bg-transparent py-5 text-foreground"
        >
          Give Feedback
        </Button>
        <Button
          onClick={() => navigate("student-home")}
          className="flex-1 rounded-2xl bg-primary py-5 text-primary-foreground"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
