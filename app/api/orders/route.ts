import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

type IncomingItem = {
  productId: string;
  quantity: number;
  modifierIds?: string[]; // NEW
};

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
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

    const phone = (customerPhone ?? '').trim();

    if (!customerName ) {
      return NextResponse.json(
        { error: 'customerName is required' },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 },
      );
    }

    const normalisedItems = items.map(i => ({
      productId: i.productId,
      quantity: Math.max(1, Number(i.quantity) || 1),
      modifierIds: Array.isArray(i.modifierIds) ? i.modifierIds : [],
    }));

    // Load all products we need
    const productIds = [...new Set(normalisedItems.map(i => i.productId))];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products not found' },
        { status: 400 },
      );
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Load all modifiers (toppings) we need
    const allModifierIds = [
      ...new Set(
        normalisedItems.flatMap(i => i.modifierIds),
      ),
    ].filter(Boolean);

    const modifiers =
      allModifierIds.length > 0
        ? await prisma.modifier.findMany({
            where: { id: { in: allModifierIds }, isActive: true },
          })
        : [];

    const modifierMap = new Map(modifiers.map(m => [m.id, m]));

    // Build order items with nested modifiers
    const orderItemsData = normalisedItems.map(i => {
      const product = productMap.get(i.productId)!;

      const appliedModifiers = i.modifierIds
        .map(id => modifierMap.get(id))
        .filter((m): m is NonNullable<typeof m> => !!m);

      // price per unit:
      const toppingsPerUnit = appliedModifiers.reduce(
        (sum, m) => sum + m.price,
        0,
      );
      const unitPrice = product.price + toppingsPerUnit;
      const lineTotal = unitPrice * i.quantity;

      const modifiersCreate = appliedModifiers.map(m => ({
        modifierId: m.id,
        nameAtTime: m.name,
        priceAtTime: m.price,
        costAtTime: m.cost,
      }));

      return {
        productId: product.id,
        quantity: i.quantity,
        unitPrice,
        lineTotal,
        modifiers: {
          create: modifiersCreate,
        },
      };
    });

    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    const safePercent = Math.max(
      0,
      Math.min(100, Number(discountPercent) || 0),
    );
    const discountAmount = (subtotal * safePercent) / 100;
    const finalAmount = subtotal - discountAmount;

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone: phone,
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
            modifiers: {
              include: {
                modifier: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 },
    );
  }
}
