"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sampleLessonPlans } from "@/lib/sample-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Plus,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  FileText,
  Trash2,
  X,
} from "lucide-react";

interface LessonPlan {
  id: string;
  subject: string;
  year: "11th" | "12th";
  topic: string;
  objectives: string[];
  activities: string[];
  duration: number;
  status: "draft" | "published";
}

export function TeacherLessonPlansScreen() {
  const { teacherSubject } = useApp();
  const subject = teacherSubject || "Physics";

  const [yearFilter, setYearFilter] = useState<"All" | "11th" | "12th">("All");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [plans, setPlans] = useState<LessonPlan[]>(
    sampleLessonPlans.filter((lp) => lp.subject === subject) as LessonPlan[]
  );

  // Create form state
  const [newTopic, setNewTopic] = useState("");
  const [newYear, setNewYear] = useState<"11th" | "12th">("12th");
  const [newObjectives, setNewObjectives] = useState("");
  const [newActivities, setNewActivities] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  const filteredPlans = plans.filter((lp) => {
    if (yearFilter !== "All" && lp.year !== yearFilter) return false;
    return true;
  });

  const handleCreate = () => {
    const newPlan: LessonPlan = {
      id: `lp-new-${Date.now()}`,
      subject,
      year: newYear,
      topic: newTopic,
      objectives: newObjectives.split(",").map((o) => o.trim()).filter(Boolean),
      activities: newActivities.split(",").map((a) => a.trim()).filter(Boolean),
      duration: parseInt(newDuration) || 60,
      status: "draft",
    };
    setPlans([newPlan, ...plans]);
    setShowCreateForm(false);
    setNewTopic("");
    setNewObjectives("");
    setNewActivities("");
    setNewDuration("60");
  };

  const handleDelete = (id: string) => {
    setPlans(plans.filter((p) => p.id !== id));
    if (expandedPlan === id) setExpandedPlan(null);
  };

  const togglePublish = (id: string) => {
    setPlans(
      plans.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "published" ? "draft" : "published" }
          : p
      )
    );
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Lesson Plans</h1>
          <p className="text-sm text-muted-foreground">
            {subject} - {filteredPlans.length} plans
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

      {/* Year Filter */}
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

      {/* Create Form */}
      {showCreateForm && (
        <div className="animate-fade-in flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Create New Lesson Plan</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Topic</Label>
            <Input
              placeholder="e.g. Newton's Laws of Motion"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="rounded-xl border-border bg-background text-foreground text-sm"
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
              className="rounded-xl border-border bg-background text-foreground text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Activities (comma-separated)</Label>
            <Input
              placeholder="e.g. Lab demo, Problem solving"
              value={newActivities}
              onChange={(e) => setNewActivities(e.target.value)}
              className="rounded-xl border-border bg-background text-foreground text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">Duration (minutes)</Label>
            <Input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="rounded-xl border-border bg-background text-foreground text-sm"
              min="15"
              max="180"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!newTopic.trim()}
            className="w-full rounded-xl bg-primary py-5 text-primary-foreground"
          >
            Create Lesson Plan
          </Button>
        </div>
      )}

      {/* Plans List */}
      <div className="flex flex-col gap-3">
        {filteredPlans.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No lesson plans found</p>
          </div>
        )}
        {filteredPlans.map((plan, index) => (
          <div
            key={plan.id}
            className="animate-fade-in rounded-2xl border border-border bg-card overflow-hidden"
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
                      {plan.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">Activities</span>
                    <ul className="flex flex-col gap-1">
                      {plan.activities.map((act, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
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
                      onClick={() => togglePublish(plan.id)}
                      className="flex-1 rounded-lg text-xs"
                    >
                      {plan.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
