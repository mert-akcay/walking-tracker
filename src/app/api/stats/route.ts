import { prisma } from "@/lib/prisma";
import { calculateStatsForRange } from "@/lib/walking-logic";
import { NextResponse } from "next/server";
import { WalkLog } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const monthParam = searchParams.get("month"); // 0-11
  const yearParam = searchParams.get("year");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const now = new Date();
  const year = yearParam ? parseInt(yearParam) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam) : now.getMonth();

  // Start of the month
  const startDate = new Date(year, month, 1);
  // End of the month
  const endDate = new Date(year, month + 1, 0);

  // We need to fetch logs for the entire range including full weeks
  // CalculateStatsForRange handles week alignment, but we should fetch enough data.
  // It starts from the Monday of the week containing startDate.
  const startDay = startDate.getDay();
  const diff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
  const fetchStart = new Date(startDate);
  fetchStart.setDate(diff);
  fetchStart.setHours(0, 0, 0, 0);

  // And ends at the Sunday of the week containing endDate
  const endDay = endDate.getDay(); // 0-6
  // If Sunday (0), add 0. If Monday (1), add 6.
  const endDiff = (endDay === 0 ? 0 : 7 - endDay); 
  const fetchEnd = new Date(endDate);
  fetchEnd.setDate(endDate.getDate() + endDiff);
  fetchEnd.setHours(23, 59, 59, 999);

  const logs = await prisma.walkLog.findMany({
    where: {
      userId,
      date: {
        gte: fetchStart,
        lte: fetchEnd,
      },
    },
  });

  // Helper to get date string YYYY-MM-DD in local time
  const toDateString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split("T")[0];
  };

  // Aggregate logs by day (sum durations if multiple logs per day)
  const aggregatedLogs = new Map<string, WalkLog>();
  logs.forEach(log => {
    const dateStr = toDateString(log.date);
    if (!aggregatedLogs.has(dateStr)) {
      aggregatedLogs.set(dateStr, { ...log, duration: 0 });
    }
    const current = aggregatedLogs.get(dateStr)!;
    current.duration += log.duration;
  });

  const uniqueLogs = Array.from(aggregatedLogs.values());

  const stats = calculateStatsForRange(uniqueLogs, startDate, endDate);

  return NextResponse.json(stats);
}
