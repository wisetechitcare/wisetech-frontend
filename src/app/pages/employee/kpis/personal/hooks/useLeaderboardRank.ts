import { fetchKpiLeaderboardOverall, KpiLeaderboardEntry } from "@services/employee";
import { useEffect, useState } from "react";

type UseLeaderboardRankParams = {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
};

export const useLeaderboardRank = ({
  employeeId,
  startDate,
  endDate,
}: UseLeaderboardRankParams) => {
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRank = async () => {
      if (!employeeId || !startDate || !endDate) {
        setRank(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const leaderboard = await fetchKpiLeaderboardOverall(startDate, endDate);
        if (!isMounted) return;

        const currentEmployee = leaderboard.find(
          (entry: KpiLeaderboardEntry) => entry.employeeId === employeeId
        );
        setRank(currentEmployee?.rank ?? null);
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching leaderboard rank:", error);
          setRank(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRank();

    return () => {
      isMounted = false;
    };
  }, [employeeId, startDate, endDate]);

  return { rank, rankLoading: loading };
};
