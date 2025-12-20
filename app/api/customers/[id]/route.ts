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

// PATCH /api/customers/[id] - Update customer name and/or phone
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone } = body as { name?: string; phone?: string };

    // Validate at least one field is provided
    const trimmedName = name?.trim();
    const trimmedPhone = phone?.trim();

    if (!trimmedName && !trimmedPhone) {
      return NextResponse.json(
        { error: 'At least one of name or phone is required' },
        { status: 400 },
      );
    }

    // Get current customer
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!currentCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: { name?: string; phone?: string } = {};

    if (trimmedName) {
      updateData.name = trimmedName;
    }

    if (trimmedPhone) {
      // Validate phone format
      if (trimmedPhone.length !== 10 || !/^\d+$/.test(trimmedPhone)) {
        return NextResponse.json(
          { error: 'Phone must be exactly 10 digits' },
          { status: 400 },
        );
      }

      // Check for duplicate phone (excluding current customer)
      if (trimmedPhone !== currentCustomer.phone) {
        const existingWithPhone = await prisma.customer.findUnique({
          where: { phone: trimmedPhone },
        });

        if (existingWithPhone) {
          return NextResponse.json(
            { error: 'Another customer already has this phone number' },
            { status: 409 },
          );
        }
      }

      updateData.phone = trimmedPhone;
    }

    // Determine what fields changed for order cascade
    const nameChanged = trimmedName && trimmedName !== currentCustomer.name;
    const phoneChanged = trimmedPhone && trimmedPhone !== currentCustomer.phone;

    // Use transaction to update customer and cascade to orders
    const updatedCustomer = await prisma.$transaction(async (tx) => {
      // Update customer
      const customer = await tx.customer.update({
        where: { id },
        data: updateData,
      });

      // Cascade changes to linked orders if name or phone changed
      if (nameChanged || phoneChanged) {
        const orderUpdateData: { customerName?: string; customerPhone?: string } = {};
        
        if (nameChanged) {
          orderUpdateData.customerName = trimmedName;
        }
        if (phoneChanged) {
          orderUpdateData.customerPhone = trimmedPhone;
        }

        await tx.order.updateMany({
          where: { customerId: id },
          data: orderUpdateData,
        });
      }

      return customer;
    });

    return NextResponse.json(updatedCustomer);
  } catch (err) {
    console.error('PATCH /api/customers/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 },
    );
  }
}