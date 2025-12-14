'use client';

import { useEffect, useState } from 'react';
import AppNav from '../../components/AppNav';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  totalCost: number;
  totalProfit: number;
  avgOrderValue: number;
  profitMargin: number;
};

type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

type TopTopping = {
  name: string;
  count: number;
  revenue: number;
};

type DiscountedOrder = {
  id: string;
  customerName: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  discountNote: string | null;
  finalAmount: number;
  createdAt: string;
};

type DiscountBreakdown = {
  ordersWithDiscount: number;
  totalDiscountGiven: number;
  avgDiscountPercent: number;
  discountedOrders: DiscountedOrder[];
};

type StatsData = {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: Summary;
  topProducts: TopProduct[];
  topToppings: TopTopping[];
  discountBreakdown: DiscountBreakdown;
};

const periodLabels: Record<Period, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'This month',
  all: 'All time',
  custom: 'Custom',
};

const orderedPeriods: Period[] = ['today', 'yesterday', 'week', 'month', 'all'];

// Determine which periods to show based on the latest order date
function getVisiblePeriods(latestOrderDate: string | null): Period[] {
  if (!latestOrderDate) return [];

  const latest = new Date(latestOrderDate);
  const now = new Date();

  // Get start of today, yesterday, 7 days ago, start of month
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Check which period the latest order falls into
  if (latest >= startOfToday) {
    return ['today', 'yesterday', 'week', 'month', 'all'];
  } else if (latest >= startOfYesterday) {
    return ['yesterday', 'week', 'month', 'all'];
  } else if (latest >= sevenDaysAgo) {
    return ['week', 'month', 'all'];
  } else if (latest >= startOfMonth) {
    return ['month', 'all'];
  } else {
    return ['all'];
  }
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visiblePeriods, setVisiblePeriods] = useState<Period[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Fast: Single lightweight query to get latest order date
  async function determineVisiblePeriods() {
    try {
      setLoadingCounts(true);

      const res = await fetch('/api/stats/latest');
      if (!res.ok) throw new Error('Failed to fetch');

      const { latestOrderDate } = await res.json();
      const periods = getVisiblePeriods(latestOrderDate);

      setVisiblePeriods(periods);

      // Auto-select first visible period, or 'all' if none
      const firstPeriod = periods[0] || 'all';
      setPeriod(firstPeriod);
    } catch (err) {
      console.error('Failed to determine periods:', err);
      // On error, show all periods
      setVisiblePeriods(orderedPeriods);
      setPeriod('today');
    } finally {
      setLoadingCounts(false);
    }
  }

  async function fetchStats(selectedPeriod: Period, start?: string, end?: string) {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/stats?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && start && end) {
        url += `&start=${start}&end=${end}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load stats');
      }

      const data = (await res.json()) as StatsData;
      setStats(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to load stats';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // On mount: determine which periods to show
  useEffect(() => {
    determineVisiblePeriods();
  }, []);

  // Fetch stats when period changes
  useEffect(() => {
    if (period === null || loadingCounts) return;

    if (period === 'custom') {
      if (customStart && customEnd) {
        fetchStats(period, customStart, customEnd);
      }
    } else {
      fetchStats(period);
    }
  }, [period, customStart, customEnd, loadingCounts]);

  function formatCurrency(amount: number) {
    return `₹${amount.toFixed(0)}`;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl">
        <AppNav />

        <h1 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Stats</span>
        </h1>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          {loadingCounts ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {visiblePeriods.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPeriod('custom');
                    if (!customStart && !customEnd) {
                      const today = getTodayString();
                      setCustomStart(today);
                      setCustomEnd(today);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    period === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {periodLabels.custom}
                </button>
              </div>

              {visiblePeriods.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No orders yet. Use Custom to select a date range.
                </p>
              )}
            </>
          )}

          {period === 'custom' && (
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd || getTodayString()}
                  className="w-full border rounded px-2 py-1.5 text-sm text-black"
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  max={getTodayString()}
                  className="w-full border rounded px-2 py-1.5 text-sm text-black"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-sm text-gray-600">Loading stats...</p>
          </div>
        )}

        {!loading && stats && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Revenue
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.summary.totalRevenue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.summary.totalOrders} order{stats.summary.totalOrders !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Profit
                </div>
                <div className={`text-2xl font-bold ${stats.summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.summary.totalProfit)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.summary.profitMargin.toFixed(1)}% margin
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Avg Order
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.summary.avgOrderValue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  per order
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Total Cost
                </div>
                <div className="text-2xl font-bold text-gray-700">
                  {formatCurrency(stats.summary.totalCost)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ingredients
                </div>
              </div>
            </div>

            {/* Top Products */}
            {stats.topProducts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  🏆 Top Products
                </h2>
                <div className="space-y-2">
                  {stats.topProducts.map((product, idx) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-200 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-black">
                          {product.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-black">
                          {product.quantity} sold
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(product.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Toppings */}
            {stats.topToppings.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  🍫 Top Toppings
                </h2>
                <div className="flex flex-wrap gap-2">
                  {stats.topToppings.map((topping) => (
                    <div
                      key={topping.name}
                      className="bg-gray-50 rounded-lg px-3 py-2 border"
                    >
                      <div className="text-sm font-medium text-black">
                        {topping.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {topping.count}× · {formatCurrency(topping.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discounts Section */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">
                🏷️ Discounts Given
              </h2>
              
              {stats.discountBreakdown.ordersWithDiscount === 0 ? (
                <p className="text-sm text-gray-500">
                  No discounts given in this period.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(stats.discountBreakdown.totalDiscountGiven)}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Total
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-red-600">
                        {stats.discountBreakdown.ordersWithDiscount}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Orders
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-red-600">
                        {stats.discountBreakdown.avgDiscountPercent.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">
                        Avg %
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stats.discountBreakdown.discountedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-gray-50 rounded-lg p-2 text-xs border"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-black">
                              {order.customerName}
                            </div>
                            <div className="text-gray-500">
                              {formatDateTime(order.createdAt)}
                            </div>
                            {order.discountNote && (
                              <div className="text-gray-600 mt-1 italic">
                                &ldquo;{order.discountNote}&rdquo;
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-red-600 line-through text-[10px]">
                              {formatCurrency(order.subtotal)}
                            </div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(order.finalAmount)}
                            </div>
                            <div className="text-gray-500">
                              -{order.discountPercent.toFixed(0)}% (−{formatCurrency(order.discountAmount)})
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Empty State */}
            {stats.summary.totalOrders === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-gray-600">
                  No orders in this period.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try selecting a different time range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}