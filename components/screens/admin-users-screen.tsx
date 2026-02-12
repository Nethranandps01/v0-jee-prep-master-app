"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sampleUsers } from "@/lib/sample-data";
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

export function AdminUsersScreen() {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState(sampleUsers);

  const filteredUsers = users.filter((user) => {
    const matchTab = activeTab === "all" || user.role === activeTab;
    const matchSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const toggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? ("inactive" as const) : ("active" as const) }
          : u
      )
    );
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
          <p className="text-xs text-muted-foreground">{users.length} total users</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-transform active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

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
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                isActive
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
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
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
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      user.role === "teacher"
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
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          user.status === "active"
                            ? "bg-accent/15 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {user.role === "teacher"
                        ? `${user.subject} Teacher`
                        : `${user.year} Student`}
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
                      onClick={() => toggleStatus(user.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        user.status === "active"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {user.status === "active" ? (
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
                onClick={() => setShowAddForm(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <button
                onClick={() => setShowAddForm(false)}
                className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
