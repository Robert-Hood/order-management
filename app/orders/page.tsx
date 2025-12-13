'use client';

import { useEffect, useState } from 'react';
import AppNav from '../../components/AppNav';

type Product = {
    id: string;
    name: string;
    price: number;
};

type OrderItemModifier = {
    id: string;
    nameAtTime: string;
    priceAtTime: number;
    costAtTime: number;
    modifier: {
        id: string;
        name: string;
        price: number;
    };
};

type OrderItem = {
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: Product;
    modifiers: OrderItemModifier[];
};

type Order = {
    id: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountNote?: string | null;
    createdAt: string;
    items: OrderItem[];
};

type ProductOption = {
    id: string;
    name: string;
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; order: Order | null }>({
        open: false,
        order: null,
    });
    const [deleting, setDeleting] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [discountFilter, setDiscountFilter] = useState<'all' | 'yes' | 'no'>('all');

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Helper to get today's date in YYYY-MM-DD format
    function getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        }
    }

    async function fetchOrders() {
        try {
            setLoading(true);
            setError(null);

            // Build query params
            const params = new URLSearchParams();
            
            if (debouncedSearch) {
                params.set('search', debouncedSearch);
            }
            if (startDate) {
                params.set('start', startDate);
            }
            if (endDate) {
                params.set('end', endDate);
            }
            if (productFilter) {
                params.set('productId', productFilter);
            }
            if (discountFilter !== 'all') {
                params.set('hasDiscount', discountFilter);
            }

            const queryString = params.toString();
            const url = `/api/orders${queryString ? `?${queryString}` : ''}`;

            const res = await fetch(url);
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to load orders');
            }

            const data = (await res.json()) as Order[];
            setOrders(data);
        } catch (err) {
            console.error(err);
            const message =
                err instanceof Error ? err.message : 'Failed to load orders';
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteOrder() {
        if (!deleteModal.order) return;

        try {
            setDeleting(true);
            const res = await fetch(`/api/orders/${deleteModal.order.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to delete order');
            }

            // Remove from local state
            setOrders((prev) => prev.filter((o) => o.id !== deleteModal.order!.id));
            setDeleteModal({ open: false, order: null });
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Failed to delete order');
        } finally {
            setDeleting(false);
        }
    }

    function clearFilters() {
        setSearch('');
        setStartDate('');
        setEndDate('');
        setProductFilter('');
        setDiscountFilter('all');
    }

    const hasActiveFilters = debouncedSearch || startDate || endDate || productFilter || discountFilter !== 'all';

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [debouncedSearch, startDate, endDate, productFilter, discountFilter]);

    // Calculate summary stats for filtered results
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
            <div className="w-full max-w-xl">
                <AppNav />

                {/* Page Title + Filter Toggle */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-black flex items-center gap-2">
                        <span>📋</span>
                        <span>All Orders</span>
                    </h1>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            showFilters || hasActiveFilters
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
                        {/* Search */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Search customer
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Name or phone..."
                                className="w-full border rounded px-3 py-2 text-sm text-black"
                            />
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    From
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={endDate || getTodayString()}
                                    className="w-full border rounded px-2 py-1.5 text-sm text-black"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    To
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    max={getTodayString()}
                                    className="w-full border rounded px-2 py-1.5 text-sm text-black"
                                />
                            </div>
                        </div>

                        {/* Product & Discount Filters */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Product
                                </label>
                                <select
                                    value={productFilter}
                                    onChange={(e) => setProductFilter(e.target.value)}
                                    className="w-full border rounded px-2 py-1.5 text-sm text-black"
                                >
                                    <option value="">All products</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Discount
                                </label>
                                <select
                                    value={discountFilter}
                                    onChange={(e) => setDiscountFilter(e.target.value as 'all' | 'yes' | 'no')}
                                    className="w-full border rounded px-2 py-1.5 text-sm text-black"
                                >
                                    <option value="all">All orders</option>
                                    <option value="yes">With discount</option>
                                    <option value="no">No discount</option>
                                </select>
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Results Summary */}
                {!loading && orders.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-3 mb-4">
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>
                                {orders.length} order{orders.length !== 1 ? 's' : ''}
                                {hasActiveFilters && ' (filtered)'}
                            </span>
                            <div className="flex gap-4">
                                <span>Revenue: <strong className="text-green-600">₹{totalRevenue.toFixed(0)}</strong></span>
                                {totalDiscount > 0 && (
                                    <span>Discounts: <strong className="text-red-600">₹{totalDiscount.toFixed(0)}</strong></span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                )}

                {/* Loading state - show overlay when filtering */}
                {loading && orders.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-3 mb-4 flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-600">Updating orders...</span>
                    </div>
                )}

                {/* Initial loading */}
                {loading && orders.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-gray-700">Loading orders...</span>
                        </div>
                    </div>
                )}

                {!loading && orders.length === 0 && !error && (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl mb-2">📭</div>
                        <p className="text-sm text-gray-700">
                            {hasActiveFilters ? 'No orders match your filters.' : 'No orders yet.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Orders list - show with slight opacity when loading */}
                <div className={`space-y-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {orders.map(order => (
                        <div
                            key={order.id}
                            className="bg-white rounded-lg shadow p-3 text-xs relative overflow-visible"
                        >
                            {/* Delete button - overlapping top right corner */}
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: true, order })}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-500 text-gray-500 hover:text-white transition-colors flex items-center justify-center shadow-sm"
                                aria-label="Delete order"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>

                            <div className="flex justify-between gap-3">
                                <div className="flex-1">
                                    <div className="font-semibold text-sm text-black">
                                        {order.customerName}
                                    </div>
                                    <div className="text-xs text-gray-700">
                                        {order.customerPhone}
                                    </div>

                                    <div className="mt-1 space-y-0.5">
                                        {order.items.map(item => {
                                            const toppingsPerUnit = item.modifiers.reduce(
                                                (sum, m) => sum + m.priceAtTime,
                                                0,
                                            );
                                            const basePriceAtTime = item.unitPrice - toppingsPerUnit;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="text-[11px] text-gray-600 mb-0.5"
                                                >
                                                    <div>
                                                        {item.quantity} × {item.product.name} = ₹
                                                        {item.lineTotal.toFixed(0)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        ₹{item.unitPrice.toFixed(0)} each
                                                        {item.modifiers.length > 0 ? (
                                                            <>
                                                                {' '}
                                                                = ₹{basePriceAtTime.toFixed(0)} base
                                                                {item.modifiers.map(m => (
                                                                    <span key={m.id}>
                                                                        {' '}
                                                                        + ₹{m.priceAtTime.toFixed(0)} {m.nameAtTime}
                                                                    </span>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <> (base price)</>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    </div>
                                </div>

                                <div className="text-right text-xs">
                                    {order.discountPercent > 0 && order.subtotal > 0 ? (
                                        <>
                                            <div className="text-xs text-red-600 line-through">
                                                ₹{order.subtotal.toFixed(0)}
                                            </div>
                                            <div className="font-semibold text-sm text-green-600">
                                                ₹{order.amount.toFixed(0)}
                                            </div>
                                            <div className="text-[11px] text-gray-600">
                                                -{order.discountPercent}% (₹
                                                {order.discountAmount.toFixed(0)})
                                            </div>
                                            {order.discountNote && (
                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                    {order.discountNote}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="font-semibold text-sm text-black">
                                            ₹{order.amount.toFixed(0)}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-500">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && deleteModal.order && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
                    onClick={() => !deleting && setDeleteModal({ open: false, order: null })}
                >
                    <div
                        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-red-600"
                                >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Delete Order?
                                </h3>
                                <p className="text-sm text-gray-500">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-900">
                                {deleteModal.order.customerName}
                            </div>
                            <div className="text-gray-600 text-xs mt-1">
                                {deleteModal.order.items.length} item(s) • ₹{deleteModal.order.amount.toFixed(0)}
                            </div>
                            <div className="text-gray-500 text-xs">
                                {new Date(deleteModal.order.createdAt).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: false, order: null })}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteOrder}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.2s ease-out;
                }
                @media (min-width: 640px) {
                    @keyframes slide-up {
                        from {
                            transform: scale(0.95);
                            opacity: 0;
                        }
                        to {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                }
            `}</style>
        </main>
    );
}
