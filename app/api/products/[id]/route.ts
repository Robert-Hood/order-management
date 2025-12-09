import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // 👈 important
    const body = await req.json();
    const { hasModifiers } = body as { hasModifiers?: boolean };

    if (typeof hasModifiers !== 'boolean') {
      return NextResponse.json(
        { error: 'hasModifiers boolean is required' },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: { hasModifiers },
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
