"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Subject,
  TeacherClassStudentOption,
  TeacherClassResponse,
  Year,
  createTeacherClass,
  listTeacherClassAssignableStudents,
  listTeacherClasses,
  updateTeacherClassStudents,
} from "@/lib/api-client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ChevronRight,
  Plus,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function TeacherClassesLoading() {
  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-5 rounded-md" />
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
             <Skeleton className="h-4 w-4 rounded-full" />
             <div className="flex flex-1 flex-col gap-2">
               <div className="flex justify-between">
                 <Skeleton className="h-2.5 w-20" />
                 <Skeleton className="h-2.5 w-8" />
               </div>
               <Skeleton className="h-1.5 w-full rounded-full" />
             </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

type ClassFormState = {
  name: string;
  year: Year;
  subject: Subject;
};

const defaultForm: ClassFormState = {
  name: "",
  year: "12th",
  subject: "Physics",
};

export function TeacherClassesScreen() {
  const { authToken, teacherSubject, navigate, setSelectedStudentId } = useApp();
  const [classes, setClasses] = useState<TeacherClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClassFormState>({
    ...defaultForm,
    subject: (teacherSubject as Subject | null) ?? "Physics",
  });

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<TeacherClassResponse | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [assignableStudents, setAssignableStudents] = useState<TeacherClassStudentOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [savingStudents, setSavingStudents] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await listTeacherClasses(authToken);
        if (!cancelled) {
          setClasses(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load classes.");
          }
          setClasses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadClasses();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const summary = useMemo(() => {
    const totalStudents = classes.reduce((sum, cls) => sum + cls.students, 0);
    const avg = classes.length > 0
      ? Math.round(classes.reduce((sum, cls) => sum + cls.avg_score, 0) / classes.length)
      : 0;
    return { totalStudents, avg };
  }, [classes]);

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setActionError(null);
    setSubmitting(false);
    setForm({
      ...defaultForm,
      subject: (teacherSubject as Subject | null) ?? "Physics",
    });
  };

  const handleCreateClass = async () => {
    if (!authToken || submitting) return;

    const name = form.name.trim();
    if (!name) {
      setActionError("Class name is required.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const created = await createTeacherClass(authToken, {
        name,
        year: form.year,
        subject: form.subject,
      });
      setClasses((prev) => [created, ...prev]);
      handleCloseForm();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to create class.");
      }
      setSubmitting(false);
    }
  };

  const openStudentsModal = async (cls: TeacherClassResponse) => {
    if (!authToken) return;
    setSelectedClass(cls);
    setShowStudentsModal(true);
    setStudentsLoading(true);
    setStudentsError(null);
    setSavingStudents(false);
    setAssignableStudents([]);
    setSelectedStudentIds([]);

    try {
      const response = await listTeacherClassAssignableStudents(authToken, cls.id);
      setAssignableStudents(response);
      setSelectedStudentIds(
        response
          .filter((student) => student.assigned)
          .map((student) => student.id),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setStudentsError(err.detail);
      } else {
        setStudentsError("Failed to load class students.");
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  const closeStudentsModal = () => {
    setShowStudentsModal(false);
    setSelectedClass(null);
    setStudentsLoading(false);
    setStudentsError(null);
    setAssignableStudents([]);
    setSelectedStudentIds([]);
    setSavingStudents(false);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId],
    );
  };

  const handleSaveStudents = async () => {
    if (!authToken || !selectedClass || savingStudents) return;

    setSavingStudents(true);
    setStudentsError(null);

    try {
      const updated = await updateTeacherClassStudents(authToken, selectedClass.id, selectedStudentIds);
      setClasses((previous) =>
        previous.map((cls) => (cls.id === updated.id ? updated : cls)),
      );
      closeStudentsModal();
    } catch (err) {
      if (err instanceof ApiError) {
        setStudentsError(err.detail);
      } else {
        setStudentsError("Unable to update class students.");
      }
    } finally {
      setSavingStudents(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    navigate("teacher-student-details");
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Fetching..." : `${classes.length} active classes`}
          </p>
        </div>
        <Button
          className="gap-2 rounded-xl bg-primary text-primary-foreground"
          size="sm"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {loading ? (
        <TeacherClassesLoading />
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
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No classes created yet.
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground">{summary.totalStudents}</span>
              <span className="text-[10px] text-muted-foreground">Total Students</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-lg font-bold text-foreground">{summary.avg}%</span>
              <span className="text-[10px] text-muted-foreground">Overall Avg</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {classes.map((cls, index) => (
              <div
                key={cls.id}
                className="animate-fade-in flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">{cls.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {cls.subject} | {cls.year} | {cls.students} students
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Average Score</span>
                      <span className="text-xs font-semibold text-foreground">{cls.avg_score}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${cls.avg_score >= 75
                          ? "bg-accent"
                          : cls.avg_score >= 65
                            ? "bg-primary"
                            : "bg-warning"
                          }`}
                        style={{ width: `${cls.avg_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg bg-transparent text-xs text-foreground"
                    onClick={() => openStudentsModal(cls)}
                  >
                    Manage Students
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-lg bg-primary text-xs text-primary-foreground"
                    onClick={() => navigate("teacher-tests")}
                  >
                    Assign Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Create Class</h2>
              <button
                onClick={handleCloseForm}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Class name"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
              <select
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value as Subject }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {(["Physics", "Chemistry", "Mathematics"] as const).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <select
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value as Year }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option value="11th">11th</option>
                <option value="12th">12th</option>
              </select>

              <Button
                onClick={handleCreateClass}
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-primary py-5 text-primary-foreground"
              >
                {submitting ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showStudentsModal && selectedClass && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">{selectedClass.name}</h2>
              <button
                onClick={closeStudentsModal}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {selectedClass.year} | Select students for this class
            </p>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {studentsLoading ? (
                <div className="flex flex-col gap-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : studentsError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                  <p className="text-sm text-destructive font-medium">{studentsError}</p>
                </div>
              ) : assignableStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No students currently available for {selectedClass.year}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Members Section */}
                  {selectedStudentIds.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-foreground">Current Members ({selectedStudentIds.length})</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {assignableStudents
                          .filter((student) => selectedStudentIds.includes(student.id))
                          .map((student) => (
                            <div
                              key={student.id}
                              className="group flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 transition-all"
                            >
                              <div className="flex flex-1 flex-col items-start text-left cursor-default">
                                <p className="text-sm font-bold text-foreground">{student.name}</p>
                                <p className="text-[11px] text-muted-foreground">{student.email}</p>
                              </div>
                              <button
                                onClick={() => toggleStudentSelection(student.id)}
                                className="ml-2 rounded-xl bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Students Section (The ones that disappear after assigning) */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold text-foreground">
                        {selectedStudentIds.length > 0 ? "Add More Students" : "All Available Students"}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {assignableStudents
                        .filter((student) => !selectedStudentIds.includes(student.id))
                        .length === 0 ? (
                          <p className="py-4 text-center text-xs text-muted-foreground">All available students are assigned.</p>
                        ) : (
                          assignableStudents
                            .filter((student) => !selectedStudentIds.includes(student.id))
                            .map((student) => (
                              <div
                                key={student.id}
                                className="group flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 transition-all hover:border-primary/30"
                              >
                                <div className="flex flex-1 flex-col items-start text-left">
                                  <p className="text-sm font-semibold text-foreground">{student.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{student.email}</p>
                                </div>
                                <button
                                  onClick={() => toggleStudentSelection(student.id)}
                                  className="ml-2 rounded-xl bg-primary/10 px-4 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            ))
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedStudentIds.length} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg bg-transparent text-xs text-foreground"
                  onClick={closeStudentsModal}
                  disabled={savingStudents}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg bg-primary text-xs text-primary-foreground"
                  onClick={handleSaveStudents}
                  disabled={studentsLoading || Boolean(studentsError) || savingStudents}
                >
                  {savingStudents ? "Saving..." : "Save Students"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
