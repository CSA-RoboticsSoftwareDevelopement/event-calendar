// app/api/events/[id]/route.ts
import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const eventId = parseInt(params.id, 10);

  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
