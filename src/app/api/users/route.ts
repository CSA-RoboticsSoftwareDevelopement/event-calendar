import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

// export async function POST(req: Request) {
//   const body = await req.json();
//   const user = await prisma.user.create({ data: { name: body.name } });
//   return NextResponse.json(user);
// }

export async function POST(req: Request) {
  const body = await req.json();

  const { name, email, designation } = body;

  if (!name || !email || !designation) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      designation,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = Number(id);

    // Use a transaction to ensure both operations succeed or fail together
    await prisma.$transaction([
      // First, delete all event assignments for this user
      prisma.eventAssignment.deleteMany({
        where: { userId: userId },
      }),
      // Then, delete the user
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, email, designation } = body;

    if (!id || !name || !email || !designation) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        name,
        email,
        designation,
        updatedAt: new Date(), // update only the updatedAt field
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}