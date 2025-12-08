import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, duration } = body;

    if (!userId || !date || duration === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Create log
    // We don't calculate earnings here yet, we do it on read for the week
    // But we can store the "raw" earnings if we wanted.
    // For now, just store the log.
    
    // Check if log already exists for this day?
    // User might walk multiple times?
    // "her 45 dk yürüyüş yaptığı gün için".
    // Usually implies 1 per day counts.
    // If I walk 30 min + 20 min = 50 min?
    // I'll assume total duration per day matters.
    // So I should probably upsert or sum?
    // Let's assume user logs "a walk".
    // I'll store individual logs. The logic will sum them up by day.
    
    const log = await prisma.walkLog.create({
      data: {
        userId,
        date: new Date(date),
        duration: Number(duration),
        type: Number(duration) >= 60 ? "SUPER" : Number(duration) >= 45 ? "STANDARD" : "SHORT",
        earnings: 0, // Calculated dynamically
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log walk" }, { status: 500 });
  }
}
