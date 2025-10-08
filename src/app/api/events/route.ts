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
      eventType: (event as unknown as { eventType: string }).eventType || "regular", // Include event type with fallback
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

// Update an event
// Update an event safely
// Update an event - Fixed version
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = parseInt(url.pathname.split("/").pop() || "", 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, start, end, assignedTo, action, eventType } = body;

    console.log("PUT request received:", { eventId, body }); // Debug log

    // Check if event exists first
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Handle "markCompleted" action
    if (action === "markCompleted") {
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          title: existingEvent.title.includes("(Event Completed)")
            ? existingEvent.title
            : `${existingEvent.title} (Event Completed)`,
        },
        include: {
          assignments: {
            include: {
              user: true,
            },
          },
        },
      });

      return NextResponse.json({
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description ?? "",
        eventType: updatedEvent.eventType,
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
      });
    }

    // Update event details
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description: description || null,
        eventType: eventType || existingEvent.eventType,
        start: new Date(start),
        end: new Date(end),
      },
    });

    // Always update assignments (even if empty array to remove all users)
    if (assignedTo !== undefined && Array.isArray(assignedTo)) {
      console.log("Updating assignments:", assignedTo); // Debug log
      
      // Remove all current assignments
      await prisma.eventAssignment.deleteMany({ 
        where: { eventId } 
      });

      // Only add new assignments if there are users to assign
      if (assignedTo.length > 0) {
        // Filter out any null/undefined values and convert to numbers
        const userIds = assignedTo
          .filter(id => id !== null && id !== undefined)
          .map(id => Number(id));

        console.log("User IDs to assign:", userIds); // Debug log

        if (userIds.length > 0) {
          // Verify users exist
          const validUsers = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true },
          });

          console.log("Valid users found:", validUsers); // Debug log

          if (validUsers.length > 0) {
            await prisma.eventAssignment.createMany({
              data: validUsers.map(u => ({ eventId, userId: u.id })),
            });
          }
        }
      }
    }

    // Fetch the updated event with all related data
    const finalEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!finalEvent) {
      return NextResponse.json({ error: "Event not found after update" }, { status: 404 });
    }

    // Format response
    const formattedEvent = {
      id: finalEvent.id,
      title: finalEvent.title,
      description: finalEvent.description ?? "",
      eventType: finalEvent.eventType,
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

    console.log("Returning formatted event:", formattedEvent); // Debug log

    return NextResponse.json(formattedEvent);
  } catch (err: any) {
    console.error("Failed to update event:", err);
    return NextResponse.json(
      {
        error: "Failed to update event",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}


// End of src/app/api/events/route.ts