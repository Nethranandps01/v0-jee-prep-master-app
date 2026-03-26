"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  AttemptQuestionResponse,
  saveStudentAnswers,
  startStudentTest,
  submitStudentAttempt,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Trophy,
} from "lucide-react";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export function StudentTestActiveScreen() {
  const {
    navigate,
    activeTestId,
    authToken,
    setCompletedTestId,
    setActiveAttemptId,
    setAttemptQuestions,
    setAttemptAnswers,
  } = useApp();

  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState<AttemptQuestionResponse[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [resultData, setResultData] = useState<{ score: number; raw_score?: number; max_score?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const autoSubmitTriggeredRef = useRef(false);

  const buildAnswerPayload = useCallback(
    (list: (number | null)[]) => {
      const payload: Record<string, number | null> = {};
      questions.forEach((question, index) => {
        payload[question.id] = list[index] ?? null;
      });
      return payload;
    },
    [questions],
  );

  useEffect(() => {
    if (!hasAgreed) return;
    let cancelled = false;

    const initAttempt = async () => {
      if (!authToken) {
        setError("Student login is required.");
        setLoading(false);
        return;
      }
      if (!activeTestId) {
        setError("No test selected. Please choose a test first.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setActionError(null);
      setCompletedTestId(null);

      try {
        const started = await startStudentTest(authToken, activeTestId);
        if (cancelled) return;

        const receivedQuestions = started.questions || [];
        setQuestions(receivedQuestions);
        setAttemptQuestions(receivedQuestions);

        const savedAnswers = started.answers || {};
        const initialAnswers = receivedQuestions.map((question) => {
          const value = savedAnswers[question.id];
          return typeof value === "number" && value >= 0 ? value : null;
        });
        setAnswers(initialAnswers);
        setAttemptAnswers(initialAnswers);

        setFlagged(new Array(receivedQuestions.length).fill(false));
        const totalDurationSeconds = Math.max(started.duration, 1) * 60;
        const startedAtMillis = new Date(started.started_at).getTime();
        const elapsedSeconds = Number.isNaN(startedAtMillis)
          ? 0
          : Math.max(0, Math.floor((Date.now() - startedAtMillis) / 1000));
        const remainingSeconds = Math.max(totalDurationSeconds - elapsedSeconds, 0);
        setTimeLeft(remainingSeconds);
        setAttemptId(started.attempt_id);
        setActiveAttemptId(started.attempt_id);
        setCurrentQ(0);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to start test.");
          }
          setQuestions([]);
          setAnswers([]);
          setFlagged([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initAttempt();

    return () => {
      cancelled = true;
    };
  }, [
    activeTestId,
    authToken,
    setActiveAttemptId,
    setAttemptAnswers,
    setAttemptQuestions,
    setCompletedTestId,
    hasAgreed,
  ]);

  useEffect(() => {
    if (loading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });

      // Update time spent on current question
      if (questions[currentQ]) {
        const qId = questions[currentQ].id;
        setTimeSpent((prev) => ({
          ...prev,
          [qId]: (prev[qId] || 0) + 1,
        }));
      }

    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [loading, timeLeft, currentQ, questions]);

  useEffect(() => {
    if (!authToken || !attemptId || loading || questions.length === 0) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await saveStudentAnswers(authToken, attemptId, buildAnswerPayload(answers), timeSpent);
      } catch {
        // Silent background failure; explicit save happens again on submit.
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [answers, attemptId, authToken, buildAnswerPayload, loading, questions.length]);

  const submitNow = useCallback(
    async (violationReason?: string) => {
      if (!authToken || !attemptId || submitting) return;

      const normalizedViolationReason = (violationReason || "").trim();
      const isAutoSubmit = Boolean(normalizedViolationReason);
      if (isAutoSubmit && autoSubmitTriggeredRef.current) return;
      if (isAutoSubmit) {
        autoSubmitTriggeredRef.current = true;
        setShowSubmitConfirm(false);
      }

      setSubmitting(true);
      setActionError(null);

      try {
        if (isAutoSubmit) {
          try {
            await saveStudentAnswers(authToken, attemptId, buildAnswerPayload(answers), timeSpent);
          } catch {
            // On mobile app-switch/unload, save can be interrupted; still submit attempt immediately.
          }
        } else {
          await saveStudentAnswers(authToken, attemptId, buildAnswerPayload(answers), timeSpent);
        }

        const submitted = await submitStudentAttempt(authToken, attemptId, {
          ...(isAutoSubmit ? { violation_reason: normalizedViolationReason } : {}),
          time_spent: timeSpent,
        }, {
          keepalive: isAutoSubmit,
        });
        setCompletedTestId(submitted.attempt_id);
        setAttemptAnswers(answers);
        setResultData({
          score: submitted.score,
          raw_score: submitted.raw_score,
          max_score: submitted.max_score,
        });
        setShowResultPopup(true);
        // We stay on this screen to show the popup. Navigation happens via popup button.
      } catch (err) {
        if (err instanceof ApiError) {
          setActionError(err.detail);
        } else {
          setActionError("Failed to submit test.");
        }
        setSubmitting(false);
        if (isAutoSubmit) {
          autoSubmitTriggeredRef.current = false;
        }
      }
    },
    [
      answers,
      attemptId,
      authToken,
      buildAnswerPayload,
      navigate,
      setAttemptAnswers,
      setCompletedTestId,
      submitting,
    ],
  );

  useEffect(() => {
    if (loading || timeLeft > 0 || submitting) return;
    void submitNow();
  }, [loading, submitNow, submitting, timeLeft]);

  useEffect(() => {
    if (!authToken || !attemptId || loading || questions.length === 0 || submitting) {
      return;
    }

    const handleFocusViolation = () => {
      void submitNow("Student switched tab or app during active test");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleFocusViolation();
      }
    };
    const handleContextMenu = (event: MouseEvent) => {
      // Block right-click tools (including browser capture/Lens entry points) during test.
      event.preventDefault();
      void submitNow("Opened context menu during active test (possible capture attempt)");
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isScreenshotShortcut =
        key === "printscreen" ||
        ((event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          (key === "s" || key === "4" || key === "5"));
      if (isScreenshotShortcut) {
        event.preventDefault();
        void submitNow("Screenshot shortcut detected during active test");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleFocusViolation);
    window.addEventListener("pagehide", handleFocusViolation);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleFocusViolation);
      window.removeEventListener("pagehide", handleFocusViolation);
    };
  }, [attemptId, authToken, loading, questions.length, submitNow, submitting]);

  const handleAnswer = (optionIdx: number) => {
    const next = [...answers];
    next[currentQ] = next[currentQ] === optionIdx ? null : optionIdx;
    setAnswers(next);
    setAttemptAnswers(next);
  };

  const toggleFlag = () => {
    setFlagged((previous) => {
      const next = [...previous];
      next[currentQ] = !next[currentQ];
      return next;
    });
  };

  const answeredCount = useMemo(() => answers.filter((answer) => answer !== null).length, [answers]);
  const flaggedCount = useMemo(() => flagged.filter(Boolean).length, [flagged]);
  const question = questions[currentQ];

  if (!hasAgreed) {
    return (
      <div className="flex min-h-screen flex-col bg-background px-6 py-8 pb-[env(safe-area-inset-bottom)] pt-[calc(2rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-foreground">Exam Instructions</h1>
            <p className="text-xs text-muted-foreground">Please review the rules before beginning.</p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest opacity-70">Exam Rules</h3>
              <ul className="flex flex-col gap-2.5">
                {[
                  "Ensure a stable internet connection.",
                  "Timer starts immediately after proceeding.",
                  "Do NOT switch tabs (Proctored mode).",
                  "Right-click and screenshots are disabled.",
                  "Answers are automatically saved."
                ].map((rule, idx) => (
                  <li key={idx} className="flex gap-2.5 text-[11px] leading-snug text-muted-foreground">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {idx + 1}
                    </div>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest opacity-70">Marking</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-1.5 font-bold">Type</th>
                      <th className="px-1.5 py-1.5 font-bold text-center">Correct</th>
                      <th className="px-1.5 py-1.5 font-bold text-center">Wrong</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { type: "MCQ (Main)", c: "+4", w: "-1" },
                      { type: "Numerical", c: "+4", w: "0" },
                      { type: "Adv Single", c: "+3", w: "-1" },
                      { type: "Adv Multiple", c: "+4/P", w: "-2" },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="px-2.5 py-1.5 font-medium">{row.type}</td>
                        <td className="px-1.5 py-1.5 text-center text-primary font-bold">{row.c}</td>
                        <td className="px-1.5 py-1.5 text-center text-destructive font-bold">{row.w}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-orange-500/5 p-3 border border-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Violations will result in automatic submission. 
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => setHasAgreed(true)}
              className="rounded-xl h-12 bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98]"
            >
              Start Exam
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("student-tests")}
              className="h-10 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground">
          Starting test...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error}</p>
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

  if (!question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">No questions found for this test.</p>
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

  if (showResultPopup && resultData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background/60 px-6 backdrop-blur-sm">
        <div className="flex w-full max-w-[280px] flex-col items-center gap-4 rounded-[2rem] border border-primary/10 bg-card p-6 shadow-xl animate-in zoom-in-95 duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-lg font-bold text-foreground opacity-80">Test Result</h2>
            <div className="flex flex-col items-center mt-1">
              <span className="text-4xl font-black text-primary tracking-tighter">
                {resultData.raw_score ?? resultData.score}
              </span>
              <div className="flex flex-col opacity-60">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]">
                  Marks Obtained
                </span>
                {resultData.max_score && (
                  <span className="text-[9px] font-medium italic">
                    Out of {resultData.max_score}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex w-full flex-col gap-2 mt-2">
            <Button
              onClick={() => navigate("student-results")}
              className="w-full rounded-xl bg-primary h-11 text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98]"
            >
              Analyze Results
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("student-home")}
              className="w-full rounded-xl h-10 text-[10px] font-semibold border-muted-foreground/10 text-muted-foreground"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showSubmitConfirm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">Submit Test?</h2>
            <p className="text-sm text-muted-foreground">
              You have answered {answeredCount} of {questions.length} questions.
              {flaggedCount > 0 && ` ${flaggedCount} flagged for review.`}
            </p>
            {actionError && <span className="text-xs text-destructive">{actionError}</span>}
          </div>
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSubmitConfirm(false)}
              className="flex-1 rounded-xl bg-transparent py-5 text-foreground"
              disabled={submitting}
            >
              Review
            </Button>
            <Button
              onClick={() => void submitNow()}
              className="flex-1 rounded-xl bg-primary py-5 text-primary-foreground"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <button
          onClick={() => setShowSubmitConfirm(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Exit test"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span
            className={`text-sm font-mono font-semibold ${timeLeft < 300 ? "text-destructive" : "text-foreground"
              }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
        <button
          onClick={toggleFlag}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${flagged[currentQ]
            ? "bg-warning/15 text-warning"
            : "text-muted-foreground hover:bg-muted"
            }`}
          aria-label={flagged[currentQ] ? "Remove flag" : "Flag question"}
        >
          <Flag className="h-5 w-5" />
        </button>
      </header>

      <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentQ(idx)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium transition-all ${idx === currentQ
              ? "bg-primary text-primary-foreground"
              : answers[idx] !== null
                ? "bg-accent/15 text-accent"
                : flagged[idx]
                  ? "bg-warning/15 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            aria-label={`Question ${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-32 pt-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {question.subject}
          </span>
          <span className="text-xs text-muted-foreground">
            Q{currentQ + 1} of {questions.length}
          </span>
        </div>

        <p className="text-base font-medium leading-relaxed text-foreground">{question.text}</p>

        <div className="flex flex-col gap-3">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${answers[currentQ] === idx
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/30"
                }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${answers[currentQ] === idx
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
                  }`}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <span
                className={`text-sm ${answers[currentQ] === idx ? "font-medium text-foreground" : "text-foreground"
                  }`}
              >
                {option}
              </span>
              {answers[currentQ] === idx && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="flex-1 gap-1 rounded-xl bg-transparent py-5 text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          {currentQ === questions.length - 1 ? (
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              className="flex-1 rounded-xl bg-accent py-5 text-accent-foreground"
              disabled={submitting}
            >
              Submit Test
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
              className="flex-1 gap-1 rounded-xl bg-primary py-5 text-primary-foreground"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
