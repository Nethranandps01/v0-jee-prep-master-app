"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  TeacherClassResponse,
  TeacherPaperResponse,
  assignTeacherPaper,
  getTeacherPaper,
  listTeacherClasses,
  listTeacherPapers,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FileText,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export function TeacherTestsScreen() {
  const { navigate, authToken } = useApp();
  const [papers, setPapers] = useState<TeacherPaperResponse[]>([]);
  const [classes, setClasses] = useState<TeacherClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classLoadError, setClassLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPaperId, setAssignPaperId] = useState<string | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingPaperId, setViewingPaperId] = useState<string | null>(null);
  const [viewingPaper, setViewingPaper] = useState<TeacherPaperResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setClassLoadError(null);
      setActionError(null);

      try {
        const [papersRes, classesRes] = await Promise.allSettled([
          listTeacherPapers(authToken),
          listTeacherClasses(authToken),
        ]);

        if (cancelled) {
          return;
        }

        if (papersRes.status === "fulfilled") {
          setPapers(papersRes.value);
          setError(null);
        } else {
          const reason = papersRes.reason;
          setPapers([]);
          setError(reason instanceof ApiError ? reason.detail : "Failed to load papers.");
        }

        if (classesRes.status === "fulfilled") {
          setClasses(classesRes.value);
          setClassLoadError(null);
        } else {
          const reason = classesRes.reason;
          setClasses([]);
          setClassLoadError(
            reason instanceof ApiError ? reason.detail : "Classes unavailable right now.",
          );
        }
      } catch {
        if (!cancelled) {
          setPapers([]);
          setClasses([]);
          setError("Failed to load papers.");
          setClassLoadError("Classes unavailable right now.");
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

  const selectedPaper = useMemo(
    () => papers.find((paper) => paper.id === assignPaperId) ?? null,
    [assignPaperId, papers],
  );

  const openAssignModal = (paperId: string) => {
    setAssignPaperId(paperId);
    setSelectedClassIds([]);
    setActionError(null);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignPaperId(null);
    setSelectedClassIds([]);
    setAssigning(false);
    setActionError(null);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingPaperId(null);
    setViewingPaper(null);
    setViewLoading(false);
    setViewError(null);
  };

  const openViewModal = async (paperId: string) => {
    if (!authToken || viewLoading) return;

    setShowViewModal(true);
    setViewingPaperId(paperId);
    setViewingPaper(null);
    setViewError(null);
    setViewLoading(true);

    try {
      const paper = await getTeacherPaper(authToken, paperId);
      setViewingPaper(paper);
    } catch (err) {
      if (err instanceof ApiError) {
        setViewError(err.detail);
      } else {
        setViewError("Unable to load paper details.");
      }
    } finally {
      setViewLoading(false);
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  };

  const handleAssign = async () => {
    if (!authToken || !assignPaperId || assigning) return;
    if (selectedClassIds.length === 0) {
      setActionError("Select at least one class.");
      return;
    }

    setAssigning(true);
    setActionError(null);
    let assignedSuccessfully = false;

    try {
      const updated = await assignTeacherPaper(authToken, assignPaperId, selectedClassIds);
      setPapers((prev) => prev.map((paper) => (paper.id === updated.id ? updated : paper)));
      assignedSuccessfully = true;
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to assign paper.");
      }
    } finally {
      if (assignedSuccessfully) {
        closeAssignModal();
      } else {
        setAssigning(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">My Papers</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${papers.length} papers created`}
          </p>
        </div>
        <Button
          onClick={() => navigate("teacher-paper-generator")}
          className="gap-2 rounded-xl bg-primary text-primary-foreground"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}
      {classLoadError && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {classLoadError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading papers...
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setReloadKey((value) => value + 1)}
              className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No papers created yet.
          </div>
        ) : (
          papers.map((paper, index) => (
            <div
              key={paper.id}
              className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{paper.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {paper.created_at ? new Date(paper.created_at).toLocaleDateString() : "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">{paper.questions} Qs</span>
                    <span className="text-xs text-muted-foreground">{paper.duration} min</span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    paper.assigned ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"
                  }`}
                >
                  {paper.assigned ? "Assigned" : "Draft"}
                </span>
              </div>

              {paper.assigned && (
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Assigned to {paper.students} students
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg bg-transparent text-xs text-foreground"
                  onClick={() => void openViewModal(paper.id)}
                >
                  View Paper
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg bg-transparent text-xs text-foreground"
                  onClick={() => navigate("teacher-paper-generator")}
                >
                  Create Similar
                </Button>
                {!paper.assigned && (
                  <Button
                    size="sm"
                    className="flex-1 rounded-lg bg-primary text-xs text-primary-foreground"
                    disabled={Boolean(classLoadError)}
                    onClick={() => openAssignModal(paper.id)}
                  >
                    {classLoadError ? "Classes Unavailable" : "Assign to Class"}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate("teacher-paper-generator")}
        className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">Generate New Paper with AI</span>
          <span className="text-xs text-muted-foreground">Create customized JEE papers instantly</span>
        </div>
      </button>

      {showViewModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Paper Preview</h2>
              <button
                onClick={closeViewModal}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {viewLoading ? (
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                Loading paper details...
              </div>
            ) : viewError ? (
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-xs text-destructive">{viewError}</p>
                {viewingPaperId && (
                  <Button
                    size="sm"
                    className="w-fit rounded-lg bg-primary text-primary-foreground"
                    onClick={() => void openViewModal(viewingPaperId)}
                  >
                    Retry
                  </Button>
                )}
              </div>
            ) : viewingPaper ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">{viewingPaper.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {viewingPaper.subject} | {viewingPaper.difficulty} | {viewingPaper.questions} Qs |{" "}
                    {viewingPaper.duration} min
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source:{" "}
                    {(viewingPaper.question_source || "template").toLowerCase() === "ai"
                      ? "AI Generated"
                      : "Template"}
                  </p>
                </div>

                <div className="max-h-[65vh] overflow-y-auto pr-1">
                  {(viewingPaper.question_set ?? []).length === 0 ? (
                    <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
                      No question details found for this paper.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {(viewingPaper.question_set ?? []).map((question, index) => (
                        <div key={`${question.id}-${index}`} className="rounded-xl border border-border bg-background p-3">
                          <p className="text-sm font-semibold text-foreground">
                            Q{index + 1}. {question.text}
                          </p>
                          <div className="mt-2 grid gap-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={`${question.id}-${optionIndex}`}
                                className={`rounded-lg border px-3 py-2 text-xs ${
                                  optionIndex === question.correct
                                    ? "border-accent/40 bg-accent/10 text-accent"
                                    : "border-border text-foreground"
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}. {option}
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                            Correct: {String.fromCharCode(65 + question.correct)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {question.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
                Select a paper to preview.
              </div>
            )}
          </div>
        </div>
      )}

      {showAssignModal && selectedPaper && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Assign Paper</h2>
              <button
                onClick={closeAssignModal}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-muted-foreground">{selectedPaper.title}</p>

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {classLoadError && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  {classLoadError}
                </div>
              )}
              {classes.length === 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">
                    No classes available. Create one first, then assign this paper.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-fit rounded-lg bg-transparent text-xs text-foreground"
                    onClick={() => {
                      closeAssignModal();
                      navigate("teacher-classes");
                    }}
                  >
                    Create Class
                  </Button>
                </div>
              )}
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => toggleClassSelection(cls.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    selectedClassIds.includes(cls.id)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                >
                  <span className="font-medium text-foreground">{cls.name}</span>
                  <span className="text-xs text-muted-foreground">{cls.students} students</span>
                </button>
              ))}
            </div>

            <Button
              onClick={handleAssign}
              disabled={
                assigning ||
                classes.length === 0 ||
                Boolean(classLoadError) ||
                selectedClassIds.length === 0
              }
              className="mt-4 w-full rounded-xl bg-primary py-5 text-primary-foreground"
            >
              {assigning ? "Assigning..." : "Assign Paper"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
