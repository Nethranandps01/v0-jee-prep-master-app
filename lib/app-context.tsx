"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { configureAuthHandlers, type TokenPairResponse } from "@/lib/api-client";

export type UserRole = "student" | "teacher" | "admin" | null;

export interface AttemptQuestion {
  id: string;
  subject: string;
  text: string;
  options: string[];
}

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
  | "student-study-plan"
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
  | "teacher-student-details"
  | "admin-dashboard"
  | "admin-profile"
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
  userId: string | null;
  setUserId: (id: string | null) => void;
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
  clearAuth: () => void;
  userName: string;
  setUserName: (name: string) => void;
  showAIChat: boolean;
  setShowAIChat: (show: boolean) => void;
  activeTestId: string | null;
  setActiveTestId: (id: string | null) => void;
  activeAttemptId: string | null;
  setActiveAttemptId: (id: string | null) => void;
  completedTestId: string | null;
  setCompletedTestId: (id: string | null) => void;
  attemptQuestions: AttemptQuestion[] | null;
  setAttemptQuestions: (questions: AttemptQuestion[] | null) => void;
  attemptAnswers: (number | null)[] | null;
  setAttemptAnswers: (answers: (number | null)[] | null) => void;
  teacherSubject: string | null;
  setTeacherSubject: (subject: string | null) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  studentYear: "11th" | "12th" | null;
  setStudentYear: (year: "11th" | "12th" | null) => void;
  navigate: (screen: AppScreen) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = "jpm_auth_v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [role, setRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [completedTestId, setCompletedTestId] = useState<string | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<AttemptQuestion[] | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<(number | null)[] | null>(null);
  const [teacherSubject, setTeacherSubject] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentYear, setStudentYear] = useState<"11th" | "12th" | null>(null);

  const clearAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setAuthToken(null);
    setRefreshToken(null);
    setRole(null);
    setUserId(null);
    setUserEmail(null);
    setUserName("");
    setTeacherSubject(null);
    setSelectedStudentId(null);
    setStudentYear(null);
    setActiveAttemptId(null);
    setActiveTestId(null);
    setCompletedTestId(null);
    setAttemptQuestions(null);
    setAttemptAnswers(null);
    setShowAIChat(false);
  }, []);

  const navigate = useCallback((newScreen: AppScreen) => {
    setScreen(newScreen);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as {
        role?: UserRole;
        userId?: string | null;
        userEmail?: string | null;
        userName?: string;
        authToken?: string | null;
        refreshToken?: string | null;
        teacherSubject?: string | null;
        studentYear?: "11th" | "12th" | null;
      };

      if (!data.authToken || !data.refreshToken || !data.role) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return;
      }

      setRole(data.role);
      setUserId(data.userId ?? null);
      setUserEmail(data.userEmail ?? null);
      setUserName(data.userName ?? "");
      setAuthToken(data.authToken);
      setRefreshToken(data.refreshToken);
      setTeacherSubject(data.teacherSubject ?? null);
      setStudentYear(data.studentYear ?? null);
      setScreen(
        data.role === "admin"
          ? "admin-dashboard"
          : data.role === "teacher"
            ? "teacher-home"
            : "student-home",
      );
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!authToken || !refreshToken || !role) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        role,
        userId,
        userEmail,
        userName,
        authToken,
        refreshToken,
        teacherSubject,
        studentYear,
      }),
    );
  }, [
    authToken,
    refreshToken,
    role,
    userId,
    userEmail,
    userName,
    teacherSubject,
    studentYear,
  ]);

  useEffect(() => {
    configureAuthHandlers({
      getRefreshToken: () => refreshToken,
      onTokenRefresh: (tokens: TokenPairResponse) => {
        setAuthToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
      },
      onAuthFailure: () => {
        clearAuth();
        setScreen("auth");
      },
    });

    return () => {
      configureAuthHandlers(null);
    };
  }, [refreshToken, clearAuth]);

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        role,
        setRole,
        userId,
        setUserId,
        userEmail,
        setUserEmail,
        authToken,
        setAuthToken,
        refreshToken,
        setRefreshToken,
        clearAuth,
        userName,
        setUserName,
        showAIChat,
        setShowAIChat,
        activeTestId,
        setActiveTestId,
        activeAttemptId,
        setActiveAttemptId,
        completedTestId,
        setCompletedTestId,
        attemptQuestions,
        setAttemptQuestions,
        attemptAnswers,
        setAttemptAnswers,
        teacherSubject,
        setTeacherSubject,
        selectedStudentId,
        setSelectedStudentId,
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
