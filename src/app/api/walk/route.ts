import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, duration, type } = body;

    if (!userId || !date) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const logDate = new Date(date);
    
    // Define start and end of this day to safely remove duplicates
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Remove existing logs for this day to ensure single entry/status per day
    await prisma.walkLog.deleteMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const log = await prisma.walkLog.create({
      data: {
        userId,
        date: logDate,
        duration: Number(duration),
        type: type || (Number(duration) >= 60 ? "SUPER" : Number(duration) >= 45 ? "STANDARD" : "SHORT"),
        earnings: 0, // Calculated dynamically in stats
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log walk" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const dateStr = searchParams.get("date"); // YYYY-MM-DD or ISO

        if (!userId || !dateStr) {
            return NextResponse.json({ error: "Missing userId or date" }, { status: 400 });
        }

        const logDate = new Date(dateStr);
        const startOfDay = new Date(logDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate);
        endOfDay.setHours(23, 59, 59, 999);

        await prisma.walkLog.deleteMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
