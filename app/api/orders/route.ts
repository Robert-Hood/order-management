import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

type IncomingItem = {
  productId: string;
  quantity: number;
};

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      items,
      discountPercent,
      discountNote,
    }: {
      customerName?: string;
      customerPhone?: string;
      items?: IncomingItem[];
      discountPercent?: number;
      discountNote?: string;
    } = body;

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'customerName and customerPhone are required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    const normalisedItems = items.map(i => ({
      productId: i.productId,
      quantity: Math.max(1, Number(i.quantity) || 1),
    }));

    const productIds = [...new Set(normalisedItems.map(i => i.productId))];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products not found' },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    const orderItemsData = normalisedItems.map(i => {
      const product = productMap.get(i.productId)!;
      const unitPrice = product.price;
      const lineTotal = unitPrice * i.quantity;

      return {
        productId: product.id,
        quantity: i.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    const safePercent = Math.max(
      0,
      Math.min(100, Number(discountPercent) || 0)
    );
    const discountAmount = (subtotal * safePercent) / 100;
    const finalAmount = subtotal - discountAmount;

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        amount: finalAmount,
        subtotal,
        discountPercent: safePercent,
        discountAmount,
        discountNote: safePercent > 0 ? discountNote ?? null : null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
