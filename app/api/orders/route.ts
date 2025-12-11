import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

type IncomingItem = {
  productId: string;
  quantity: number;
  modifierIds?: string[];
};

/**
 * Async function to handle customer creation/update.
 * This runs after order creation to avoid adding latency.
 * 
 * Logic:
 * - If phone is empty → do nothing (order exists without customer)
 * - If phone exists in DB → update name if different, update stats
 * - If phone doesn't exist → create new customer
 */
async function handleCustomerAsync(
  orderId: string,
  customerName: string,
  customerPhone: string,
  orderAmount: number,
) {
  try {
    // Find existing customer by phone
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: customerPhone },
    });

    if (existingCustomer) {
      // Customer exists - update name if different, update stats
      const updates: {
        name?: string;
        orderCount: { increment: number };
        totalSpent: { increment: number };
        lastOrderAt: Date;
      } = {
        orderCount: { increment: 1 },
        totalSpent: { increment: orderAmount },
        lastOrderAt: new Date(),
      };

      // Only update name if it's different
      if (existingCustomer.name !== customerName) {
        updates.name = customerName;
      }

      await prisma.$transaction([
        prisma.customer.update({
          where: { id: existingCustomer.id },
          data: updates,
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { customerId: existingCustomer.id },
        }),
      ]);
    } else {
      // New customer - create and link to order
      const newCustomer = await prisma.customer.create({
        data: {
          phone: customerPhone,
          name: customerName,
          orderCount: 1,
          totalSpent: orderAmount,
          lastOrderAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { customerId: newCustomer.id },
      });
    }
  } catch (err) {
    // Log error but don't fail - customer linking is non-critical
    console.error('handleCustomerAsync error:', err);
  }
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
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

    if (!customerName) {
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

  // Prepare IDs for lookup
  const productIds = [...new Set(normalisedItems.map(i => i.productId))];
  const allModifierIds = [
    ...new Set(normalisedItems.flatMap(i => i.modifierIds)),
  ].filter(Boolean);

  // OPTIMIZATION: Fetch products and modifiers in PARALLEL instead of sequential
  // This saves one full round-trip to the database (~250ms with cross-region latency)
  const [products, modifiers] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
    }),
    allModifierIds.length > 0
      ? prisma.modifier.findMany({
          where: { id: { in: allModifierIds }, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: 'One or more products not found' },
      { status: 400 },
    );
  }

  const productMap = new Map(products.map(p => [p.id, p]));
  const modifierMap = new Map(modifiers.map(m => [m.id, m]));


    // Build order items with nested modifiers
    const orderItemsData = normalisedItems.map(i => {
      const product = productMap.get(i.productId)!;

      const appliedModifiers = i.modifierIds
        .map(id => modifierMap.get(id))
        .filter((m): m is NonNullable<typeof m> => !!m);

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

    // Create order first (without customer link - will be updated async)
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
        customer: true,
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

    // Handle customer creation/update asynchronously
    // Only if phone number is provided (10 digits)
    if (phone.length === 10) {
      // Fire and forget - don't await
      handleCustomerAsync(order.id, customerName, phone, finalAmount);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 },
    );
  }
}