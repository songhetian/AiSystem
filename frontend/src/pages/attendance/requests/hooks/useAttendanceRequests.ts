import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";

export type RequestType = 'leave' | 'overtime' | 'patch-card' | 'schedule-change';

export const useAttendanceRequests = (type: RequestType) => {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<number | undefined>();

  const getApiMethod = () => {
    switch (type) {
      case 'leave': return attendanceApi.listLeaves;
      case 'overtime': return attendanceApi.listOvertimes;
      case 'patch-card': return attendanceApi.listPatchCards;
      case 'schedule-change': return attendanceApi.listScheduleChanges;
      default: return attendanceApi.listLeaves;
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`attendance-requests-${type}`, keyword, status],
    queryFn: () => getApiMethod()({ keyword, approval_status: status }),
  });

  return {
    data,
    isLoading,
    refetch,
    keyword,
    setKeyword,
    status,
    setStatus,
  };
};
