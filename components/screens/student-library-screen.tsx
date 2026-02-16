"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  StudentLibraryItemResponse,
  downloadStudentLibraryItem,
  listStudentLibraryDownloads,
  listStudentLibraryItems,
} from "@/lib/api-client";
import {
  BookOpen,
  Download,
  CheckCircle2,
  Search,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const subjects = ["All", "Physics", "Chemistry", "Mathematics"] as const;
type SubjectFilter = (typeof subjects)[number];

export function StudentLibraryScreen() {
  const { studentYear, authToken } = useApp();
  const year = studentYear || "12th";

  const [activeSubject, setActiveSubject] = useState<SubjectFilter>("All");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StudentLibraryItemResponse[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      if (!authToken) {
        setError("Student login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setActionError(null);

      try {
        const [response, downloaded] = await Promise.all([
          listStudentLibraryItems(authToken, {
            subject: activeSubject === "All" ? undefined : activeSubject,
          }),
          listStudentLibraryDownloads(authToken),
        ]);

        if (!cancelled) {
          setItems(response);
          setDownloadedIds(
            downloaded.reduce<Record<string, boolean>>((acc, id) => {
              acc[id] = true;
              return acc;
            }, {}),
          );
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

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [activeSubject, authToken, reloadKey]);

  const filtered = useMemo(() => {
    return items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const handleDownload = async (item: StudentLibraryItemResponse) => {
    if (!authToken || downloadingId) return;

    setActionError(null);
    setDownloadingId(item.id);
    try {
      const { blob, filename } = await downloadStudentLibraryItem(authToken, item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloadedIds((previous) => ({
        ...previous,
        [item.id]: true,
      }));
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Download failed. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground">{year} Class - Study materials and resources</p>
      </div>

      {error && (
        <div className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="w-fit rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          {actionError}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeSubject === subject
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading materials...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No materials found</p>
          </div>
        )}

        {!loading &&
          filtered.map((item, index) => {
            const isDownloaded = Boolean(downloadedIds[item.id]);
            return (
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
                  {item.type === "PDF" || item.type === "DOCX" ? (
                    <FileText
                      className={`h-6 w-6 ${
                        item.subject === "Physics"
                          ? "text-primary"
                          : item.subject === "Chemistry"
                            ? "text-accent"
                            : "text-warning"
                      }`}
                    />
                  ) : (
                    <BookOpen className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{item.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">{item.chapters} chapters</span>
                    <span className="text-xs text-muted-foreground">{item.type}</span>
                    {item.file_name && (
                      <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                        {item.file_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    void handleDownload(item);
                  }}
                  disabled={downloadingId === item.id}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isDownloaded ? "bg-accent/15" : "bg-primary/10 hover:bg-primary/20"
                  }`}
                  aria-label={isDownloaded ? "Downloaded" : "Download"}
                >
                  {downloadingId === item.id ? (
                    <span className="text-[10px] text-primary">...</span>
                  ) : isDownloaded ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <Download className="h-5 w-5 text-primary" />
                  )}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
