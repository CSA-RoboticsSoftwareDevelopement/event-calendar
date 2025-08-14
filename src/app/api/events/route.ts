import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';
import { parse } from 'date-fns'; // <-- add here
import { format } from 'date-fns';

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
      user: { name: a.user.name },
    })),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: Request) {
  const body = await req.json();

  // Parse the date & time exactly as entered: dd-MM-yyyy HH:mm
  const startDate = parse(body.start, 'dd-MM-yyyy HH:mm', new Date());
  const endDate = parse(body.end, 'dd-MM-yyyy HH:mm', new Date());

  const event = await prisma.event.create({
    data: {
      title: body.title,
      start: startDate, // correct format to store in DB
      end: endDate,
      assignments: {
        create: body.userIds.map((id: number) => ({
          user: { connect: { id } },
        })),
      },
    },
    include: {
      assignments: { include: { user: true } },
    },
  });

  const formatted = {
    id: event.id,
    title: event.title,
    start: event.start, // full Date from DB
    end: event.end,     // full Date from DB
    assignedTo: event.assignments.map(a => ({
      userId: a.userId,
      user: { name: a.user.name },
    })),
  };


  return NextResponse.json(formatted);
}
