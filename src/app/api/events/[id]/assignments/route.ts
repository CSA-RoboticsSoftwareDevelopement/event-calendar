// app/api/events/[id]/assignments/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE assignment called with params:', params);
    const eventId = parseInt(params.id);
    const { userId } = await req.json();
    console.log('Received userId:', userId);

    if (isNaN(eventId) || !userId) {
      console.log('Invalid parameters - eventId:', eventId, 'userId:', userId);
      return NextResponse.json(
        { error: 'Invalid event ID or user ID' },
        { status: 400 }
      );
    }

    const result = await prisma.eventAssignment.deleteMany({
      where: {
        eventId,
        userId: Number(userId),
      },
    });
    console.log('Deletion result:', result);

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Error removing assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}