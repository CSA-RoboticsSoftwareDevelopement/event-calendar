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
      description: event.description ?? "", // ensure description is always a string
      eventType: (event as any).eventType || "regular", // Include event type with fallback
      start: event.start.toISOString(), // Convert to ISO UTC string
      end: event.end.toISOString(), // Convert to ISO UTC string
      assignedTo: event.assignments.map((a) => ({
        userId: a.userId,
        user: {
          name: a.user.name,
          email: a.user.email, // optional
          designation: a.user.designation, // Include user designation
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
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.start || !body.end) {
      return NextResponse.json(
        { error: "Missing required fields: title, start, or end" },
        { status: 400 }
      );
    }

    // Create a new event in the database, including the description and event type
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description || null, // Correctly save the description
        eventType: body.eventType || "regular", // Save event type (default to 'regular')
        // These are now coming from the frontend in UTC ISO format
        start: new Date(body.start),
        end: new Date(body.end),
        assignments: {
          create: (body.userIds || []).map((id: number) => ({
            user: { connect: { id } },
          })),
        },
      },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    // Format the newly created event data for the frontend response
    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description ?? "", // Include the description in the response
      eventType: event.eventType, // ✅ CRITICAL: Include event type in response
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
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { error: "Failed to create event", details: error instanceof Error ? error.message : "Unknown error" },
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