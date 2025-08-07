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
      .filter(event => event.start < end && event.end > start)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const isBusy = futureEvents.length > 0;

    const nextAvailable = isBusy
      ? futureEvents.reduce((latest, curr) =>
          new Date(curr.end) > latest ? new Date(curr.end) : latest,
          new Date(0)
        )
      : new Date();

    const availableSlots: { start: string; end: string }[] = [];

    // 1. Start with the time window start
    let lastEnd = start;

    for (const event of futureEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // If there's a gap between lastEnd and the start of the event, add it as a slot
      if (eventStart > lastEnd) {
        availableSlots.push({
          start: lastEnd.toISOString(),
          end: eventStart.toISOString(),
        });
      }

      // Update lastEnd to be the end of the current event if it's later
      if (eventEnd > lastEnd) {
        lastEnd = eventEnd;
      }
    }

    // 2. After last event, check if there's a slot till the requested `end`
    if (lastEnd < end) {
      availableSlots.push({
        start: lastEnd.toISOString(),
        end: end.toISOString(),
      });
    }

    return {
      id: user.id,
      name: user.name,
      isBusy,
      nextAvailable,
      availableSlots,
    };
  });

  return NextResponse.json(availability);
}





// import { prisma } from '@/src/lib/prisma';
// import { NextResponse } from 'next/server';

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const start = new Date(searchParams.get('start') || '');
//   const end = new Date(searchParams.get('end') || '');

//   if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
//     return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 });
//   }

//   // Define slot duration (in ms) and working hours (you can adjust this)
//   const SLOT_DURATION = 60 * 60 * 1000; // 1 hour slots

//   const users = await prisma.user.findMany({
//     include: {
//       assignments: {
//         include: {
//           event: true,
//         },
//       },
//     },
//   });

//   const availability = users.map(user => {
//     // Get user’s events within selected window
//     const futureEvents = user.assignments
//       .map(a => a.event)
//       .filter(event => event.start < end && event.end > start)
//       .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

//     const isBusy = futureEvents.length > 0;

//     const nextAvailable = isBusy
//       ? futureEvents.reduce((latest, curr) =>
//           new Date(curr.end) > latest ? new Date(curr.end) : latest,
//           new Date(0)
//         )
//       : new Date();

//     // Build available slots
//     const availableSlots = [];
//     let cursor = new Date(start);

//     for (const event of futureEvents) {
//       const busyStart = new Date(event.start);
//       const busyEnd = new Date(event.end);

//       while (cursor < busyStart) {
//         const slotEnd = new Date(cursor.getTime() + SLOT_DURATION);
//         if (slotEnd <= busyStart && slotEnd <= end) {
//           availableSlots.push({ start: new Date(cursor), end: new Date(slotEnd) });
//         }
//         cursor = slotEnd;
//       }

//       if (cursor < busyEnd) {
//         cursor = new Date(busyEnd); // move cursor to end of current busy time
//       }
//     }

//     // Fill remaining time after last event
//     while (cursor.getTime() + SLOT_DURATION <= end.getTime()) {
//       availableSlots.push({
//         start: new Date(cursor),
//         end: new Date(cursor.getTime() + SLOT_DURATION),
//       });
//       cursor = new Date(cursor.getTime() + SLOT_DURATION);
//     }

//     return {
//       id: user.id,
//       name: user.name,
//       isBusy,
//       nextAvailable,
//       availableSlots,
//     };
//   });

//   return NextResponse.json(availability);
// }
