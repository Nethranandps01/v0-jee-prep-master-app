"use client";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
const PRODUCTION_API_URL = "https://jpm-backend.onrender.com/api/v1";

export const API_BASE_URL = (
  (typeof window !== "undefined" ? (window as any)._env_?.NEXT_PUBLIC_API_BASE_URL : null) ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? PRODUCTION_API_URL : DEFAULT_API_BASE_URL)
).replace(/\/+$/, "");

export type ApiRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";
export type Subject = "Physics" | "Chemistry" | "Mathematics";
export type Year = "11th" | "12th";
export type ContentStatus = "pending" | "approved" | "rejected";

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface MessageResponse {
  message: string;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  status: UserStatus;
  subject: Subject | null;
  year: Year | null;
  created_at?: string | null;
}

export interface DepartmentPerformance {
  subject: string;
  teachers: number;
  students: number;
  avg_score: number;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: string;
}

export interface MonthlyUsageItem {
  month: string;
  tests: number;
  papers: number;
}

export interface AdminDashboardResponse {
  total_students: number;
  total_teachers: number;
  active_tests: number;
  pass_rate: number;
  departments: DepartmentPerformance[];
  recent_activity: ActivityItem[];
}

export interface ContentItemResponse {
  id: string;
  title: string;
  uploaded_by: string;
  subject: Subject;
  date: string;
  status: ContentStatus;
  created_at?: string | null;
}

export interface AnalyticsReportResponse {
  total_students: number;
  total_teachers: number;
  active_tests: number;
  pass_rate: number;
  departments: DepartmentPerformance[];
  monthly_usage: MonthlyUsageItem[];
}

export interface BillingReportResponse {
  plan: string;
  students_allowed: number;
  students_used: number;
  monthly_usage: MonthlyUsageItem[];
  renewal_date: string;
}

export interface AdminUserCreatePayload {
  name: string;
  email: string;
  password: string;
  role: "teacher" | "student";
  subject?: Subject;
  year?: Year;
}

export interface TeacherHomeSummaryResponse {
  total_students: number;
  total_papers: number;
  subject_avg: number;
}

export interface TeacherPaperResponse {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  questions: number;
  duration: number;
  status: string;
  year?: string | null;
  assigned: boolean;
  students: number;
  question_source?: string | null;
  question_set?: TeacherPaperQuestion[] | null;
  created_at?: string | null;
}

