import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// GET /api/customers/[id] - Get customer with their orders
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          where: { deletedAt: null },
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
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error('GET /api/customers/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 },
    );
  }
}

// PATCH /api/customers/[id] - Update customer name
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = body as { name?: string };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(customer);
  } catch (err) {
    console.error('PATCH /api/customers/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 },
    );
  }
}