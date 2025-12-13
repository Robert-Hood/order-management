import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') ?? 'today';
    const customStart = url.searchParams.get('start');
    const customEnd = url.searchParams.get('end');

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'custom' && customStart && customEnd) {
      // Custom range - parse the dates
      startDate = new Date(customStart);
      // Set end date to end of day
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    }

    // Fetch orders within the date range (excluding deleted)
    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            modifiers: true,
          },
        },
      },
    });

    // Calculate summary stats
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalOrders = orders.length;
    const totalDiscountGiven = orders.reduce((sum, o) => sum + o.discountAmount, 0);

    // Calculate total cost (products + modifiers)
    let totalCost = 0;
    for (const order of orders) {
      for (const item of order.items) {
        // Product cost
        totalCost += item.product.cost * item.quantity;
        // Modifier costs
        for (const mod of item.modifiers) {
          totalCost += mod.costAtTime * item.quantity;
        }
      }
    }

    const totalProfit = totalRevenue - totalCost;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products by quantity sold
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product.id;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.lineTotal;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Top toppings by usage
    const toppingSales: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        for (const mod of item.modifiers) {
          const modId = mod.modifierId;
          if (!toppingSales[modId]) {
            toppingSales[modId] = {
              name: mod.nameAtTime,
              count: 0,
              revenue: 0,
            };
          }
          toppingSales[modId].count += item.quantity;
          toppingSales[modId].revenue += mod.priceAtTime * item.quantity;
        }
      }
    }

    const topToppings = Object.values(toppingSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Discounts breakdown
    const ordersWithDiscount = orders.filter(o => o.discountPercent > 0);
    const discountBreakdown = {
      ordersWithDiscount: ordersWithDiscount.length,
      totalDiscountGiven,
      avgDiscountPercent:
        ordersWithDiscount.length > 0
          ? ordersWithDiscount.reduce((sum, o) => sum + o.discountPercent, 0) /
            ordersWithDiscount.length
          : 0,
      discountedOrders: ordersWithDiscount.map(o => ({
        id: o.id,
        customerName: o.customerName,
        subtotal: o.subtotal,
        discountPercent: o.discountPercent,
        discountAmount: o.discountAmount,
        discountNote: o.discountNote,
        finalAmount: o.amount,
        createdAt: o.createdAt,
      })),
    };

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalRevenue,
        totalOrders,
        totalCost,
        totalProfit,
        avgOrderValue,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      topProducts,
      topToppings,
      discountBreakdown,
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}
