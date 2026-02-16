"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { configureAuthHandlers, type TokenPairResponse } from "@/lib/api-client";
import { CacheManager, CacheKeys } from "@/lib/cache-manager"; // Added

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
  // Dashboard Caching
  studentHomeData: any | null;
  setStudentHomeData: (data: any | null) => void;
  studentProgressData: any | null;
  setStudentProgressData: (data: any | null) => void;
  teacherHomeData: any | null;
  setTeacherHomeData: (data: any | null) => void;
  adminDashboardData: any | null;
  setAdminDashboardData: (data: any | null) => void;
  studentLibraryData: any | null;
  setStudentLibraryData: (data: any | null) => void;
  studentLibraryDownloads: any | null;
  setStudentLibraryDownloads: (data: any | null) => void;
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
  const [studentHomeData, setStudentHomeData] = useState<any | null>(null);
  const [studentProgressData, setStudentProgressData] = useState<any | null>(null);
  const [teacherHomeData, setTeacherHomeData] = useState<any | null>(null);
  const [adminDashboardData, setAdminDashboardData] = useState<any | null>(null);
  const [studentLibraryData, setStudentLibraryData] = useState<any | null>(null);
  const [studentLibraryDownloads, setStudentLibraryDownloads] = useState<any | null>(null);

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
    // Clear SWR cache on logout
    CacheManager.clearAll();
    setStudentHomeData(null);
    setStudentProgressData(null);
    setStudentLibraryData(null);
    setTeacherHomeData(null);
    setAdminDashboardData(null);
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

  // -- SWR / Caching Effects --

  // 1. Hydrate from Cache on Mount (or when role changes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Attempt hydration
    const cachedHome = CacheManager.load(CacheKeys.STUDENT_HOME);
    if (cachedHome) setStudentHomeData(cachedHome);

    const cachedProgress = CacheManager.load(CacheKeys.STUDENT_PROGRESS);
    if (cachedProgress) setStudentProgressData(cachedProgress);

    const cachedLibrary = CacheManager.load(CacheKeys.STUDENT_LIBRARY);
    if (cachedLibrary) setStudentLibraryData(cachedLibrary);

    const cachedTeacher = CacheManager.load(CacheKeys.TEACHER_HOME);
    if (cachedTeacher) setTeacherHomeData(cachedTeacher);

    const cachedAdmin = CacheManager.load(CacheKeys.ADMIN_DASHBOARD);
    if (cachedAdmin) setAdminDashboardData(cachedAdmin);

  }, []); // Run once on mount

  // 2. Persist to Cache on Change
  useEffect(() => {
    if (studentHomeData) CacheManager.save(CacheKeys.STUDENT_HOME, studentHomeData);
  }, [studentHomeData]);

  useEffect(() => {
    if (studentProgressData) CacheManager.save(CacheKeys.STUDENT_PROGRESS, studentProgressData);
  }, [studentProgressData]);

  useEffect(() => {
    if (studentLibraryData) CacheManager.save(CacheKeys.STUDENT_LIBRARY, studentLibraryData);
  }, [studentLibraryData]);

  useEffect(() => {
    if (teacherHomeData) CacheManager.save(CacheKeys.TEACHER_HOME, teacherHomeData);
  }, [teacherHomeData]);

  useEffect(() => {
    if (adminDashboardData) CacheManager.save(CacheKeys.ADMIN_DASHBOARD, adminDashboardData);
  }, [adminDashboardData]);

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
        studentHomeData,
        setStudentHomeData,
        studentProgressData,
        setStudentProgressData,
        teacherHomeData,
        setTeacherHomeData,
        adminDashboardData,
        setAdminDashboardData,
        studentLibraryData,
        setStudentLibraryData,
        studentLibraryDownloads,
        setStudentLibraryDownloads,
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
