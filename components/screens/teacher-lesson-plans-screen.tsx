"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  LessonPlanResponse,
  createTeacherLessonPlan,
  deleteTeacherLessonPlan,
  listTeacherLessonPlans,
  updateTeacherLessonPlan,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export function TeacherLessonPlansScreen() {
  const { teacherSubject, authToken } = useApp();
  const subject = teacherSubject || "Physics";

  const [yearFilter, setYearFilter] = useState<"All" | "11th" | "12th">("All");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [plans, setPlans] = useState<LessonPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [newTopic, setNewTopic] = useState("");
  const [newYear, setNewYear] = useState<"11th" | "12th">("12th");
  const [newObjectives, setNewObjectives] = useState("");
  const [newActivities, setNewActivities] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [creating, setCreating] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await listTeacherLessonPlans(authToken);
        if (!cancelled) {
          setPlans(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load lesson plans.");
          }
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const filteredPlans = useMemo(
    () => plans.filter((plan) => (yearFilter === "All" ? true : plan.year === yearFilter)),
    [plans, yearFilter],
  );

  const resetForm = () => {
    setNewTopic("");
    setNewObjectives("");
    setNewActivities("");
    setNewDuration("60");
    setNewYear("12th");
    setCreating(false);
  };

  const handleCreate = async () => {
    if (!authToken || creating) return;

    const topic = newTopic.trim();
    const duration = Number(newDuration);
    const objectives = newObjectives
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const activities = newActivities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!topic) {
      setActionError("Topic is required.");
      return;
    }
    if (!Number.isFinite(duration) || duration < 15 || duration > 180) {
      setActionError("Duration must be between 15 and 180.");
      return;
    }

    setActionError(null);
    setCreating(true);

    try {
      const created = await createTeacherLessonPlan(authToken, {
        year: newYear,
        topic,
        objectives,
        activities,
        duration,
      });
      setPlans((prev) => [created, ...prev]);
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to create lesson plan.");
      }
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!authToken || updatingPlanId) return;

    setActionError(null);
    setUpdatingPlanId(id);
    try {
      await deleteTeacherLessonPlan(authToken, id);
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
      if (expandedPlan === id) {
        setExpandedPlan(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to delete lesson plan.");
      }
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const togglePublish = async (plan: LessonPlanResponse) => {
    if (!authToken || updatingPlanId) return;

    setActionError(null);
    setUpdatingPlanId(plan.id);

    try {
      const updated = await updateTeacherLessonPlan(authToken, plan.id, {
        status: plan.status === "published" ? "draft" : "published",
      });
      setPlans((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to update lesson plan.");
      }
    } finally {
      setUpdatingPlanId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Lesson Plans</h1>
          <p className="text-sm text-muted-foreground">
            {subject} - {loading ? "Loading..." : `${filteredPlans.length} plans`}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="gap-1.5 rounded-xl bg-primary text-primary-foreground"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["All", "11th", "12th"] as const).map((yr) => (
          <button
            key={yr}
            onClick={() => setYearFilter(yr)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              yearFilter === yr
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {yr === "All" ? "All Years" : `${yr} Class`}
          </button>
        ))}
      </div>

      {showCreateForm && (
        <div className="animate-fade-in flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Create New Lesson Plan</h3>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Topic</Label>
            <Input
              placeholder="e.g. Newton's Laws of Motion"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="rounded-xl border-border bg-background text-sm text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Year</Label>
            <div className="flex gap-2">
              {(["11th", "12th"] as const).map((yr) => (
                <button
                  key={yr}
                  onClick={() => setNewYear(yr)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    newYear === yr
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Learning Objectives (comma-separated)</Label>
            <Input
              placeholder="e.g. Understand forces, Apply formulas"
              value={newObjectives}
              onChange={(e) => setNewObjectives(e.target.value)}
              className="rounded-xl border-border bg-background text-sm text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Activities (comma-separated)</Label>
            <Input
              placeholder="e.g. Lab demo, Problem solving"
              value={newActivities}
              onChange={(e) => setNewActivities(e.target.value)}
              className="rounded-xl border-border bg-background text-sm text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Duration (minutes)</Label>
            <Input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="rounded-xl border-border bg-background text-sm text-foreground"
              min="15"
              max="180"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || !newTopic.trim()}
            className="w-full rounded-xl bg-primary py-5 text-primary-foreground"
          >
            {creating ? "Creating..." : "Create Lesson Plan"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading lesson plans...
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
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No lesson plans found</p>
          </div>
        ) : (
          filteredPlans.map((plan, index) => (
            <div
              key={plan.id}
              className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-card"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <button
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{plan.topic}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {plan.year}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {plan.duration} min
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    plan.status === "published"
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {plan.status}
                </span>
                {expandedPlan === plan.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedPlan === plan.id && (
                <div className="animate-fade-in border-t border-border p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">Objectives</span>
                      <ul className="flex flex-col gap-1">
                        {plan.objectives.map((obj, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-[11px] text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">Activities</span>
                      <ul className="flex flex-col gap-1">
                        {plan.activities.map((act, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-[11px] text-muted-foreground"
                          >
                            <FileText className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            {act}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublish(plan)}
                        disabled={updatingPlanId === plan.id}
                        className="flex-1 rounded-lg text-xs"
                      >
                        {updatingPlanId === plan.id
                          ? "Updating..."
                          : plan.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        disabled={updatingPlanId === plan.id}
                        className="rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
