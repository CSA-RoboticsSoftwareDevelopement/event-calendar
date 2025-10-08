// app/api/events/route.ts
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

// API to handle GET requests for all events
export async function GET() {
  try {
    // Fetch all events from the database, including the associated user assignments
    const events = await prisma.event.findMany({
      include: {
        assignments: {
          include: {
            user: true, // Include user details for each assignment
          },
        },
      },
    });

    // Format the events data for the frontend
const formattedEvents = events.map((event) => ({
  id: event.id,
  title: event.title,
  description: event.description ?? "",
  eventType: (event as unknown as { eventType: string }).eventType || "regular",
  start: event.start.toISOString(),
  end: event.end.toISOString(),
  status: (event as any).status || "upcoming", // ✅ Include status here
  assignedTo: event.assignments.map((a) => ({
    userId: a.userId,
    user: {
      name: a.user.name,
      email: a.user.email,
      designation: a.user.designation,
    },
  })),
}));


    // Return the formatted events as a JSON response
    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// API to handle POST requests to create a new event
// =============================
//  POST  → Create new event
// =============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.start || !body.end) {
      return NextResponse.json(
        { error: "Missing required fields: title, start, or end" },
        { status: 400 }
      );
    }

    // Determine initial status based on current time
    const now = new Date();
    const startDate = new Date(body.start);
    const endDate = new Date(body.end);
    const today8am = new Date();
    today8am.setHours(8, 0, 0, 0);

    let status = "upcoming";
    if (now >= startDate && now <= endDate) status = "ongoing";
    else if (now < today8am) status = "upcoming";

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description || null,
        eventType: body.eventType || "regular",
        start: startDate,
        end: endDate,
        status,
        assignments: {
          create: (body.userIds || []).map((id: number) => ({
            user: { connect: { id } },
          })),
        },
      },
      include: {
        assignments: { include: { user: true } },
      },
    });

    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      eventType: event.eventType,
      status: event.status,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      assignedTo: event.assignments.map((a) => ({
        userId: a.userId,
        user: {
          name: a.user.name,
          email: a.user.email,
          designation: a.user.designation,
        },
      })),
    };

    return NextResponse.json(formattedEvent, { status: 201 });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


// API to handle DELETE requests for an event
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = parseInt(url.pathname.split("/").pop() || "", 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // First, delete related assignments
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

    // Then, delete the event
    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json(
      { message: "Event deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

// Update an event
// Update an event safely
// Update an event - Fixed version
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = parseInt(url.pathname.split("/").pop() || "", 10);
    if (isNaN(eventId))
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const body = await req.json();
    const { title, description, start, end, assignedTo, action, eventType } = body;

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { assignments: { include: { user: true } } },
    });
    if (!existingEvent)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Handle "Mark Completed"
    if (action === "markCompleted") {
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { status: "completed" },
        include: { assignments: { include: { user: true } } },
      });

      const formattedCompleted = {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description ?? "",
        eventType: updatedEvent.eventType,
        status: updatedEvent.status,
        start: updatedEvent.start.toISOString(),
        end: updatedEvent.end.toISOString(),
        assignedTo: updatedEvent.assignments.map((a) => ({
          userId: a.userId,
          user: {
            name: a.user.name,
            email: a.user.email,
            designation: a.user.designation,
          },
        })),
      };
      return NextResponse.json(formattedCompleted);
    }

    // Determine current status automatically
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today8am = new Date();
    today8am.setHours(8, 0, 0, 0);

    let status = existingEvent.status;
    if (existingEvent.status !== "completed") {
      if (now < today8am) status = "upcoming";
      else if (now >= startDate && now <= endDate) status = "ongoing";
      else if (now > endDate) status = "upcoming"; // keep "upcoming" if finished but not marked
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description: description || null,
        eventType: eventType || existingEvent.eventType,
        start: startDate,
        end: endDate,
        status,
      },
    });

    // --- Update assignments (no changes to your logic here) ---
    if (assignedTo !== undefined && Array.isArray(assignedTo)) {
      await prisma.eventAssignment.deleteMany({ where: { eventId } });

      if (assignedTo.length > 0) {
        const userIds = assignedTo
          .filter((id) => id !== null && id !== undefined)
          .map((id) => Number(id));

        if (userIds.length > 0) {
          const validUsers = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true },
          });

          if (validUsers.length > 0) {
            await prisma.eventAssignment.createMany({
              data: validUsers.map((u) => ({ eventId, userId: u.id })),
            });
          }
        }
      }
    }

    const finalEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { assignments: { include: { user: true } } },
    });

    if (!finalEvent)
      return NextResponse.json({ error: "Event not found after update" }, { status: 404 });

    const formattedEvent = {
      id: finalEvent.id,
      title: finalEvent.title,
      description: finalEvent.description ?? "",
      eventType: finalEvent.eventType,
      status: finalEvent.status,
      start: finalEvent.start.toISOString(),
      end: finalEvent.end.toISOString(),
      assignedTo: finalEvent.assignments.map((a) => ({
        userId: a.userId,
        user: {
          name: a.user.name,
          email: a.user.email,
          designation: a.user.designation,
        },
      })),
    };

    return NextResponse.json(formattedEvent);
  } catch (err: any) {
    console.error("Failed to update event:", err);
    return NextResponse.json(
      { error: "Failed to update event", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}


// End of src/app/api/events/route.ts