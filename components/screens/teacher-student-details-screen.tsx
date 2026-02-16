"use client";

import { useMemo, useState, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import {
    ApiError,
    TeacherStudentAttemptResponse,
    getStudentAttempts,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    Search,
    User,
    ShieldAlert,
    ChevronDown,
} from "lucide-react";

export function TeacherStudentDetailsScreen() {
    const { navigate, authToken, selectedStudentId } = useApp();
    const [attempts, setAttempts] = useState<TeacherStudentAttemptResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set());

    const toggleAttempt = (attemptId: string) => {
        setExpandedAttempts((prev) => {
            const next = new Set(prev);
            if (next.has(attemptId)) {
                next.delete(attemptId);
            } else {
                next.add(attemptId);
            }
            return next;
        });
    };

    useEffect(() => {
        const fetchDetails = async () => {
            if (!authToken || !selectedStudentId) {
                setLoading(false);
                return;
            }

            try {
                const data = await getStudentAttempts(authToken, selectedStudentId);
                setAttempts(data);
            } catch (err) {
                if (err instanceof ApiError) {
                    setError(err.detail);
                } else {
                    setError("Failed to load student details.");
                }
            } finally {
                setLoading(false);
            }
        };

        void fetchDetails();
    }, [authToken, selectedStudentId]);

    if (!selectedStudentId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-muted-foreground">No student selected.</p>
                    <Button onClick={() => navigate("teacher-classes")}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 px-4 py-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate("teacher-classes")}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-xl font-bold text-foreground">Student Performance</h1>
                    <p className="text-xs text-muted-foreground">Test history & proctoring logs</p>
                </div>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                </div>
            ) : error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : attempts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No test attempts found for this student.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {attempts.map((attempt) => (
                        <div
                            key={attempt.attempt_id}
                            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <h3 className="font-semibold text-foreground">{attempt.test_title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-full bg-muted px-2 py-0.5">{attempt.subject}</span>
                                        <span>•</span>
                                        <span>
                                            {attempt.submitted_at
                                                ? new Date(attempt.submitted_at).toLocaleDateString()
                                                : "Unknown Date"}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold leading-none ${attempt.score >= 80
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : attempt.score >= 50
                                            ? "bg-warning/10 text-warning"
                                            : "bg-destructive/10 text-destructive"
                                        }`}
                                >
                                    {attempt.score}%
                                </div>
                            </div>

                            {attempt.is_suspicious && (
                                <div className="mt-1 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                                    <ShieldAlert className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold text-destructive">Proctoring Alert</span>
                                        <span className="text-xs text-destructive/80">
                                            {attempt.violation_reason || "Auto-submitted due to suspicious activity."}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t border-border/50 pt-3">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>{attempt.total_questions} Questions</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleAttempt(attempt.attempt_id)}
                                    className="h-8 gap-1 rounded-lg text-xs text-primary hover:bg-primary/5 hover:text-primary"
                                >
                                    {expandedAttempts.has(attempt.attempt_id) ? "Hide Details" : "View Analysis"}
                                    <ChevronDown
                                        className={`h-3.5 w-3.5 transition-transform ${expandedAttempts.has(attempt.attempt_id) ? "rotate-180" : ""
                                            }`}
                                    />
                                </Button>
                            </div>

                            {expandedAttempts.has(attempt.attempt_id) && attempt.questions && (
                                <div className="animate-slide-down mt-2 flex flex-col gap-3 border-t border-border/50 pt-3">
                                    {attempt.questions.map((q, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex flex-1 flex-col gap-2">
                                                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div className={`rounded-lg border px-3 py-2 text-xs ${q.is_correct
                                                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                                            : "border-destructive/20 bg-destructive/10 text-destructive"
                                                            }`}>
                                                            <span className="mb-0.5 block font-semibold opacity-70">Student Answer</span>
                                                            <div className="flex items-center justify-between">
                                                                <span>{q.selected_option || "Not Answered"}</span>
                                                                {q.time_spent !== undefined && (
                                                                    <span className="flex items-center gap-1 rounded-full bg-background/50 px-1.5 py-0.5 text-[10px] font-medium opacity-80 shadow-sm">
                                                                        <Clock className="h-3 w-3" />
                                                                        {q.time_spent}s
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {!q.is_correct && (
                                                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600">
                                                                <span className="mb-0.5 block font-semibold opacity-70">Correct Answer</span>
                                                                {q.correct_option}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {q.explanation && (
                                                        <div className="mt-1 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                                                            <span className="font-semibold">Explanation: </span>
                                                            {q.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
