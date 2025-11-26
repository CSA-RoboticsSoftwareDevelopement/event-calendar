import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import moment from "moment-timezone";

// Convert DB UTC → Brisbane ISO format
const toBrisbane = (date: Date) =>
  moment.utc(date).tz("Australia/Brisbane").format(); // returns ISO string WITH Brisbane offset

// =============================
//  GET → Return all events
// =============================
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        assignments: {
          include: { user: true },
        },
      },
      orderBy: { start: "asc" },
    });

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      eventType: event.eventType || "regular",

      // ❗ ALWAYS return Brisbane time to frontend
      start: toBrisbane(event.start),
      end: toBrisbane(event.end),

      status: event.status || "upcoming",

      assignedTo: event.assignments.map((a) => ({
        userId: a.userId,
        user: {
          name: a.user.name,
          email: a.user.email,
          designation: a.user.designation,
        },
      })),
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// =============================
//  POST → Create new event
// =============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, start, end, eventType, userIds } = body;

    if (!title || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields: title, start, or end" },
        { status: 400 }
      );
    }

    // ❗ FRONTEND already sends UTC → store directly
    const startDateUTC = moment.utc(start).toDate();
    const endDateUTC = moment.utc(end).toDate();

    const nowUTC = new Date();
    let status = "upcoming";
    if (nowUTC >= startDateUTC && nowUTC <= endDateUTC) status = "ongoing";
    else if (nowUTC > endDateUTC) status = "upcoming";

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        eventType: eventType || "regular",
        start: startDateUTC,
        end: endDateUTC,
        status,
        assignments: {
          create: (userIds || []).map((id: number) => ({
            user: { connect: { id } },
          })),
        },
      },
      include: { assignments: { include: { user: true } } },
    });

    return NextResponse.json(
      {
        id: event.id,
        title: event.title,
        description: event.description ?? "",
        eventType: event.eventType,
        status: event.status,

        // Return Brisbane time
        start: toBrisbane(event.start),
        end: toBrisbane(event.end),

        assignedTo: event.assignments.map((a) => ({
          userId: a.userId,
          user: {
            name: a.user.name,
            email: a.user.email,
            designation: a.user.designation,
          },
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// =============================
//  DELETE → Delete event
// =============================
export async function DELETE(req: Request) {
  try {
    const id = parseInt(req.url.split("/").pop() || "", 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    await prisma.eventAssignment.deleteMany({ where: { eventId: id } });
    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

// =============================
//  PUT → Update event
// =============================
export async function PUT(req: Request) {
  try {
    const id = parseInt(req.url.split("/").pop() || "", 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const body = await req.json();
    const { title, description, start, end, assignedTo, action, eventType } = body;

    const existing = await prisma.event.findUnique({
      where: { id },
      include: { assignments: { include: { user: true } } },
    });
    if (!existing)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Handle mark completed
    if (action === "markCompleted") {
      const updated = await prisma.event.update({
        where: { id },
        data: { status: "completed" },
        include: { assignments: { include: { user: true } } },
      });

      return NextResponse.json({
        ...updated,

        start: toBrisbane(updated.start),
        end: toBrisbane(updated.end),

        assignedTo: updated.assignments.map((a) => ({
          userId: a.userId,
          user: {
            name: a.user.name,
            email: a.user.email,
            designation: a.user.designation,
          },
        })),
      });
    }

    // Convert incoming UTC to Date()
    const startDateUTC = moment.utc(start).toDate();
    const endDateUTC = moment.utc(end).toDate();

    const nowUTC = new Date();
    let status = existing.status;
    if (existing.status !== "completed") {
      if (nowUTC >= startDateUTC && nowUTC <= endDateUTC) status = "ongoing";
      else if (nowUTC < startDateUTC) status = "upcoming";
    }

    await prisma.event.update({
      where: { id },
      data: {
        title,
        description: description || null,
        eventType: eventType || existing.eventType,
        start: startDateUTC,
        end: endDateUTC,
        status,
      },
    });

    // Update assignments
    if (Array.isArray(assignedTo)) {
      await prisma.eventAssignment.deleteMany({ where: { eventId: id } });

      if (assignedTo.length > 0) {
        await prisma.eventAssignment.createMany({
          data: assignedTo.map((uid: number) => ({
            eventId: id,
            userId: uid,
          })),
        });
      }
    }

    const finalEvent = await prisma.event.findUnique({
      where: { id },
      include: { assignments: { include: { user: true } } },
    });

    if (!finalEvent)
      return NextResponse.json({ error: "Event not found after update" }, { status: 404 });

    return NextResponse.json({
      id: finalEvent.id,
      title: finalEvent.title,
      description: finalEvent.description ?? "",
      eventType: finalEvent.eventType,
      status: finalEvent.status,

      start: toBrisbane(finalEvent.start),
      end: toBrisbane(finalEvent.end),

      assignedTo: finalEvent.assignments.map((a) => ({
        userId: a.userId,
        user: {
          name: a.user.name,
          email: a.user.email,
          designation: a.user.designation,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: "Failed to update event", details: (error as Error).message },
      { status: 500 }
    );
  }
}
