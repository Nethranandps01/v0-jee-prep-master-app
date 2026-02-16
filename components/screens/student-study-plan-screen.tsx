"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Clock, Calendar, BookOpen, AlertCircle, ChevronDown, Lock } from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
    getStudyPlan,
    completeStudyPlanTask,
    generateTaskQuiz,
    submitTaskQuiz,
    toggleStudyPlanSubtopic,
    type StudyPlanResponse,
    type StudyPlanTask,
    type QuizGenerateResponse,
    ApiError,
} from "@/lib/api-client";

export function StudentStudyPlanScreen() {
    const { navigate, authToken } = useApp();
    const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [activeQuizTask, setActiveQuizTask] = useState<StudyPlanTask | null>(null);
    const [quizData, setQuizData] = useState<QuizGenerateResponse | null>(null);

    useEffect(() => {
        const loadPlan = async () => {
            if (!authToken) return;
            try {
                const plan = await getStudyPlan(authToken);
                setStudyPlan(plan);
            } catch (err) {
                if (err instanceof ApiError) {
                    setError(err.detail);
                } else {
                    setError("Failed to load study plan.");
                }
            } finally {
                setLoading(false);
            }
        };
        void loadPlan();
    }, [authToken]);

    const handleStartQuiz = async (task: StudyPlanTask) => {
        if (!authToken) return;
        setLoading(true);
        try {
            const data = await generateTaskQuiz(authToken, task.id);
            setActiveQuizTask(task);
            setQuizData(data);
            setQuizModalOpen(true);
        } catch (err) {
            console.error("Failed to generate quiz:", err);
            alert("Failed to generate quiz. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleQuizComplete = (passed: boolean) => {
        setQuizModalOpen(false);
        setActiveQuizTask(null);
        setQuizData(null);

        if (passed && activeQuizTask) {
            setStudyPlan((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    tasks: prev.tasks.map((t) =>
                        t.id === activeQuizTask.id ? { ...t, status: "completed", quiz_status: "passed" } : t
                    ),
                };
            });
        }
    };

    const handleToggleSubtopic = async (taskId: string, subtopic: string) => {
        if (!authToken) return;

        // Optimistic update
        setStudyPlan(prev => {
            if (!prev) return null;
            return {
                ...prev,
                tasks: prev.tasks.map(t => {
                    if (t.id === taskId) {
                        const completed = t.completed_subtopics || [];
                        const newCompleted = completed.includes(subtopic)
                            ? completed.filter(s => s !== subtopic)
                            : [...completed, subtopic];
                        return { ...t, completed_subtopics: newCompleted };
                    }
                    return t;
                })
            };
        });

        try {
            await toggleStudyPlanSubtopic(authToken, taskId, subtopic);
        } catch (err) {
            console.error("Failed to toggle subtopic:", err);
            // Simple alert for now, could revert state ideally
        }
    };

    const groupTasks = (tasks: StudyPlanTask[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const oneDay = 24 * 60 * 60 * 1000;

        // Structure: Week Label -> { Day Label -> Tasks[] }
        const upcomingWeeks: Record<string, Record<string, StudyPlanTask[]>> = {};

        const groups = {
            overdue: [] as StudyPlanTask[],
            today: [] as StudyPlanTask[],
            upcomingWeeks,
            completed: [] as StudyPlanTask[],
        };

        tasks.forEach((task) => {
            if (task.status === "completed") {
                groups.completed.push(task);
                return;
            }

            const taskDate = new Date(task.due_date);
            taskDate.setHours(0, 0, 0, 0);

            if (taskDate < today) {
                groups.overdue.push(task);
            } else if (taskDate.getTime() === today.getTime()) {
                groups.today.push(task);
            } else {
                // Upcoming Logic
                const diffDays = Math.round(Math.abs((taskDate.getTime() - today.getTime()) / oneDay));
                const dayOfWeek = today.getDay(); // 0 is Sunday

                // Calculate days until next Monday (start of "Next Week")
                const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;

                let weekLabel = "";

                if (diffDays < daysUntilNextMonday) {
                    weekLabel = "This Week";
                } else if (diffDays < daysUntilNextMonday + 7) {
                    weekLabel = "Next Week";
                } else {
                    // Get the Monday of that week
                    const monday = new Date(taskDate);
                    const day = monday.getDay() || 7; // Make Sunday 7
                    if (day !== 1) monday.setHours(-24 * (day - 1));

                    weekLabel = `Week of ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                }

                if (!groups.upcomingWeeks[weekLabel]) {
                    groups.upcomingWeeks[weekLabel] = {};
                }

                const dayLabel = taskDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                if (!groups.upcomingWeeks[weekLabel][dayLabel]) {
                    groups.upcomingWeeks[weekLabel][dayLabel] = [];
                }

                groups.upcomingWeeks[weekLabel][dayLabel].push(task);
            }
        });

        // Sort tasks within days? They are likely already sorted or specific order doesn't matter as much as day grouping.
        // But we could ensure keys are sorted if needed. JS objects iterate insertion order mostly for strings, but better to be safe in rendering.

        return groups;
    };

    if (loading && !quizModalOpen) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center bg-background min-h-screen">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-muted-foreground">{error}</p>
                <button
                    onClick={() => navigate("student-home")}
                    className="text-sm font-medium text-accent hover:underline"
                >
                    Go Back Home
                </button>
            </div>
        );
    }

    const taskGroups = studyPlan ? groupTasks(studyPlan.tasks) : null;
    const progress = studyPlan ? Math.round((studyPlan.tasks.filter(t => t.status === "completed").length / studyPlan.tasks.length) * 100) : 0;

    return (
        <div className="flex min-h-screen flex-col bg-background pb-20 fade-in relative">
            {/* Quiz Modal */}
            {quizModalOpen && quizData && activeQuizTask && (
                <QuizModal
                    authToken={authToken!}
                    attemptId={quizData.attempt_id}
                    questions={quizData.questions}
                    onComplete={handleQuizComplete}
                    onClose={() => setQuizModalOpen(false)}
                />
            )}

            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("student-home")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">My Study Plan</h1>
                        <p className="text-xs text-muted-foreground">{progress}% Completed</p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {taskGroups && (
                    <>
                        {/* Overdue Section */}
                        {taskGroups.overdue.length > 0 && (
                            <section>
                                <h2 className="mb-3 text-sm font-semibold text-destructive flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Overdue
                                </h2>
                                <div className="space-y-3">
                                    {taskGroups.overdue.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onStartQuiz={() => handleStartQuiz(task)}
                                            onToggleSubtopic={handleToggleSubtopic}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Today Section */}
                        <section>
                            <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-accent" /> Today's Focus
                            </h2>
                            {taskGroups.today.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                    No tasks scheduled for today. caught up!
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {taskGroups.today.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onStartQuiz={() => handleStartQuiz(task)}
                                            onToggleSubtopic={handleToggleSubtopic}
                                            isToday
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Upcoming Section (Weekly -> Daily Groups) */}
                        {Object.keys(taskGroups.upcomingWeeks).length > 0 && (
                            <div className="space-y-8">
                                {Object.entries(taskGroups.upcomingWeeks).map(([weekLabel, days]) => (
                                    <section key={weekLabel}>
                                        <div className="sticky top-[4.5rem] z-0 bg-background/95 backdrop-blur-sm py-2 mb-2 border-b border-border/50">
                                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" /> {weekLabel}
                                            </h2>
                                        </div>

                                        <div className="space-y-6 pl-2">
                                            {Object.entries(days)
                                                // Sort by date key if needed, or rely on generation order. 
                                                // Since keys are "Monday, ...", sorting string isn't perfect.
                                                // Ideally we sort by timestamp, but object keys are unordered.
                                                // Let's assume insertion order or re-sort if strictly needed.
                                                .map(([dayLabel, tasks]) => (
                                                    <div key={dayLabel} className="relative pl-4 border-l-2 border-muted">
                                                        <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-muted border border-background" />
                                                        <h3 className="text-xs font-semibold text-muted-foreground mb-3">{dayLabel}</h3>
                                                        <div className="space-y-4">
                                                            {tasks.map(task => (
                                                                <TaskCard
                                                                    key={task.id}
                                                                    task={task}
                                                                    onStartQuiz={() => handleStartQuiz(task)}
                                                                    onToggleSubtopic={handleToggleSubtopic}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        {/* Completed Section (Collapsed by default or at bottom) */}
                        {taskGroups.completed.length > 0 && (
                            <section className="opacity-60">
                                <h2 className="mb-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Completed
                                </h2>
                                <div className="space-y-2">
                                    {taskGroups.completed.slice(0, 3).map(task => (
                                        <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                                            <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            </div>
                                            <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function TaskCard({
    task,
    onStartQuiz,
    onToggleSubtopic,
    isToday = false,
    minimal = false
}: {
    task: StudyPlanTask;
    onStartQuiz: () => void;
    onToggleSubtopic?: (taskId: string, subtopic: string) => void;
    isToday?: boolean;
    minimal?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    // Subject color mapping & Subtopics
    const subjectColors: Record<string, string> = {
        "Physics": "bg-blue-500/10 text-blue-600 border-blue-200",
        "Chemistry": "bg-purple-500/10 text-purple-600 border-purple-200",
        "Mathematics": "bg-orange-500/10 text-orange-600 border-orange-200",
        "default": "bg-accent/10 text-accent border-accent/20"
    };

    const colorClass = subjectColors[task.subject] || subjectColors["default"];

    const completedSubtopics = task.completed_subtopics || [];
    const allSubtopicsCompleted = task.subtopics && task.subtopics.length > 0 &&
        task.subtopics.every(s => completedSubtopics.includes(s));

    // If no subtopics exist, we allow quiz immediately (fallback)
    const canTakeQuiz = (task.subtopics?.length === 0) || allSubtopicsCompleted;

    return (
        <div className={`relative group flex flex-col rounded-xl border transition-all overflow-hidden
            ${isToday ? 'bg-background border-accent/30 shadow-sm' : 'bg-card/50 border-border'}
            ${minimal ? 'py-3 px-4' : ''}
        `}>
            {/* Timeline Line for minimal cards */}
            {minimal && (
                <div className="absolute -left-[21px] top-1/2 h-2 w-2 rounded-full bg-border -translate-y-1/2" />
            )}

            {/* Main Card Content */}
            <div className={`flex flex-col gap-3 p-4 ${minimal ? 'py-0' : ''}`} onClick={() => !minimal && setExpanded(!expanded)}>
                <div className="flex gap-3 cursor-pointer">
                    <div className="mt-0.5">
                        {task.status === "completed" ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40">
                                <Circle className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <span className={`mb-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
                                    {task.subject}
                                </span>
                                <h3 className={`font-medium leading-tight ${minimal ? 'text-sm' : 'text-base'}`}>
                                    {task.title}
                                </h3>
                            </div>
                            {!minimal && (
                                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                    {task.duration_minutes} min
                                </span>
                            )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {task.topic}
                        </p>

                        {!minimal && !expanded && task.subtopics && task.subtopics.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-300"
                                        style={{ width: `${(completedSubtopics.length / (task.subtopics.length || 1)) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {completedSubtopics.length}/{task.subtopics.length}
                                </span>
                            </div>
                        )}

                        {!minimal && expanded && (
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </div>
                                    <button className="p-1 hover:bg-muted rounded-full">
                                        <ChevronDown className="h-4 w-4 text-muted-foreground rotate-180" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Section */}
            {!minimal && expanded && (
                <div className="border-t border-border bg-muted/10 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {task.subtopics && task.subtopics.length > 0 ? (
                        <>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Subtopics to Cover:</p>
                            <div className="space-y-2">
                                {task.subtopics.map((subtopic, idx) => {
                                    const isChecked = completedSubtopics.includes(subtopic);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onToggleSubtopic) onToggleSubtopic(task.id, subtopic);
                                            }}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                                        >
                                            <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors
                                                 ${isChecked ? 'bg-accent border-accent text-accent-foreground' : 'border-muted-foreground'}
                                             `}>
                                                {isChecked && <CheckCircle2 className="h-3 w-3" />}
                                            </div>
                                            <span className={`text-sm ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                {subtopic}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No specific subtopics listed. Focus on the main topic.</p>
                    )}

                    {/* Quiz Action Area */}
                    <div className="mt-4 pt-3 border-t border-border flex justify-end">
                        {task.status !== "completed" ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (canTakeQuiz) onStartQuiz();
                                }}
                                disabled={!canTakeQuiz}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs transition-all
                                    ${canTakeQuiz
                                        ? 'bg-accent text-accent-foreground shadow-sm hover:brightness-110 active:scale-95'
                                        : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'}
                                `}
                            >
                                {task.quiz_status === "in_progress" ? "Resume Quiz" : "Take Quiz"}
                                {!canTakeQuiz && <Lock className="h-3 w-3" />}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Task Completed
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function QuizModal({ attemptId, authToken, questions, onComplete, onClose }: {
    attemptId: string,
    authToken: string,
    questions: { id: string, text: string, options: string[] }[],
    onComplete: (passed: boolean) => void,
    onClose: () => void
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ passed: boolean, score: number } | null>(null);

    const handleOptionSelect = (optionIndex: number) => {
        const qId = questions[currentStep].id;
        setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await submitTaskQuiz(authToken, attemptId, answers);
            setResult({ passed: res.passed, score: res.score });
            if (res.passed) {
                // Wait a moment then close
                setTimeout(() => onComplete(true), 2000);
            }
        } catch (err) {
            console.error("Quiz submission failed", err);
            alert("Failed to submit quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center border border-border">
                    {result.passed ? (
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Quiz Passed!</h2>
                            <p className="text-muted-foreground mb-6">Score: {result.score}%</p>
                            <p className="text-sm text-green-600 font-medium">Task marked as completed.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Quiz Failed</h2>
                            <p className="text-muted-foreground mb-6">Score: {result.score}% (Requires 60%)</p>
                            <button onClick={onClose} className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-medium">
                                Close & Try Later
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const question = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-2xl">
                    <div>
                        <span className="text-xs font-medium text-muted-foreground">Question {currentStep + 1} of {questions.length}</span>
                        <div className="h-1 w-32 bg-muted rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full">
                        <ArrowLeft className="h-4 w-4" /> {/* Should be X but reusing ArrowLeft for now or generic close */}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <h3 className="text-lg font-medium mb-6">{question.text}</h3>
                    <div className="space-y-3">
                        {question.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                className={`w-full text-left p-4 rounded-xl border transition-all text-sm
                                    ${answers[question.id] === idx
                                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                        : 'border-border hover:bg-muted/30 hover:border-muted-foreground/30'}
                                `}
                            >
                                <span className="inline-block w-6 font-medium text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30 rounded-b-2xl flex justify-end">
                    <button
                        onClick={handleNext}
                        disabled={answers[question.id] === undefined || submitting}
                        className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        {currentStep === questions.length - 1 ? "Submit" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
}

