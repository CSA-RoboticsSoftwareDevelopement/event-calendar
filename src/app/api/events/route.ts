// Corrected Next.js API route to include event descriptions
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
      description: event.description, // ✅ FIX: Include the description
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
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// API to handle POST requests to create a new event
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Create a new event in the database, including the description
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description, // Correctly save the description
        // These are now coming from the frontend in UTC ISO format
        start: new Date(body.start),
        end: new Date(body.end),
        assignments: {
          create: body.userIds.map((id: number) => ({
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
      description: event.description, // ✅ FIX: Include the description in the response
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
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// API to handle DELETE requests for an event
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = parseInt(url.pathname.split('/').pop() || '', 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // First, delete related assignments
    await prisma.assignment.deleteMany({
      where: { eventId },
    });

    // Then, delete the event
    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
