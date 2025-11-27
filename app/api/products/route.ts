import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error('GET /api/products error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, cost } = body;

    if (!name || price === undefined || cost === undefined) {
      return NextResponse.json(
        { error: 'name, price, and cost are required' },
        { status: 400 }
      );
    }

    const priceNumber = Number(price);
    const costNumber = Number(cost);

    if (Number.isNaN(priceNumber) || Number.isNaN(costNumber)) {
      return NextResponse.json(
        { error: 'price and cost must be numbers' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: priceNumber,
        cost: costNumber,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('POST /api/products error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
