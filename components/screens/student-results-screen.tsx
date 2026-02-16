"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { ApiError, ResultQuestionResponse, ResultResponse, getStudentResult } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Trophy,
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

const colorMap: Record<string, string> = {
  Physics: "hsl(217, 91%, 60%)",
  Chemistry: "hsl(160, 84%, 39%)",
  Mathematics: "hsl(25, 95%, 53%)",
  General: "hsl(var(--primary))",
};

function optionLabel(index: number | null, options: string[]): string {
  if (index === null || index < 0 || index >= options.length) {
    return "Not Attempted";
  }
  return `${String.fromCharCode(65 + index)}. ${options[index]}`;
}

export function StudentResultsScreen() {
  const { navigate, completedTestId, authToken } = useApp();
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadResult = async () => {
      if (!authToken) {
        setError("Student login is required.");
        setLoading(false);
        return;
      }
      if (!completedTestId) {
        setError("No result selected. Open a completed test to view result.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getStudentResult(authToken, completedTestId);
        if (!cancelled) {
          setResult(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load result.");
          }
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [authToken, completedTestId]);

  const subjectWise = useMemo(() => {
    if (!result) return [];

    if (result.questions.length === 0) {
      return [
        {
          subject: result.subject || "General",
          score: result.correct_answers,
          total: result.total_questions,
          color: colorMap[result.subject] || colorMap.General,
        },
      ];
    }

    const grouped = new Map<string, { total: number; correct: number }>();
    result.questions.forEach((question) => {
      const key = question.subject || "General";
      const current = grouped.get(key) || { total: 0, correct: 0 };
      current.total += 1;
      if (question.is_correct) {
        current.correct += 1;
      }
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([subject, value]) => ({
      subject,
      score: value.correct,
      total: value.total,
      color: colorMap[subject] || colorMap.General,
    }));
  }, [result]);

  const availableSubjects = useMemo(() => {
    if (!result || result.questions.length === 0) return ["All"];
    return ["All", ...Array.from(new Set(result.questions.map((question) => question.subject || "General")))];
  }, [result]);

  const filteredQuestions = useMemo(() => {
    if (!result) return [];

    return result.questions.filter((question) => {
      if (subjectFilter !== "All" && question.subject !== subjectFilter) return false;
      if (questionFilter === "correct" && !question.is_correct) return false;
      if (questionFilter === "wrong" && (question.is_correct || question.selected_answer === null)) return false;
      if (questionFilter === "skipped" && question.selected_answer !== null) return false;
      return true;
    });
  }, [questionFilter, result, subjectFilter]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  const handleShare = async () => {
    if (!result) return;

    const text = `I scored ${result.score}% in ${result.subject}. Correct: ${result.correct_answers}/${result.total_questions}.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "JEE Test Result",
          text,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // No-op if sharing is unavailable or cancelled.
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground">
          Loading result...
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error || "Result not available."}</p>
          <Button
            onClick={() => navigate("student-tests")}
            className="rounded-xl bg-primary text-primary-foreground"
          >
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
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
          onClick={() => {
            void handleShare();
          }}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Share results"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(result.score / 100) * 301.6} 301.6`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">{result.score}%</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <span className="text-base font-semibold text-foreground">Performance Summary</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Subject: {result.subject} • Attempted: {result.answered}/{result.total_questions}
          </span>
        </div>
        <div className="flex w-full gap-3 pt-2">
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-accent/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span className="text-lg font-bold text-foreground">{result.correct_answers}</span>
            <span className="text-[10px] text-muted-foreground">Correct</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-destructive/10 p-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-lg font-bold text-foreground">{result.incorrect_answers}</span>
            <span className="text-[10px] text-muted-foreground">Incorrect</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-muted p-3">
            <MinusCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-bold text-foreground">{result.unattempted}</span>
            <span className="text-[10px] text-muted-foreground">Skipped</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Subject-wise Performance</h2>
        </div>
        <div className="flex flex-col gap-3">
          {subjectWise.map((sub) => (
            <div key={sub.subject} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{sub.subject}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {sub.score}/{sub.total}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${sub.total === 0 ? 0 : (sub.score / sub.total) * 100}%`, backgroundColor: sub.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Attempt Breakdown</h2>
        </div>
        <div className="flex gap-3">
          {[
            { name: "Correct", value: result.correct_answers, color: "hsl(var(--accent))" },
            { name: "Wrong", value: result.incorrect_answers, color: "hsl(var(--destructive))" },
            { name: "Skipped", value: result.unattempted, color: "hsl(var(--muted-foreground))" },
          ].map((item) => (
            <div key={item.name} className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-muted/50 p-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <span className="text-sm font-bold" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

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
          {result.questions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Detailed per-question analysis is not available for this attempt.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-2 overflow-x-auto">
                    {(["all", "correct", "wrong", "skipped"] as QuestionFilter[]).map((filterValue) => (
                      <button
                        key={filterValue}
                        onClick={() => setQuestionFilter(filterValue)}
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                          questionFilter === filterValue
                            ? filterValue === "correct"
                              ? "bg-accent text-accent-foreground"
                              : filterValue === "wrong"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {filterValue}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setSubjectFilter(subject)}
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        subjectFilter === subject
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredQuestions.map((question, idx) => (
                  <ResultQuestionCard
                    key={question.question_id}
                    question={question}
                    index={idx}
                    expanded={expandedQuestion === question.question_id}
                    onToggle={() => toggleQuestion(question.question_id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

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

function ResultQuestionCard({
  question,
  index,
  expanded,
  onToggle,
}: {
  question: ResultQuestionResponse;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            question.is_correct
              ? "bg-accent/15"
              : question.selected_answer === null
                ? "bg-muted"
                : "bg-destructive/15"
          }`}
        >
          {question.is_correct ? (
            <CheckCircle2 className="h-4 w-4 text-accent" />
          ) : question.selected_answer === null ? (
            <MinusCircle className="h-4 w-4 text-muted-foreground" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-xs font-medium text-foreground">
            Q{index + 1}. {question.question_text}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              {question.subject}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="animate-fade-in border-t border-border p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">Your Answer:</span>
                <span
                  className={`text-[11px] font-semibold ${
                    question.is_correct ? "text-accent" : "text-destructive"
                  }`}
                >
                  {optionLabel(question.selected_answer, question.options)}
                </span>
              </div>
              {!question.is_correct && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Correct Answer:</span>
                  <span className="text-[11px] font-semibold text-accent">
                    {optionLabel(question.correct_answer, question.options)}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[11px] leading-relaxed text-foreground">
                <span className="font-semibold">Explanation: </span>
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
