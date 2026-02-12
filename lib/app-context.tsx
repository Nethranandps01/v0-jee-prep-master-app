"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "student" | "teacher" | "admin" | null;

export type AppScreen =
  | "splash"
  | "onboarding"
  | "auth"
  | "student-home"
  | "student-tests"
  | "student-test-active"
  | "student-results"
  | "student-library"
  | "student-progress"
  | "student-profile"
  | "student-feedback"
  | "teacher-home"
  | "teacher-tests"
  | "teacher-paper-generator"
  | "teacher-library"
  | "teacher-upload"
  | "teacher-classes"
  | "teacher-profile"
  | "teacher-lesson-plans"
  | "admin-dashboard"
  | "admin-users"
  | "admin-content"
  | "admin-reports"
  | "notifications"
  | "ai-chat";

interface AppContextType {
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  setUserName: (name: string) => void;
  showAIChat: boolean;
  setShowAIChat: (show: boolean) => void;
  activeTestId: string | null;
  setActiveTestId: (id: string | null) => void;
  completedTestId: string | null;
  setCompletedTestId: (id: string | null) => void;
  teacherSubject: string | null;
  setTeacherSubject: (subject: string | null) => void;
  studentYear: "11th" | "12th" | null;
  setStudentYear: (year: "11th" | "12th" | null) => void;
  navigate: (screen: AppScreen) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState("Rahul");
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [completedTestId, setCompletedTestId] = useState<string | null>(null);
  const [teacherSubject, setTeacherSubject] = useState<string | null>(null);
  const [studentYear, setStudentYear] = useState<"11th" | "12th" | null>(null);

  const navigate = useCallback((newScreen: AppScreen) => {
    setScreen(newScreen);
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        role,
        setRole,
        userName,
        setUserName,
        showAIChat,
        setShowAIChat,
        activeTestId,
        setActiveTestId,
        completedTestId,
        setCompletedTestId,
        teacherSubject,
        setTeacherSubject,
        studentYear,
        setStudentYear,
        navigate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
