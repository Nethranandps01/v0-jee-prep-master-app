import { useQuery } from "@tanstack/react-query";
import {
  type StudentDashboardResponse,
  getStudentDashboard,
} from "@/lib/api-client";

export function useStudentDashboard(token: string | null) {
  return useQuery<StudentDashboardResponse, Error>({
    queryKey: ["studentDashboard"],
    queryFn: () => getStudentDashboard(token!),
    enabled: !!token,
  });
}

