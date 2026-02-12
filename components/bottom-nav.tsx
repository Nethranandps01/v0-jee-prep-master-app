"use client";

import { useApp, type AppScreen } from "@/lib/app-context";
import {
  Home,
  FileText,
  BookOpen,
  TrendingUp,
  Users,
  Plus,
  Sparkles,
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  ClipboardList,
} from "lucide-react";

const studentTabs: { icon: typeof Home; label: string; screen: AppScreen }[] = [
  { icon: Home, label: "Home", screen: "student-home" },
  { icon: FileText, label: "Tests", screen: "student-tests" },
  { icon: BookOpen, label: "Library", screen: "student-library" },
  { icon: TrendingUp, label: "Progress", screen: "student-progress" },
];

const teacherTabs: { icon: typeof Home; label: string; screen: AppScreen }[] = [
  { icon: Home, label: "Home", screen: "teacher-home" },
  { icon: FileText, label: "Papers", screen: "teacher-tests" },
  { icon: ClipboardList, label: "Lessons", screen: "teacher-lesson-plans" },
  { icon: Users, label: "Classes", screen: "teacher-classes" },
];

const adminTabs: { icon: typeof Home; label: string; screen: AppScreen }[] = [
  { icon: LayoutDashboard, label: "Dashboard", screen: "admin-dashboard" },
  { icon: Users, label: "Users", screen: "admin-users" },
  { icon: FolderOpen, label: "Content", screen: "admin-content" },
  { icon: BarChart3, label: "Reports", screen: "admin-reports" },
];

export function BottomNav() {
  const { screen, navigate, role } = useApp();

  if (role === "admin") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
        <div className="mx-auto grid max-w-lg grid-cols-4 pb-5 pt-2">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = screen === tab.screen;
            return (
              <button
                key={tab.screen}
                onClick={() => navigate(tab.screen)}
                className="flex flex-col items-center justify-end gap-1 py-1"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const tabs = role === "teacher" ? teacherTabs : studentTabs;

  const fabAction = () => {
    if (role === "teacher") {
      navigate("teacher-paper-generator");
    } else {
      navigate("student-tests");
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
      <div className="relative mx-auto grid max-w-lg grid-cols-5 pb-5 pt-2">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = screen === tab.screen;
          return (
            <button
              key={tab.screen}
              onClick={() => navigate(tab.screen)}
              className="flex flex-col items-center justify-end gap-1 py-1"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        <div className="flex flex-col items-center justify-end">
          <button
            onClick={fabAction}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95"
            aria-label={role === "teacher" ? "Generate Paper" : "Start Test"}
          >
            {role === "teacher" ? (
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Plus className="h-6 w-6 text-primary-foreground" />
            )}
          </button>
          <span className="mt-1 text-[10px] font-medium text-primary">
            {role === "teacher" ? "Generate" : "Test"}
          </span>
        </div>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = screen === tab.screen;
          return (
            <button
              key={tab.screen}
              onClick={() => navigate(tab.screen)}
              className="flex flex-col items-center justify-end gap-1 py-1"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
