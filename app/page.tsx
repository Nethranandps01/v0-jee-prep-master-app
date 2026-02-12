"use client";

import { AppProvider, useApp } from "@/lib/app-context";
import { SplashScreen } from "@/components/screens/splash-screen";
import { OnboardingScreen } from "@/components/screens/onboarding-screen";
import { AuthScreen } from "@/components/screens/auth-screen";
import { StudentHomeScreen } from "@/components/screens/student-home-screen";
import { StudentTestsScreen } from "@/components/screens/student-tests-screen";
import { StudentTestActiveScreen } from "@/components/screens/student-test-active-screen";
import { StudentResultsScreen } from "@/components/screens/student-results-screen";
import { StudentLibraryScreen } from "@/components/screens/student-library-screen";
import { StudentProgressScreen } from "@/components/screens/student-progress-screen";
import { StudentProfileScreen } from "@/components/screens/student-profile-screen";
import { StudentFeedbackScreen } from "@/components/screens/student-feedback-screen";
import { TeacherHomeScreen } from "@/components/screens/teacher-home-screen";
import { TeacherTestsScreen } from "@/components/screens/teacher-tests-screen";
import { TeacherPaperGeneratorScreen } from "@/components/screens/teacher-paper-generator-screen";
import { TeacherLibraryScreen } from "@/components/screens/teacher-library-screen";
import { TeacherClassesScreen } from "@/components/screens/teacher-classes-screen";
import { TeacherProfileScreen } from "@/components/screens/teacher-profile-screen";
import { TeacherLessonPlansScreen } from "@/components/screens/teacher-lesson-plans-screen";
import { AdminDashboardScreen } from "@/components/screens/admin-dashboard-screen";
import { AdminUsersScreen } from "@/components/screens/admin-users-screen";
import { AdminContentScreen } from "@/components/screens/admin-content-screen";
import { AdminReportsScreen } from "@/components/screens/admin-reports-screen";
import { NotificationsScreen } from "@/components/screens/notifications-screen";
import { AIChatScreen } from "@/components/screens/ai-chat-screen";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

function AppScreens() {
  const { screen } = useApp();

  const fullScreens = ["splash", "onboarding", "auth", "student-test-active"];
  const isFullScreen = fullScreens.includes(screen);

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return <SplashScreen />;
      case "onboarding":
        return <OnboardingScreen />;
      case "auth":
        return <AuthScreen />;
      case "student-home":
        return <StudentHomeScreen />;
      case "student-tests":
        return <StudentTestsScreen />;
      case "student-test-active":
        return <StudentTestActiveScreen />;
      case "student-results":
        return <StudentResultsScreen />;
      case "student-library":
        return <StudentLibraryScreen />;
      case "student-progress":
        return <StudentProgressScreen />;
      case "student-profile":
        return <StudentProfileScreen />;
      case "student-feedback":
        return <StudentFeedbackScreen />;
      case "teacher-home":
        return <TeacherHomeScreen />;
      case "teacher-tests":
        return <TeacherTestsScreen />;
      case "teacher-paper-generator":
        return <TeacherPaperGeneratorScreen />;
      case "teacher-library":
        return <TeacherLibraryScreen />;
      case "teacher-upload":
        return <TeacherLibraryScreen />;
      case "teacher-classes":
        return <TeacherClassesScreen />;
      case "teacher-profile":
        return <TeacherProfileScreen />;
      case "teacher-lesson-plans":
        return <TeacherLessonPlansScreen />;
      case "admin-dashboard":
        return <AdminDashboardScreen />;
      case "admin-users":
        return <AdminUsersScreen />;
      case "admin-content":
        return <AdminContentScreen />;
      case "admin-reports":
        return <AdminReportsScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "ai-chat":
        return <AIChatScreen />;
      default:
        return <StudentHomeScreen />;
    }
  };

  if (isFullScreen) {
    return <>{renderScreen()}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-24">{renderScreen()}</main>
      <BottomNav />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <AppScreens />
    </AppProvider>
  );
}
