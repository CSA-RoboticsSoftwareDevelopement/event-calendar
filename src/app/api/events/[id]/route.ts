import type { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma"; // Ensure prisma client is imported



export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const eventId = parseInt(id, 10);

  if (isNaN(eventId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // First delete assignments (if you have FK constraints)
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

    // Then delete the event itself
    await prisma.event.delete({
      where: { id: eventId },
    });

    return Response.json({ message: "Event deleted successfully" });
  } catch (err: unknown) {
    console.error("Delete error:", err);

    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return Response.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const eventId = parseInt(id, 10);

  if (isNaN(eventId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, description, eventType, start, end, assignedTo, action } = body;

    console.log("=== PUT [id] route ===");
    console.log("Event ID:", eventId);
    console.log("Body received:", body);
    console.log("assignedTo:", assignedTo);

    // Check if event exists
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
      return Response.json({ error: "Event not found" }, { status: 404 });
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

      const formattedEvent = {
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
      };

      return Response.json(formattedEvent);
    }

    // Update the event with eventType
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

    // CRITICAL: Always handle assignments when assignedTo is provided (even if empty array)
    if (assignedTo !== undefined && Array.isArray(assignedTo)) {
      console.log("Processing assignments update...");
      console.log("assignedTo array:", assignedTo);
      
      // STEP 1: Delete ALL existing assignments first
      const deletedCount = await prisma.eventAssignment.deleteMany({
        where: { eventId },
      });
      
      console.log(`Deleted ${deletedCount.count} existing assignments`);

      // STEP 2: Only create new assignments if array is not empty
      if (assignedTo.length > 0) {
        const validIds = assignedTo
          .map((id) => parseInt(String(id), 10))
          .filter((id) => !isNaN(id));

        console.log("Valid IDs to assign:", validIds);

        if (validIds.length > 0) {
          // Verify users exist
          const validUsers = await prisma.user.findMany({
            where: { id: { in: validIds } },
            select: { id: true },
          });

          console.log("Valid users found:", validUsers.map(u => u.id));

          if (validUsers.length > 0) {
            const created = await prisma.eventAssignment.createMany({
              data: validUsers.map((user) => ({ eventId, userId: user.id })),
            });
            console.log(`Created ${created.count} new assignments`);
          }
        }
      } else {
        console.log("No users to assign (empty array) - all assignments removed");
      }
    }

    // Fetch the final updated event with all assignments
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
      return Response.json({ error: "Event not found after update" }, { status: 404 });
    }

    // Format response to match frontend expectations
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

    console.log("Final formatted event:", formattedEvent);
    console.log("Number of assignments:", formattedEvent.assignedTo.length);

    return Response.json(formattedEvent);
  } catch (err: unknown) {
    console.error("Update error:", err);

    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return Response.json({ error: "Failed to update event" }, { status: 500 });
  }
}
//src\app\api\events\[id]\route.ts