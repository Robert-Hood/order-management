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
                            className="bg-white rounded-lg shadow p-3 text-xs flex justify-between gap-3"
                        >
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
                    ))}
                </div>
            </div>
        </main>
    );
}
