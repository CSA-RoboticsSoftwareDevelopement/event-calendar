import type { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma";

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
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

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
    console.log("Action:", action);

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
      console.log("Marking event as completed");
      
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "completed",
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

      console.log("Event marked as completed:", formattedEvent);
      return Response.json(formattedEvent);
    }

    // Regular update (edit form)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    // Determine status based on time
    let status = existingEvent.status; // Keep existing status by default
    
    // Only auto-update status if it's not already completed
    if (existingEvent.status !== "completed") {
      if (now < startDate) {
        status = "upcoming";
      } else if (now >= startDate && now <= endDate) {
        status = "ongoing";
      }
      // Note: We don't automatically set to "completed" when time passes
      // User must manually mark it as completed
    }

    console.log("Updating event with status:", status);

    // Update the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description: description || null,
        eventType: eventType || existingEvent.eventType,
        start: startDate,
        end: endDate,
        status: status,
      },
    });

    // Handle assignments if provided
    if (assignedTo !== undefined && Array.isArray(assignedTo)) {
      console.log("Processing assignments update...");
      console.log("assignedTo array:", assignedTo);
      
      // Delete ALL existing assignments first
      const deletedCount = await prisma.eventAssignment.deleteMany({
        where: { eventId },
      });
      
      console.log(`Deleted ${deletedCount.count} existing assignments`);

      // Only create new assignments if array is not empty
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

    // Format response
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

    console.log("Final formatted event:", formattedEvent);
    console.log("Event status:", formattedEvent.status);

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