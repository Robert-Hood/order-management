'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; order: Order | null }>({
        open: false,
        order: null,
    });
    const [deleting, setDeleting] = useState(false);

    async function fetchOrders() {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/orders');
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

    useEffect(() => {
        fetchOrders();
    }, []);

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
            <div className="w-full max-w-xl">
                <nav className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-black">📋 All Orders</h1>
                    <div className="flex gap-2 text-sm">
                        <Link
                            href="/"
                            className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
                        >
                            New order
                        </Link>
                        <Link
                            href="/products"
                            className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
                        >
                            Products
                        </Link>
                    </div>
                </nav>

                {error && (
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                )}

                {loading && (
                    <p className="text-sm text-gray-700">Loading orders...</p>
                )}

                {!loading && orders.length === 0 && !error && (
                    <p className="text-sm text-gray-700">
                        No orders yet.
                    </p>
                )}

                <div className="space-y-2">
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