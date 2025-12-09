import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // 👈 important

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
