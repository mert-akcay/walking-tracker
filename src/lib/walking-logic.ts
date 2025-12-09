import { WalkLog } from "@prisma/client";

export type DayStat = {
  date: string;
  walked: boolean;
  duration: number;
  earnings: number;
  type: "STANDARD" | "SUPER" | "OFF" | "PENALTY" | "NONE";
};

export type WeeklyStats = {
  totalEarnings: number;
  offDaysUsed: number;
  superWalkUsed: boolean;
  days: DayStat[];
};

export type MonthlyStats = {
  totalEarnings: number;
  weeks: WeeklyStats[];
};

// Helper to get date string YYYY-MM-DD in local time
const toDateString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split("T")[0];
};

export function calculateStatsForRange(logs: WalkLog[], startDate: Date, endDate: Date): MonthlyStats {
  const monthlyStats: MonthlyStats = {
    totalEarnings: 0,
    weeks: [],
  };

  // Map logs by date
  const logsByDate = new Map<string, WalkLog>();
  logs.forEach((log) => {
    logsByDate.set(toDateString(new Date(log.date)), log);
  });

  // We need to iterate week by week.
  // Find the Monday of the week containing startDate
  const startDay = startDate.getDay();
  const diff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
  const currentWeekStart = new Date(startDate);
  currentWeekStart.setDate(diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  // Iterate weeks until we pass endDate
  const endLimit = new Date(endDate);
  endLimit.setHours(23, 59, 59, 999);

  let loopDate = new Date(currentWeekStart);

  while (loopDate <= endLimit) {
    const weekStats: WeeklyStats = {
      totalEarnings: 0,
      offDaysUsed: 0,
      superWalkUsed: false,
      days: [],
    };

    // Process 7 days of this week
    for (let i = 0; i < 7; i++) {
      const current = new Date(loopDate);
      current.setDate(current.getDate() + i);
      const dateStr = toDateString(current);
      const log = logsByDate.get(dateStr);

      const dayStat: DayStat = {
        date: dateStr,
        walked: false,
        duration: 0,
        earnings: 0,
        type: "NONE",
      };

      if (log) {
        dayStat.walked = true;
        dayStat.duration = log.duration;

        if (log.type === "OFF") {
            // Explicit OFF logged by user
            dayStat.type = "OFF";
            weekStats.offDaysUsed++;
            dayStat.earnings = 0;
        } else if (log.duration >= 60 && !weekStats.superWalkUsed) {
          dayStat.earnings = 150;
          dayStat.type = "SUPER";
          weekStats.superWalkUsed = true;
        } else if (log.duration >= 45) {
          dayStat.earnings = 100;
          dayStat.type = "STANDARD";
        } else {
          // Short walk or explicit small walk
          dayStat.walked = false; 
        }
      }

      if (!dayStat.walked && dayStat.type === "NONE") { // Only if not set by log above
        // Check if future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(dayStat.date);
        
        if (checkDate > today) {
          dayStat.type = "NONE";
          dayStat.earnings = 0;
        } else {
          // Default behavior for past days with no log: PENALTY.
          // User must explicitly choose OFF.
          dayStat.type = "PENALTY";
          dayStat.earnings = -200;
        }
      }

      weekStats.totalEarnings += dayStat.earnings;
      weekStats.days.push(dayStat);
    }

    monthlyStats.weeks.push(weekStats);
    monthlyStats.totalEarnings += weekStats.totalEarnings;

    // Move to next week
    loopDate.setDate(loopDate.getDate() + 7);
  }

  return monthlyStats;
}
