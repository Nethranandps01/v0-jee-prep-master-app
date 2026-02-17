"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  Subject,
  UserPublic,
  Year,
  createAdminUser,
  listAdminUsers,
  updateAdminUserStatus,
} from "@/lib/api-client";
import { CacheManager, CacheKeys } from "@/lib/cache-manager";
import {
  Users,
  Search,
  GraduationCap,
  BookOpen,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Mail,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

type TabFilter = "all" | "student" | "teacher";
type AddUserRole = "student" | "teacher";

const SUBJECT_OPTIONS: Subject[] = ["Physics", "Chemistry", "Mathematics"];
const YEAR_OPTIONS: Year[] = ["11th", "12th"];

const defaultForm = {
  name: "",
  email: "",
  password: "",
  role: "student" as AddUserRole,
  subject: "Physics" as Subject,
  year: "11th" as Year,
};

export function AdminUsersScreen() {
  const { authToken } = useApp();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      if (!authToken) {
        setUsers([]);
        setLoading(false);
        setError("Admin login is required to manage users.");
        return;
      }

      const isDefaultView = activeTab === "all" && !debouncedSearch;

      // 1. Try cache if default view
      if (loading && isDefaultView) {
        const cached = CacheManager.load<UserPublic[]>(CacheKeys.ADMIN_USERS);
        if (cached) {
          setUsers(cached);
          setLoading(false);
        }
      }

      if (!isDefaultView && loading) {
        // For non-default views, we might not have cache, or we want to show loading
        // But if we already have users (from a previous tab switch), we might not want to show hard loading?
        // For now, let's keep loading=true behavior for filters to show activity.
      }

      setError(null);
      setActionError(null);

      try {
        const response = await listAdminUsers(authToken, {
          role: activeTab === "all" ? undefined : activeTab,
          search: debouncedSearch || undefined,
          page: 1,
          limit: 200,
        });

        if (!cancelled) {
          const visibleUsers = response.items.filter((user) => user.role !== "admin");
          setUsers(visibleUsers);
          if (isDefaultView) {
            CacheManager.save(CacheKeys.ADMIN_USERS, visibleUsers);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("Failed to load users.");
          }
          // Only clear users if we don't have cache/existing data?
          // For now, let's play safe and not clear if we have cache, *unless* it was a filter search that failed.
          if (!isDefaultView) {
            setUsers([]);
          } else {
            // If default view failed but we have cache, we might keep showing cache?
            // But existing logic cleared it. Let's rely on cache if available.
            const cached = CacheManager.load<UserPublic[]>(CacheKeys.ADMIN_USERS);
            if (!cached) setUsers([]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [activeTab, authToken, debouncedSearch, reloadKey]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setActionError(null);
    resetForm();
  };

  const toggleStatus = async (user: UserPublic) => {
    if (!authToken || statusUpdatingUserId) return;

    setActionError(null);
    setStatusUpdatingUserId(user.id);

    try {
      const updated = await updateAdminUserStatus(
        authToken,
        user.id,
        user.status === "active" ? "inactive" : "active",
      );
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to update user status.");
      }
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const handleAddUser = async () => {
    if (!authToken || isAddingUser) return;

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !form.password.trim()) {
      setActionError("Name, email, and password are required.");
      return;
    }

    if (form.password.length < 8) {
      setActionError("Password must be at least 8 characters.");
      return;
    }

    setActionError(null);
    setIsAddingUser(true);

    try {
      await createAdminUser(authToken, {
        name: trimmedName,
        email: trimmedEmail,
        password: form.password,
        role: form.role,
        ...(form.role === "teacher" ? { subject: form.subject } : { year: form.year }),
      });

      handleCloseForm();
      setReloadKey((value) => value + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.detail);
      } else {
        setActionError("Unable to add user.");
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  const tabs: { label: string; value: TabFilter; icon: typeof Users }[] = [
    { label: "All", value: "all", icon: Users },
    { label: "Students", value: "student", icon: GraduationCap },
    { label: "Teachers", value: "teacher", icon: BookOpen },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Loading users..."
              : `${users.length} user${users.length === 1 ? "" : "s"} shown`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-transform active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Search */}
      <div className="animate-fade-in relative" style={{ animationDelay: "50ms" }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Tabs */}
      <div className="animate-fade-in flex gap-2" style={{ animationDelay: "100ms" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* User List */}
      <div className="animate-fade-in flex flex-col gap-2" style={{ animationDelay: "150ms" }}>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading users...
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
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        ) : (
          users.map((user) => {
            const isExpanded = expandedUser === user.id;
            return (
              <div
                key={user.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="flex items-center gap-3 p-3 text-left"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${user.role === "teacher"
                      ? "bg-accent/15 text-accent"
                      : "bg-primary/15 text-primary"
                      }`}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${user.status === "active"
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {user.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {user.role === "teacher"
                        ? `${user.subject ?? "N/A"} Teacher`
                        : `${user.year ?? "N/A"} Student`}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground capitalize">
                        {user.role}
                      </span>
                    </div>
                    {user.role === "student" && user.year && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Year:</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {user.year} Class
                        </span>
                      </div>
                    )}
                    {user.role === "teacher" && user.subject && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Subject:</span>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {user.subject}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={statusUpdatingUserId === user.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${user.status === "active"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/10 text-accent"
                        }`}
                    >
                      {statusUpdatingUserId === user.id ? (
                        "Updating..."
                      ) : user.status === "active" ? (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          Deactivate User
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          Activate User
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Add New User</h2>
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
                placeholder="Full Name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="password"
                placeholder="Password (min 8 chars)"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as AddUserRole,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              {form.role === "teacher" ? (
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      subject: e.target.value as Subject,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={form.year}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      year: e.target.value as Year,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleAddUser}
                disabled={isAddingUser}
                className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                {isAddingUser ? "Adding User..." : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
