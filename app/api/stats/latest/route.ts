import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// GET /api/stats/latest - Get the most recent order date
// Used to determine which period chips to show on stats page
export async function GET() {
  try {
    const latestOrder = await prisma.order.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      latestOrderDate: latestOrder?.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('GET /api/stats/latest error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch latest order' },
      { status: 500 },
    );
  }
}