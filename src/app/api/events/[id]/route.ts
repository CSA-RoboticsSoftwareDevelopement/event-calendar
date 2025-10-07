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
  const { id } = await context.params; // ✅ await because it's a Promise
  const eventId = parseInt(id, 10);

  if (isNaN(eventId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, description, start, end, assignedTo } = body;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description, // <-- add this line
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
        skipDuplicates: true, // ← avoids unique constraint errors
      });
    }

    return Response.json(updatedEvent);
  } catch (err: unknown) {
    console.error("Update error:", err);

    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return Response.json({ error: "Failed to update event" }, { status: 500 });
  }
}
//src\app\api\events\[id]\route.ts