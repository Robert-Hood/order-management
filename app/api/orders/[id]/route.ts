import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

type NewItem = {
  productId: string;
  quantity: number;
  modifierIds?: string[];
};

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Soft delete - just set deletedAt timestamp
    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/orders/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      discountPercent,
      discountNote,
      newItems,
    }: {
      customerName?: string;
      customerPhone?: string;
      discountPercent?: number;
      discountNote?: string;
      newItems?: NewItem[];
    } = body;

    // Get current order with items
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            modifiers: true,
          },
        },
      },
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    if (currentOrder.deletedAt) {
      return NextResponse.json(
        { error: 'Cannot edit a deleted order' },
        { status: 400 },
      );
    }

    const trimmedName = customerName?.trim() || currentOrder.customerName;
    const trimmedPhone = (customerPhone?.trim() || currentOrder.customerPhone).replace(/\D/g, '');

    // Validate phone if provided
    if (trimmedPhone && trimmedPhone.length !== 10 && trimmedPhone.length !== 0) {
      return NextResponse.json(
        { error: 'Phone must be exactly 10 digits or empty' },
        { status: 400 },
      );
    }

    // Process new items if any
    let newItemsData: {
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      modifiers: {
        create: {
          modifierId: string;
          nameAtTime: string;
          priceAtTime: number;
          costAtTime: number;
        }[];
      };
    }[] = [];

    let newItemsTotal = 0;

    if (newItems && newItems.length > 0) {
      const normalizedItems = newItems.map(i => ({
        productId: i.productId,
        quantity: Math.max(1, Number(i.quantity) || 1),
        modifierIds: Array.isArray(i.modifierIds) ? i.modifierIds : [],
      }));

      const productIds = [...new Set(normalizedItems.map(i => i.productId))];
      const allModifierIds = [
        ...new Set(normalizedItems.flatMap(i => i.modifierIds)),
      ].filter(Boolean);

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

      newItemsData = normalizedItems.map(i => {
        const product = productMap.get(i.productId)!;

        const appliedModifiers = i.modifierIds
          .map(mid => modifierMap.get(mid))
          .filter((m): m is NonNullable<typeof m> => !!m);

        const toppingsPerUnit = appliedModifiers.reduce(
          (sum, m) => sum + m.price,
          0,
        );
        const unitPrice = product.price + toppingsPerUnit;
        const lineTotal = unitPrice * i.quantity;

        newItemsTotal += lineTotal;

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
    }

    // Calculate existing items total
    const existingItemsTotal = currentOrder.items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    // New subtotal
    const newSubtotal = existingItemsTotal + newItemsTotal;

    // Calculate discount
    const safePercent = Math.max(
      0,
      Math.min(100, Number(discountPercent) ?? currentOrder.discountPercent),
    );
    const newDiscountAmount = (newSubtotal * safePercent) / 100;
    const newFinalAmount = newSubtotal - newDiscountAmount;

    // Determine customer changes
    const oldCustomerId = currentOrder.customerId;
    const phoneChanged = trimmedPhone !== currentOrder.customerPhone;
    const amountChanged = newFinalAmount !== currentOrder.amount;

    // Use transaction for all updates
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If we had an old customer and amount changed, update their stats
      if (oldCustomerId && amountChanged) {
        await tx.customer.update({
          where: { id: oldCustomerId },
          data: {
            totalSpent: { decrement: currentOrder.amount },
            orderCount: { decrement: 1 },
          },
        });
      } else if (oldCustomerId && phoneChanged) {
        // Phone changed, so we're unlinking - decrement old customer stats
        await tx.customer.update({
          where: { id: oldCustomerId },
          data: {
            totalSpent: { decrement: currentOrder.amount },
            orderCount: { decrement: 1 },
          },
        });
      }

      // Create new items if any
      if (newItemsData.length > 0) {
        for (const itemData of newItemsData) {
          await tx.orderItem.create({
            data: {
              orderId: id,
              ...itemData,
            },
          });
        }
      }

      // Determine new customer ID
      let newCustomerId: string | null = null;

      if (trimmedPhone.length === 10) {
        // Look for existing customer with this phone
        const existingCustomer = await tx.customer.findUnique({
          where: { phone: trimmedPhone },
        });

        if (existingCustomer) {
          newCustomerId = existingCustomer.id;

          // Update existing customer's stats and name
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: trimmedName,
              totalSpent: { increment: newFinalAmount },
              orderCount: { increment: 1 },
              lastOrderAt: new Date(),
            },
          });
        } else {
          // Create new customer
          const newCustomer = await tx.customer.create({
            data: {
              phone: trimmedPhone,
              name: trimmedName,
              totalSpent: newFinalAmount,
              orderCount: 1,
              lastOrderAt: new Date(),
            },
          });
          newCustomerId = newCustomer.id;
        }
      }

      // Update the order
      const order = await tx.order.update({
        where: { id },
        data: {
          customerName: trimmedName,
          customerPhone: trimmedPhone,
          customerId: newCustomerId,
          subtotal: newSubtotal,
          discountPercent: safePercent,
          discountAmount: newDiscountAmount,
          discountNote: safePercent > 0 ? (discountNote ?? currentOrder.discountNote) : null,
          amount: newFinalAmount,
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

      return order;
    });

    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error('PATCH /api/orders/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 },
    );
  }
}