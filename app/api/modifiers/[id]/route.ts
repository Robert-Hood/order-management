import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// PATCH /api/modifiers/[id] - Update modifier
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, price, cost } = body as {
      name?: string;
      price?: number;
      cost?: number;
    };

    // Build update object with only provided fields
    const updateData: {
      name?: string;
      price?: number;
      cost?: number;
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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const modifier = await prisma.modifier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(modifier);
  } catch (err) {
    console.error('PATCH /api/modifiers/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update modifier' },
      { status: 500 },
    );
  }
}

// DELETE /api/modifiers/[id] - Soft delete modifier
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.modifier.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/modifiers/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to delete modifier' },
      { status: 500 },
    );
  }
}
