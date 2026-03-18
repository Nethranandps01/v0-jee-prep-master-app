import { useQuery } from "@tanstack/react-query";
import { getStudyPlan, type StudyPlanResponse } from "@/lib/api-client";

export function useStudentStudyPlan(token: string | null) {
  return useQuery<StudyPlanResponse, Error>({
    queryKey: ["studentStudyPlan"],
    queryFn: () => getStudyPlan(token!),
    enabled: !!token,
  });
}

