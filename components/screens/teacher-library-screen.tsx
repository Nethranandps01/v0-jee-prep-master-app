"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  LibraryItemResponse,
  Subject,
  Year,
  createTeacherLibraryItem,
  listTeacherLibraryItems,
} from "@/lib/api-client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Search,
  Upload,
  X,
} from "lucide-react";

type MaterialType = "PDF" | "Question Bank" | "DOCX" | "Image";

type CreateFormState = {
  title: string;
  subject: Subject | "All";
  type: MaterialType;
  chapters: string;
  year: Year;
  file: File | null;
};

const DEFAULT_FORM: CreateFormState = {
  title: "",
  subject: "Physics",
  type: "PDF",
  chapters: "10",
  year: "12th",
  file: null,
};

export function TeacherLibraryScreen() {
  const { authToken, teacherSubject } = useApp();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LibraryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateFormState>({
    ...DEFAULT_FORM,
    subject: (teacherSubject as Subject | null) ?? "Physics",
  });

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      if (!authToken) {
        setError("Teacher login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await listTeacherLibraryItems(authToken);
        if (!cancelled) {
          setItems(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load library items.");
          }
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const filtered = useMemo(
    () => items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const stats = useMemo(
    () => ({
      pdfs: items.filter((item) => item.type === "PDF").length,
      qbanks: items.filter((item) => item.type === "Question Bank").length,
      chapters: items.reduce((sum, item) => sum + item.chapters, 0),
    }),
    [items],
  );

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setActionError(null);
    setSubmitting(false);
    setForm({
      ...DEFAULT_FORM,
      subject: (teacherSubject as Subject | null) ?? "Physics",
    });
  };

  const handleCreate = async () => {
    if (!authToken || submitting) return;

    const title = form.title.trim();
    const chapters = Number(form.chapters);
    const file = form.file;
    if (!title) {
      setActionError("Title is required.");
      return;
    }
    if (!Number.isFinite(chapters) || chapters < 1) {
      setActionError("Chapters must be at least 1.");
      return;
    }
    if (!file) {
      setActionError("Please choose a file to upload.");
      return;
    }

    setActionError(null);
    setSubmitting(true);

    try {
      const created = await createTeacherLibraryItem(authToken, {
        title,
        subject: form.subject,
        type: form.type,
        chapters,
        year: form.year,
        file,
        publishNow: true,
      });
      setItems((prev) => [created, ...prev]);
      handleCloseForm();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to upload material.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground">Manage study materials</p>
        </div>
        <Button
          className="gap-2 rounded-xl bg-primary text-primary-foreground"
          size="sm"
          onClick={() => setShowCreateForm(true)}
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-foreground">{stats.pdfs}</span>
          <span className="text-[10px] text-muted-foreground">PDFs</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3">
          <BookOpen className="h-5 w-5 text-accent" />
          <span className="text-sm font-bold text-foreground">{stats.qbanks}</span>
          <span className="text-[10px] text-muted-foreground">Q Banks</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3">
          <FolderOpen className="h-5 w-5 text-warning" />
          <span className="text-sm font-bold text-foreground">{stats.chapters}</span>
          <span className="text-[10px] text-muted-foreground">Chapters</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading materials...
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
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No materials found</p>
          </div>
        ) : (
          filtered.map((item, index) => (
            <div
              key={item.id}
              className="animate-fade-in flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  item.subject === "Physics"
                    ? "bg-primary/10"
                    : item.subject === "Chemistry"
                    ? "bg-accent/10"
                    : item.subject === "Mathematics"
                    ? "bg-warning/10"
                    : "bg-muted"
                }`}
              >
                <FileText
                  className={`h-6 w-6 ${
                    item.subject === "Physics"
                      ? "text-primary"
                      : item.subject === "Chemistry"
                      ? "text-accent"
                      : item.subject === "Mathematics"
                      ? "text-warning"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{item.subject}</span>
                  <span className="text-xs text-muted-foreground">{item.chapters} chapters</span>
                  <span className="text-xs text-muted-foreground">{item.type}</span>
                  {item.file_name && (
                    <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {item.file_name}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "approved"
                        ? "bg-accent/15 text-accent"
                        : item.status === "pending"
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status ?? "available"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Upload Material</h2>
              <button
                onClick={handleCloseForm}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="rounded-xl border-border bg-background text-foreground"
              />
              <select
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value as Subject | "All" }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {(["Physics", "Chemistry", "Mathematics", "All"] as const).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as MaterialType }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {["PDF", "Question Bank", "DOCX", "Image"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Input
                type="file"
                accept={
                  form.type === "PDF"
                    ? ".pdf,application/pdf"
                    : form.type === "DOCX"
                      ? ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      : form.type === "Image"
                        ? "image/*"
                        : ".pdf,.docx,.txt,.csv,.md,application/pdf,text/plain"
                }
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    file: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null,
                  }))
                }
                className="rounded-xl border-border bg-background text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary"
              />
              {form.file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {form.file.name} ({Math.max(1, Math.round(form.file.size / 1024))} KB)
                </p>
              )}
              <Input
                type="number"
                min="1"
                value={form.chapters}
                onChange={(e) => setForm((prev) => ({ ...prev, chapters: e.target.value }))}
                placeholder="Chapters"
                className="rounded-xl border-border bg-background text-foreground"
              />
              <select
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value as Year }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                <option value="11th">11th</option>
                <option value="12th">12th</option>
              </select>
              <Button
                onClick={handleCreate}
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-primary py-5 text-primary-foreground"
              >
                {submitting ? "Uploading..." : "Upload"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Uploaded material is published for student download immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
