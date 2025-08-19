import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

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

  // Always send ISO UTC strings to frontend
  // const formatted = events.map(event => ({
  //   id: event.id,
  //   title: event.title,
  //   start: event.start.toISOString(), // ensure UTC format
  //   end: event.end.toISOString(),     // ensure UTC format
  //   assignedTo: event.assignments.map(a => ({
  //     userId: a.userId,
  //     user: {
  //       name: a.user.name,
  //     },
  //   })),
  // }));
  // Inside GET
  const formatted = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    assignedTo: event.assignments.map((a) => ({
      userId: a.userId,
      user: {
        name: a.user.name,
        email: a.user.email, // optional
        designation: a.user.designation, // ✅ include this
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
      // These are now coming from frontend in UTC ISO format
      start: new Date(body.start),
      end: new Date(body.end),
      assignments: {
        create: body.userIds.map((id: number) => ({
          user: { connect: { id } },
        })),
      },
      description: body.description,
    },
    include: {
      assignments: {
        include: {
          user: true,
        },
      },
    },
  });

  // Always send UTC strings back
  const formatted = {
    id: event.id,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    assignedTo: event.assignments.map((a) => ({
      userId: a.userId,
      user: {
        name: a.user.name,
        email: a.user.email, // optional
        designation: a.user.designation, // ✅ include this
      },
    })),
  };

  return NextResponse.json(formatted);
}
