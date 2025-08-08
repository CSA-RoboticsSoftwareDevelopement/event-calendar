// app/api/events/[id]/route.ts
import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';
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
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const eventId = parseInt(params.id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await req.json();
  const { title, start, end, assignedTo } = body;

  try {
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
      },
    });

    // Remove old assignments
    await prisma.eventAssignment.deleteMany({
      where: { eventId },
    });

    // Add new assignments
    if (Array.isArray(assignedTo)) {
      const createAssignments = assignedTo.map((userId: string) =>
        prisma.eventAssignment.create({
          data: {
            eventId,
            userId: parseInt(userId, 10), // ✅ Fix here
          },
        })
      );
      await Promise.all(createAssignments);
    }

    return NextResponse.json(updatedEvent);
  } catch (err) {
    console.error('Update error:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  if (method === 'DELETE') {
    try {
      await prisma.eventAssignment.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
