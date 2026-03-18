"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  NotificationResponse,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api-client";
import {
  ArrowLeft,
  Bell,
  FileText,
  Trophy,
  Flame,
  BookOpen,
  Check,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function NotificationsLoading() {
  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-16 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

const iconMap: Record<string, typeof Bell> = {
  test: FileText,
  result: Trophy,
  streak: Flame,
  material: BookOpen,
};

const colorMap: Record<string, string> = {
  test: "bg-primary/15 text-primary",
  result: "bg-warning/15 text-warning",
  streak: "bg-accent/15 text-accent",
  material: "bg-primary/15 text-primary",
};

function timeAgo(iso: string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return "Unknown";

  const seconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsScreen() {
  const { navigate, role, authToken } = useApp();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!authToken) {
        setError("Login is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await listNotifications(authToken);
        if (!cancelled) {
          setItems(response);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load notifications.");
          }
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [authToken, reloadKey]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const handleMarkRead = async (notification: NotificationResponse) => {
    if (!authToken || notification.read) return;

    try {
      const updated = await markNotificationRead(authToken, notification.id, true);
      setItems((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // Best-effort; keep UI responsive even if this fails.
    }
  };

  const handleMarkAllRead = async () => {
    if (!authToken || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    try {
      await markAllNotificationsRead(authToken);
      setItems((previous) => previous.map((item) => ({ ...item, read: true })));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to mark all notifications as read.");
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const goBack = () => {
    navigate(role === "teacher" ? "teacher-home" : "student-home");
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <div className="ml-auto flex h-6 items-center rounded-full bg-primary/15 px-2.5">
          <span className="text-[11px] font-medium text-primary">{unreadCount} new</span>
        </div>
        <button
          onClick={() => {
            void handleMarkAllRead();
          }}
          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          disabled={unreadCount === 0 || markingAll}
        >
          {markingAll ? "Updating..." : "Mark all read"}
        </button>
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

      <div className="flex flex-col gap-2">
        {loading ? (
          <NotificationsLoading />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
             No notifications available.
          </div>
        ) : (
          items.map((notification, index) => {
            const Icon = iconMap[notification.type] || Bell;
            const colorClass = colorMap[notification.type] || "bg-muted text-muted-foreground";
            return (
              <div
                key={notification.id}
                className={`animate-fade-in relative flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  notification.read ? "border-border bg-card" : "border-primary/20 bg-primary/5 shadow-sm"
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1 pr-8">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-foreground text-left">{notification.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground text-left line-clamp-2">{notification.message}</p>
                  <span className="text-[10px] text-muted-foreground/70 text-left pt-0.5">{timeAgo(notification.created_at)}</span>
                </div>
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleMarkRead(notification);
                    }}
                    title="Mark as read"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
