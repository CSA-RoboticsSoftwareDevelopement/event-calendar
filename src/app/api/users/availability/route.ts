import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get('start') || '');
  const end = new Date(searchParams.get('end') || '');

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    include: {
      assignments: {
        include: {
          event: true,
        },
      },
    },
  });

  const availability = users.map(user => {
    const futureEvents = user.assignments
      .map(a => a.event)
      .filter(event => event.start < end && event.end > start);

    const isBusy = futureEvents.length > 0;

    const nextAvailable = futureEvents.length > 0
      ? futureEvents.reduce((latest, curr) =>
          new Date(curr.end) > latest ? new Date(curr.end) : latest,
          new Date(0)
        )
      : new Date();

    return {
      id: user.id,
      name: user.name,
      isBusy,
      nextAvailable,
    };
  });

  return NextResponse.json(availability);
}
