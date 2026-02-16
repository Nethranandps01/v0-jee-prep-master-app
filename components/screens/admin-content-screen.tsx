"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  ContentItemResponse,
  Subject,
  listAdminContentItems,
  updateAdminContentStatus,
} from "@/lib/api-client";
import { useApp } from "@/lib/app-context";
import {
  FolderOpen,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export function AdminContentScreen() {
  const { authToken } = useApp();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<"All" | Subject>("All");
  const [items, setItems] = useState<ContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const subjects: ("All" | Subject)[] = ["All", "Physics", "Chemistry", "Mathematics"];
  const statuses: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1]} ${msg}`]);

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      addLog("Starting loadItems");
      if (!authToken) {
        addLog("No auth token");
        setItems([]);
        setLoading(false);
        setError("Admin login is required to moderate content.");
        return;
      }

      addLog(`Token present: ${authToken.substring(0, 10)}...`);
      setLoading(true);
      setError(null);

      try {
        addLog("Calling listAdminContentItems...");
        const response = await listAdminContentItems(authToken, {
          status: statusFilter === "all" ? undefined : statusFilter,
          subject: subjectFilter === "All" ? undefined : subjectFilter,
          page: 1,
          limit: 200,
        });

        if (!cancelled) {
          addLog(`Success! Got ${response.items.length} items`);
          setItems(response.items);
        } else {
          addLog("Cancelled after success");
        }
      } catch (err: any) {
        if (!cancelled) {
          addLog(`Error: ${err.message || err}`);
          if (err.detail) addLog(`Detail: ${err.detail}`);

          setItems([]);
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load content items.");
          }
        }
      } finally {
        if (!cancelled) {
          addLog("Finally block - loading false");
          setLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey, statusFilter, subjectFilter]);

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    if (!authToken || moderatingId) return;

    setActionError(null);
    setModeratingId(id);

    try {
      const updated = await updateAdminContentStatus(authToken, id, newStatus);
      if (statusFilter === "pending") {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to update content status.");
      }
    } finally {
      setModeratingId(null);
    }
  };

  const pendingCount = items.filter((item) => item.status === "pending").length;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {/* Header */}
      <div className="animate-fade-in flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Content Moderation</h1>
        <p className="text-xs text-muted-foreground">
          {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending review
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Status Filters */}
      <div className="animate-fade-in flex gap-2 overflow-x-auto" style={{ animationDelay: "50ms" }}>
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s.value
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
              }`}
          >
            {s.value === "pending" && <Clock className="h-3 w-3" />}
            {s.value === "approved" && <CheckCircle2 className="h-3 w-3" />}
            {s.value === "rejected" && <XCircle className="h-3 w-3" />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Subject Filters */}
      <div className="animate-fade-in flex gap-2 overflow-x-auto" style={{ animationDelay: "100ms" }}>
        <Filter className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setSubjectFilter(sub)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${subjectFilter === sub
              ? "bg-accent/15 text-accent"
              : "border border-border bg-card text-muted-foreground"
              }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Content List */}
      <div className="animate-fade-in flex flex-col gap-2" style={{ animationDelay: "150ms" }}>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading content items...
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No content items found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.status === "pending"
                    ? "bg-warning/15"
                    : item.status === "approved"
                      ? "bg-accent/15"
                      : "bg-destructive/15"
                    }`}
                >
                  <FileText
                    className={`h-4 w-4 ${item.status === "pending"
                      ? "text-warning"
                      : item.status === "approved"
                        ? "text-accent"
                        : "text-destructive"
                      }`}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      by {item.uploaded_by}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-foreground">
                      {item.subject}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${item.status === "pending"
                        ? "bg-warning/15 text-warning"
                        : item.status === "approved"
                          ? "bg-accent/15 text-accent"
                          : "bg-destructive/15 text-destructive"
                        }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>

              {item.status === "pending" && (
                <div className="flex gap-2 border-t border-border pt-2">
                  <button
                    onClick={() => updateStatus(item.id, "approved")}
                    disabled={moderatingId === item.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent/10 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {moderatingId === item.id ? "Updating..." : "Approve"}
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, "rejected")}
                    disabled={moderatingId === item.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <X className="h-3.5 w-3.5" />
                    {moderatingId === item.id ? "Updating..." : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Debug Logs */}
      <div className="mt-4 max-h-40 overflow-y-auto rounded bg-black/80 p-2 text-[10px] font-mono text-green-400">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
