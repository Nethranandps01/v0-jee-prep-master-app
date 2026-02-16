"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { listNotifications } from "@/lib/api-client";
import { useTheme } from "next-themes";
import { Bell, Search, Sun, Moon, Zap, UserCircle } from "lucide-react";

export function TopBar() {
  const { navigate, role, authToken, screen } = useApp();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!authToken || role === "admin" || !role) {
        setUnreadCount(0);
        return;
      }

      try {
        const items = await listNotifications(authToken);
        if (!cancelled) {
          setUnreadCount(items.filter((item) => !item.read).length);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [authToken, role, screen]);

  const handleSearchClick = () => {
    if (role === "admin") {
      navigate("admin-users");
    } else if (role === "teacher") {
      navigate("teacher-tests");
    } else {
      navigate("student-tests");
    }
  };

  const handleProfileClick = () => {
    if (role === "teacher") {
      navigate("teacher-profile");
    } else if (role === "admin") {
      navigate("admin-profile");
    } else {
      navigate("student-profile");
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 pb-3 pt-[calc(0.75rem+var(--safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">JPM</span>
          {role === "admin" && (
            <span className="text-[10px] font-medium text-warning">Principal</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleSearchClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        {role !== "admin" && (
          <button
            onClick={() => navigate("notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={handleProfileClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Profile"
        >
          <UserCircle className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
