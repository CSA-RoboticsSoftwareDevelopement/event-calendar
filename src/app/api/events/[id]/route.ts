import type { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma"; // ✅ correct path

// ✅ DELETE — unchanged
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
    // Delete assignments first (foreign key constraint safe)
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

    // Delete the event itself
    await prisma.event.delete({
      where: { id: eventId },
    });

    return Response.json({ message: "Event deleted successfully" });
  } catch (err: unknown) {
    console.error("Delete error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to delete event" },
      { status: 500 }
    );
  }
}

// ✅ PUT — handles both event update and markCompleted
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

    // ✅ 1. Handle markCompleted request
    if (body.action === "markCompleted") {
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "completed",      // make sure this column exists
  
        },
      });

      return Response.json({
        message: "Event marked as completed",
        event: updatedEvent,
      });
    }

    // ✅ 2. Handle normal update
    const { title, description, start, end, assignedTo } = body;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description,
        start: new Date(start),
        end: new Date(end),
      },
    });

    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      const validIds = assignedTo
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      await prisma.eventAssignment.createMany({
        data: validIds.map((userId) => ({ eventId, userId })),
        skipDuplicates: true,
      });
    }

    return Response.json(updatedEvent);
  } catch (err: unknown) {
    console.error("Update error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update event" },
      { status: 500 }
    );
  }
}
// End of src/app/api/events/[id]/route.ts