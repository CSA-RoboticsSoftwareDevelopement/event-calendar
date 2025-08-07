import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const events = await prisma.event.findMany({
    include: {
      assignments: {
        include: {
          user: true,
        },
      },
    },
  });

  const formatted = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    assignedTo: event.assignments.map(a => ({
      userId: a.userId,
      user: {
        name: a.user.name,
      },
    })),
  }));

  return NextResponse.json(formatted);
}


export async function POST(req: Request) {
  const body = await req.json();

  const event = await prisma.event.create({
    data: {
      title: body.title,
      start: new Date(body.start),
      end: new Date(body.end),
      assignments: {
        create: body.userIds.map((id: number) => ({
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

  // Format like in GET response
  const formatted = {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    assignedTo: event.assignments.map(a => ({
      userId: a.userId,
      user: { name: a.user.name },
    })),
  };

  return NextResponse.json(formatted);
}