export interface TeacherPaperQuestion {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface TeacherClassResponse {
  id: string;
  name: string;
  subject: string;
  year: string;
  students: number;
  avg_score: number;
}

export interface TeacherClassStudentOption extends UserPublic {
  assigned: boolean;
}

export interface LessonPlanResponse {
  id: string;
  subject: string;
  year: string;
  topic: string;
  objectives: string[];
  activities: string[];
  duration: number;
  status: "draft" | "published";
}

export interface LibraryItemResponse {
  id: string;
  title: string;
  subject: string;
  type: string;
  chapters: number;
  year: string;
  status?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  file_content_type?: string | null;
  created_at?: string | null;
}

export interface TeacherPaperCreatePayload {
  title: string;
  subject: Subject;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  questions: number;
  duration: number;
  year: Year;
  topic?: string;
}

export interface TeacherPaperUpdatePayload {
  title?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  duration?: number;
  questions?: number;
  status?: "draft" | "assigned" | "archived";
}

export interface TeacherClassCreatePayload {
  name: string;
  year: Year;
  subject: Subject;
}

export interface LessonPlanCreatePayload {
  year: Year;
  topic: string;
  objectives: string[];
  activities: string[];
  duration: number;
}

export interface LessonPlanUpdatePayload {
  topic?: string;
  objectives?: string[];
  activities?: string[];
  duration?: number;
  status?: "draft" | "published";
}

export interface TeacherLibraryCreatePayload {
  title: string;
  subject: Subject | "All";
  type: "PDF" | "Question Bank" | "DOCX" | "Image";
  chapters: number;
  year: Year;
  file: File;
  publishNow?: boolean;
}

export interface TeacherStudentAttemptResponse {
  attempt_id: string;
  test_title: string;
  subject: string;
  score: number;
  total_questions: number;
  submitted_at: string | null;
  violation_reason: string | null;
  is_suspicious: boolean;
  questions?: {
    question_text: string;
    selected_option: string | null;
    correct_option: string;
    is_correct: boolean;
    explanation?: string | null;
    time_spent: number;
  }[];
}

export interface StudentHomeSummaryResponse {
  assigned_tests: number;
  completed_tests: number;
  avg_score: number;
  streak: number;
}

export interface StudentTestResponse {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  questions: number;
  duration: number;
  status: string;
  attempt_id: string | null;
  year?: string | null;
  score?: number | null;
  created_at?: string | null;
}

export interface AttemptQuestionResponse {
  id: string;
  subject: string;
  text: string;
  options: string[];
}

export interface StartAttemptResponse {
  attempt_id: string;
  status: string;
  started_at: string;
  duration: number;
  questions: AttemptQuestionResponse[];
  answers: Record<string, number | null>;
}

export interface SaveAnswersResponse {
  attempt_id: string;
  saved_answers: number;
}

export interface SubmitAttemptResponse {
  attempt_id: string;
  score: number;
  total_questions: number;
  answered: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
}

export interface ResultResponse {
  attempt_id: string;
  test_id: string;
  subject: string;
  score: number;
  total_questions: number;
  answered: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
  submitted_at: string;
  questions: ResultQuestionResponse[];
}

export interface ResultQuestionResponse {
  question_id: string;
  subject: string;
  question_text: string;
  options: string[];
  selected_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
}

export interface RankPoint {
  week: string;
  rank: number;
}

export interface TopicMastery {
  topic: string;
  mastery: number;
}

export interface StudentProgressResponse {
  overall_rank: number;
  total_students: number;
  tests_completed: number;
  avg_score: number;
  rank_history: RankPoint[];
  topic_mastery: TopicMastery[];
}

export interface StudentLibraryItemResponse {
  id: string;
  title: string;
  subject: string;
  type: string;
  chapters: number;
  year: string;
  file_name?: string | null;
  file_size_bytes?: number | null;
  file_content_type?: string | null;
}

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface ChatAskResponse {
  response: string;
}

export interface NotificationReadAllResponse {
  updated_count: number;
}

export interface StudentDoubtResponse {
  id: string;
  query: string;
  response: string;
  subject?: string | null;
  context?: string | null;
  created_at: string;
}

export interface StudentDoubtAskPayload {
  query: string;
  subject?: Subject;
  context?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(detail: string, status: number) {
    super(detail);
    this.name = "ApiError";
    this.detail = detail;
    this.status = status;
  }
}

interface AuthLifecycleHandlers {
  getRefreshToken: () => string | null;
  onTokenRefresh: (tokens: TokenPairResponse) => void;
  onAuthFailure?: () => void;
}

let authLifecycleHandlers: AuthLifecycleHandlers | null = null;
let refreshInFlight: Promise<TokenPairResponse> | null = null;

export function configureAuthHandlers(handlers: AuthLifecycleHandlers | null): void {
  authLifecycleHandlers = handlers;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
  keepalive?: boolean;
}

function buildUrl(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail = `Request failed (${response.status})`;

  try {
    const payload = (await response.json()) as { detail?: unknown } | undefined;

    if (typeof payload?.detail === "string") {
      detail = payload.detail;
    } else if (Array.isArray(payload?.detail)) {
      detail = payload.detail
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (
            typeof entry === "object" &&
            entry !== null &&
            "msg" in entry &&
            typeof entry.msg === "string"
          ) {
            return entry.msg;
          }
          return null;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join(", ");
    }
  } catch {
    // Keep fallback detail text.
  }

  return new ApiError(detail, response.status);
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body !== undefined &&
    options.body instanceof FormData;
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as BodyInit)
          : JSON.stringify(options.body),
    cache: "no-store",
    keepalive: options.keepalive,
  });

  if (response.status === 401 && options.token && authLifecycleHandlers && !options.skipRefresh) {
    const refreshToken = authLifecycleHandlers.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await refreshAccessTokenShared(refreshToken);
        authLifecycleHandlers.onTokenRefresh(refreshed);
        return apiRequest<T>(path, {
          ...options,
          token: refreshed.access_token,
          skipRefresh: true,
        });
      } catch {
        authLifecycleHandlers.onAuthFailure?.();
      }
    } else {
      authLifecycleHandlers.onAuthFailure?.();
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loginWithPassword(payload: {
  email: string;
  password: string;
}): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function registerWithPassword(payload: {
  name: string;
  email: string;
  password: string;
  role: "teacher" | "student";
  subject?: Subject;
  year?: Year;
}): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export async function fetchCurrentUser(token: string): Promise<UserPublic> {
  return apiRequest<UserPublic>("/auth/me", { token });
}

export async function getAdminDashboard(token: string): Promise<AdminDashboardResponse> {
  return apiRequest<AdminDashboardResponse>("/admin/dashboard", { token });
}

export async function listAdminUsers(
  token: string,
  params: {
    role?: "admin" | "teacher" | "student";
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<PaginatedResponse<UserPublic>> {
  return apiRequest<PaginatedResponse<UserPublic>>("/admin/users", {
    token,
    query: {
      role: params.role,
      status: params.status,
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
}

export async function createAdminUser(
  token: string,
  payload: AdminUserCreatePayload,
): Promise<UserPublic> {
  return apiRequest<UserPublic>("/admin/users", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateAdminUserStatus(
  token: string,
  userId: string,
  status: UserStatus,
): Promise<UserPublic> {
  return apiRequest<UserPublic>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export async function listAdminContentItems(
  token: string,
  params: {
    status?: ContentStatus;
    subject?: Subject;
    page?: number;
    limit?: number;
  } = {},
): Promise<PaginatedResponse<ContentItemResponse>> {
  return apiRequest<PaginatedResponse<ContentItemResponse>>("/admin/content-items", {
    token,
    query: {
      status: params.status,
      subject: params.subject,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
}

export async function updateAdminContentStatus(
  token: string,
  contentId: string,
  status: "approved" | "rejected",
): Promise<ContentItemResponse> {
  return apiRequest<ContentItemResponse>(`/admin/content-items/${contentId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export async function getAnalyticsReport(token: string): Promise<AnalyticsReportResponse> {
  return apiRequest<AnalyticsReportResponse>("/admin/reports/analytics", { token });
}

export async function getBillingReport(token: string): Promise<BillingReportResponse> {
  return apiRequest<BillingReportResponse>("/admin/reports/billing", { token });
}

export async function exportAdminReportCsv(
  token: string,
  section: "analytics" | "billing",
): Promise<{ filename: string; blob: Blob }> {
  const response = await fetchWithTokenRefresh(
    buildUrl("/admin/reports/export", { section, format: "csv" }),
    token,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
  const filename = filenameMatch?.[1] ?? `${section}-report.csv`;
  const blob = await response.blob();

  return { filename, blob };
}

export async function getTeacherHomeSummary(token: string): Promise<TeacherHomeSummaryResponse> {
  return apiRequest<TeacherHomeSummaryResponse>("/teacher/home-summary", { token });
}

export async function listTeacherPapers(token: string): Promise<TeacherPaperResponse[]> {
  return apiRequest<TeacherPaperResponse[]>("/teacher/papers", { token });
}

export async function createTeacherPaper(
  token: string,
  payload: TeacherPaperCreatePayload,
): Promise<TeacherPaperResponse> {
  return apiRequest<TeacherPaperResponse>("/teacher/papers", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateTeacherPaper(
  token: string,
  paperId: string,
  payload: TeacherPaperUpdatePayload,
): Promise<TeacherPaperResponse> {
  return apiRequest<TeacherPaperResponse>(`/teacher/papers/${paperId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function getTeacherPaper(
  token: string,
  paperId: string,
): Promise<TeacherPaperResponse> {
  return apiRequest<TeacherPaperResponse>(`/teacher/papers/${paperId}`, {
    token,
  });
}

export async function assignTeacherPaper(
  token: string,
  paperId: string,
  classIds: string[],
): Promise<TeacherPaperResponse> {
  return apiRequest<TeacherPaperResponse>(`/teacher/papers/${paperId}/assign`, {
    method: "POST",
    token,
    body: { class_ids: classIds },
  });
}

export async function listTeacherClasses(token: string): Promise<TeacherClassResponse[]> {
  return apiRequest<TeacherClassResponse[]>("/teacher/classes", { token });
}

export async function createTeacherClass(
  token: string,
  payload: TeacherClassCreatePayload,
): Promise<TeacherClassResponse> {
  return apiRequest<TeacherClassResponse>("/teacher/classes", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listTeacherClassStudents(
  token: string,
  classId: string,
): Promise<UserPublic[]> {
  return apiRequest<UserPublic[]>(`/teacher/classes/${classId}/students`, { token });
}

export async function listTeacherClassAssignableStudents(
  token: string,
  classId: string,
): Promise<TeacherClassStudentOption[]> {
  return apiRequest<TeacherClassStudentOption[]>(
    `/teacher/classes/${classId}/assignable-students`,
    { token },
  );
}

export async function updateTeacherClassStudents(
  token: string,
  classId: string,
  studentIds: string[],
): Promise<TeacherClassResponse> {
  return apiRequest<TeacherClassResponse>(`/teacher/classes/${classId}/students`, {
    method: "PUT",
    token,
    body: { student_ids: studentIds },
  });
}

export async function listTeacherLessonPlans(
  token: string,
  params: { year?: Year } = {},
): Promise<LessonPlanResponse[]> {
  return apiRequest<LessonPlanResponse[]>("/teacher/lesson-plans", {
    token,
    query: { year: params.year },
  });
}

export async function createTeacherLessonPlan(
  token: string,
  payload: LessonPlanCreatePayload,
): Promise<LessonPlanResponse> {
  return apiRequest<LessonPlanResponse>("/teacher/lesson-plans", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateTeacherLessonPlan(
  token: string,
  lessonId: string,
  payload: LessonPlanUpdatePayload,
): Promise<LessonPlanResponse> {
  return apiRequest<LessonPlanResponse>(`/teacher/lesson-plans/${lessonId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function deleteTeacherLessonPlan(
  token: string,
  lessonId: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/teacher/lesson-plans/${lessonId}`, {
    method: "DELETE",
    token,
  });
}

export async function getStudentAttempts(
  token: string,
  studentId: string
): Promise<TeacherStudentAttemptResponse[]> {
  return apiRequest<TeacherStudentAttemptResponse[]>(`/teacher/students/${studentId}/attempts`, {
    token
  });
}

export async function listTeacherLibraryItems(token: string): Promise<LibraryItemResponse[]> {
  return apiRequest<LibraryItemResponse[]>("/teacher/library-items", { token });
}

export async function createTeacherLibraryItem(
  token: string,
  payload: TeacherLibraryCreatePayload,
): Promise<LibraryItemResponse> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("subject", payload.subject);
  formData.append("type", payload.type);
  formData.append("chapters", String(payload.chapters));
  formData.append("year", payload.year);
  formData.append("publish_now", String(payload.publishNow ?? false));
  formData.append("file", payload.file);
  return apiRequest<LibraryItemResponse>("/teacher/library-items/upload", {
    method: "POST",
    token,
    body: formData,
  });
}

export async function getStudentHomeSummary(token: string): Promise<StudentHomeSummaryResponse> {
  return apiRequest<StudentHomeSummaryResponse>("/student/home-summary", { token });
}

export async function listStudentTests(
  token: string,
  params: { status?: "assigned" | "completed"; subject?: Subject } = {},
): Promise<StudentTestResponse[]> {
  return apiRequest<StudentTestResponse[]>("/student/tests", {
    token,
    query: {
      status: params.status,
      subject: params.subject,
    },
  });
}

export async function startStudentTest(
  token: string,
  testId: string,
): Promise<StartAttemptResponse> {
  return apiRequest<StartAttemptResponse>(`/student/tests/${testId}/start`, {
    method: "POST",
    token,
  });
}

export async function saveStudentAnswers(
  token: string,
  attemptId: string,
  answers: Record<string, number | null>,
  timeSpent?: Record<string, number>,
): Promise<SaveAnswersResponse> {
  return apiRequest<SaveAnswersResponse>(`/student/attempts/${attemptId}/answers`, {
    method: "POST",
    token,
    body: { answers, time_spent: timeSpent },
  });
}

export async function submitStudentAttempt(
  token: string,
  attemptId: string,
  payload: { violation_reason?: string; time_spent?: Record<string, number> } = {},
  options: { keepalive?: boolean } = {},
): Promise<SubmitAttemptResponse> {
  return apiRequest<SubmitAttemptResponse>(`/student/attempts/${attemptId}/submit`, {
    method: "POST",
    token,
    body: {
      ...(payload.violation_reason ? { violation_reason: payload.violation_reason } : {}),
      ...(payload.time_spent ? { time_spent: payload.time_spent } : {}),
    },
    keepalive: options.keepalive,
  });
}

export async function getStudentResult(
  token: string,
  attemptId: string,
): Promise<ResultResponse> {
  return apiRequest<ResultResponse>(`/student/results/${attemptId}`, { token });
}

export async function getStudentProgress(token: string): Promise<StudentProgressResponse> {
  return apiRequest<StudentProgressResponse>("/student/progress", { token });
}

export async function listStudentLibraryItems(
  token: string,
  params: { subject?: Subject } = {},
): Promise<StudentLibraryItemResponse[]> {
  return apiRequest<StudentLibraryItemResponse[]>("/student/library-items", {
    token,
    query: {
      subject: params.subject,
    },
  });
}

export async function listStudentLibraryDownloads(token: string): Promise<string[]> {
  return apiRequest<string[]>("/student/library-downloads", { token });
}

export async function downloadStudentLibraryItem(
  token: string,
  itemId: string,
): Promise<{ filename: string; blob: Blob }> {
  const response = await fetchWithTokenRefresh(
    buildUrl(`/student/library-items/${itemId}/download`),
    token,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
  const filename = filenameMatch?.[1] ?? `${itemId}.txt`;
  const blob = await response.blob();
  return { filename, blob };
}

export async function submitStudentFeedback(
  token: string,
  payload: { rating: number; feedback?: string },
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/student/feedback", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listNotifications(token: string): Promise<NotificationResponse[]> {
  return apiRequest<NotificationResponse[]>("/notifications", { token });
}

export async function markNotificationRead(
  token: string,
  notificationId: string,
  read = true,
): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
    body: { read },
  });
}

export async function markAllNotificationsRead(
  token: string,
): Promise<NotificationReadAllResponse> {
  return apiRequest<NotificationReadAllResponse>("/notifications/read-all", {
    method: "POST",
    token,
  });
}

export async function askAIChat(token: string, query: string): Promise<ChatAskResponse> {
  return apiRequest<ChatAskResponse>("/chat/ask", {
    method: "POST",
    token,
    body: { query },
  });
}

export async function askStudentDoubt(
  token: string,
  payload: StudentDoubtAskPayload,
): Promise<StudentDoubtResponse> {
  return apiRequest<StudentDoubtResponse>("/student/doubts/ask", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function listStudentDoubts(token: string, limit = 20): Promise<StudentDoubtResponse[]> {
  return apiRequest<StudentDoubtResponse[]>("/student/doubts", {
    token,
    query: { limit },
  });
}

export interface StudyPlanTask {
  id: string;
  title: string;
  topic: string;
  subtopics?: string[];
  completed_subtopics?: string[];
  subject: string;
  duration_minutes: number;
  due_date: string;
  status?: string;
  quiz_status?: "not_started" | "in_progress" | "passed";
  type?: "study" | "revision" | "mock_test";
  resource_links?: string[];
}

export interface StudyPlanResponse {
  id: string;
  student_id: string;
  availability_hours: number;
  target_exam_date: string;
  tasks: StudyPlanTask[];
  created_at: string;
  updated_at: string;
}

export interface QuizGenerateResponse {
  attempt_id: string;
  questions: {
    id: string;
    subject: string;
    text: string;
    options: string[];
  }[];
}

export interface QuizSubmitResponse {
  attempt_id: string;
  score: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
}

export async function setGlobalJeeDate(
  token: string,
  jee_date: string,
): Promise<{ message: string; count: number }> {
  return apiRequest<{ message: string; count: number }>("/admin/settings/jee-exam-date", {
    method: "POST",
    token,
    body: { jee_exam_date: jee_date },
  });
}

export async function getStudyPlan(token: string): Promise<StudyPlanResponse> {
  return apiRequest<StudyPlanResponse>("/student/planner/plan", { token });
}

export async function completeStudyPlanTask(token: string, taskId: string): Promise<void> {
  return apiRequest<void>(`/student/planner/tasks/${taskId}/complete`, {
    method: "POST",
    token,
  });
}

export async function generateTaskQuiz(token: string, taskId: string): Promise<QuizGenerateResponse> {
  return apiRequest<QuizGenerateResponse>(`/student/planner/tasks/${taskId}/quiz`, {
    method: "POST",
    token,
  });
}

export async function submitTaskQuiz(
  token: string,
  attemptId: string,
  answers: Record<string, number>,
): Promise<QuizSubmitResponse> {
  return apiRequest<QuizSubmitResponse>(`/student/planner/quiz/${attemptId}/submit`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export async function toggleStudyPlanSubtopic(
  token: string,
  taskId: string,
  subtopic: string,
): Promise<{ completed: boolean; all_subtopics_completed: boolean }> {
  return apiRequest<{ completed: boolean; all_subtopics_completed: boolean }>(
    `/student/planner/tasks/${taskId}/subtopics/toggle`,
    {
      method: "POST",
      token,
      query: { subtopic },
    },
  );
}

// ... existing imports

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  created_at: string;
}

export async function createChatSession(token: string, title?: string): Promise<ChatSession> {
  const response = await fetch(`${API_BASE_URL}/student/chat/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new ApiError("Failed to create chat session", response.status);
  return response.json();
}

export async function listChatSessions(token: string, limit = 20): Promise<ChatSession[]> {
  const response = await fetch(`${API_BASE_URL}/student/chat/sessions?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError("Failed to list chat sessions", response.status);
  return response.json();
}

export async function getChatSessionMessages(token: string, sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/student/chat/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError("Failed to get chat messages", response.status);
  return response.json();
}

export async function deleteChatSession(token: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/student/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError("Failed to delete chat session", response.status);
}

export async function streamChatRequest(
  token: string,
  endpoint: string,
  body: object,
  onChunk: (chunk: string) => void,
  sessionId?: string,
): Promise<void> {
  const url = sessionId
    ? `${API_BASE_URL}${endpoint}?session_id=${sessionId}`
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.detail || "Stream request failed", response.status);
  }

  if (!response.body) {
    throw new Error("ReadableStream not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

// ... existing code

async function refreshAccessTokenShared(refreshToken: string): Promise<TokenPairResponse> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshAccessToken(refreshToken).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function fetchWithTokenRefresh(
  url: string,
  token: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status !== 401 || !authLifecycleHandlers) {
    return response;
  }

  const refreshToken = authLifecycleHandlers.getRefreshToken();
  if (!refreshToken) {
    authLifecycleHandlers.onAuthFailure?.();
    return response;
  }

  try {
    const refreshed = await refreshAccessTokenShared(refreshToken);
    authLifecycleHandlers.onTokenRefresh(refreshed);
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshed.access_token}`);
    return fetch(url, {
      ...init,
      headers: retryHeaders,
    });
  } catch {
    authLifecycleHandlers.onAuthFailure?.();
    return response;
  }
}
