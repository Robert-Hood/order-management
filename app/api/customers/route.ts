import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

// GET /api/customers - List all customers with stats
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') ?? '';
    const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    // Run both queries in parallel for better performance
    const [customers, aggregates] = await Promise.all([
      // Get paginated customers
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { orderCount: 'desc' },
        take: limit,
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      // Get total count and sum of totalSpent for all matching customers
      prisma.customer.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { totalSpent: true },
      }),
    ]);

    const totalCount = aggregates._count.id;
    const totalRevenue = aggregates._sum.totalSpent ?? 0;

    return NextResponse.json({
      customers,
      totalCount,
      totalRevenue,
    });
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 },
    );
  }
}

// POST /api/customers - Manual customer creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'name and phone are required' },
        { status: 400 },
      );
    }

    const normalizedPhone = phone.trim();

    if (normalizedPhone.length !== 10 || !/^\d+$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Phone must be exactly 10 digits' },
        { status: 400 },
      );
    }

    // Check if customer already exists
    const existing = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 409 },
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error('POST /api/customers error:', err);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 },
    );
  }
}