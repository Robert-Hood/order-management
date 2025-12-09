import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// GET /api/modifiers
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get('all') === 'true';

    const modifiers = await prisma.modifier.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(modifiers);
  } catch (err) {
    console.error('GET /api/modifiers error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch modifiers' },
      { status: 500 },
    );
  }
}

// POST /api/modifiers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, cost, type } = body;

    if (!name || price === undefined || cost === undefined) {
      return NextResponse.json(
        { error: 'name, price and cost are required' },
        { status: 400 },
      );
    }

    const priceNumber = Number(price);
    const costNumber = Number(cost);

    if (Number.isNaN(priceNumber) || Number.isNaN(costNumber)) {
      return NextResponse.json(
        { error: 'price and cost must be numbers' },
        { status: 400 },
      );
    }

    const modifier = await prisma.modifier.create({
      data: {
        name,
        price: priceNumber,
        cost: costNumber,
        type: type ?? 'topping',
      },
    });

    return NextResponse.json(modifier, { status: 201 });
  } catch (err) {
    console.error('POST /api/modifiers error:', err);
    return NextResponse.json(
      { error: 'Failed to create modifier' },
      { status: 500 },
    );
  }
}
