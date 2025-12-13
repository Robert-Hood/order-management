import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, price, cost, hasModifiers } = body as {
      name?: string;
      price?: number;
      cost?: number;
      hasModifiers?: boolean;
    };

    // Build update object with only provided fields
    const updateData: {
      name?: string;
      price?: number;
      cost?: number;
      hasModifiers?: boolean;
    } = {};

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (typeof price === 'number' && !Number.isNaN(price)) {
      updateData.price = price;
    }

    if (typeof cost === 'number' && !Number.isNaN(cost)) {
      updateData.cost = cost;
    }

    if (typeof hasModifiers === 'boolean') {
      updateData.hasModifiers = hasModifiers;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error('PATCH /api/products/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 },
    );
  }
}
