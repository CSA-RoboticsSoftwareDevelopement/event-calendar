import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Incoming start/end are UTC ISO strings → safe to parse
  const start = new Date(searchParams.get("start")!);
  const end = new Date(searchParams.get("end")!);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "Invalid start or end time" },
      { status: 400 }
    );
  }

  const users = await prisma.user.findMany({
    include: {
      assignments: {
        include: {
          event: true,
        },
      },
    },
  });

  const availability = users.map((user) => {
    const events = user.assignments.map((a) => a.event);

    // Find events overlapping with start–end
    const overlappingEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        return eventStart < end && eventEnd > start;
      })
      .sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      );

    const isBusy = overlappingEvents.length > 0;

    // Next available time — latest end of busy events
    const nextAvailable = isBusy
      ? overlappingEvents.reduce((latest, curr) => {
          const currEnd = new Date(curr.end);
          return currEnd > latest ? currEnd : latest;
        }, new Date(0))
      : start; // free immediately

    return {
      id: user.id,
      name: user.name,
      isBusy,
      nextAvailable: nextAvailable.toISOString(), // return UTC
    };
  });

  return NextResponse.json(availability);
}
