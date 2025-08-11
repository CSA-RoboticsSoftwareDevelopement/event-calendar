import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const eventId = parseInt(params.id, 10);
  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.eventAssignment.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const eventId = parseInt(params.id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const body = await req.json();
    const { title, start, end, assignedTo } = body;

    console.log("Received PUT body:", body);

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
      },
    });

    // Clear old assignments
    //await prisma.eventAssignment.deleteMany({ where: { eventId } });

    // Add new assignments
    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      const createAssignments = assignedTo.map((userId: string) =>
        prisma.eventAssignment.create({
          data: {
            eventId,
            userId: parseInt(userId, 10),
          },
        })
      );
      await Promise.all(createAssignments);
    }

    return NextResponse.json(updatedEvent);
  } catch (err: any) {
    console.error('Update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update event' }, { status: 500 });
  }
}
