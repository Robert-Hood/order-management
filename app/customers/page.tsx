'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Customer = {
  id: string;
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
};

type OrderItemModifier = {
  id: string;
  nameAtTime: string;
  priceAtTime: number;
  costAtTime: number;
};

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
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

type CustomerWithOrders = Customer & {
  orders: Order[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded customer state
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [expandedCustomerOrders, setExpandedCustomerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Add customer form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchCustomers() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/customers');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load customers');
      }

      const data = (await res.json()) as Customer[];
      setCustomers(data);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to load customers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomerOrders(customerId: string) {
    try {
      setLoadingOrders(true);

      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load customer orders');
      }

      const data = (await res.json()) as CustomerWithOrders;
      setExpandedCustomerOrders(data.orders);
    } catch (err) {
      console.error(err);
      setExpandedCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function toggleExpand(customerId: string) {
    if (expandedCustomerId === customerId) {
      // Collapse
      setExpandedCustomerId(null);
      setExpandedCustomerOrders([]);
    } else {
      // Expand and fetch orders
      setExpandedCustomerId(customerId);
      setExpandedCustomerOrders([]);
      await fetchCustomerOrders(customerId);
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create customer');
      }

      // Reset form and refresh list
      setNewName('');
      setNewPhone('');
      setShowAddForm(false);
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to create customer';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatPhone(phone: string) {
    if (phone.length === 10) {
      return `${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl">
        <nav className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black">👥 Customers</h1>
          <div className="flex gap-2 text-sm">
            <Link
              href="/"
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
            >
              New order
            </Link>
            <Link
              href="/orders"
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
            >
              All orders
            </Link>
            <Link
              href="/products"
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
            >
              Products
            </Link>
          </div>
        </nav>

        {/* Add Customer Section */}
        <div className="mb-4">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 px-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add customer
            </button>
          ) : (
            <form
              onSubmit={handleAddCustomer}
              className="bg-white rounded-lg shadow p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Add customer
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewName('');
                    setNewPhone('');
                    setFormError(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Name
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Rahul"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={newPhone}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setNewPhone(value);
                    }
                  }}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  required
                />
                {newPhone.length > 0 && newPhone.length < 10 && (
                  <p className="text-xs text-red-600 mt-1">
                    Phone number must be exactly 10 digits
                  </p>
                )}
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || newPhone.length !== 10}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Adding...' : 'Add customer'}
              </button>
            </form>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-gray-700">Loading customers...</p>
        )}

        {!loading && customers.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-700 mb-2">
              No customers yet.
            </p>
            <p className="text-xs text-gray-500">
              Customers are automatically created when orders include a phone number, or add one manually above.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {customers.map(customer => (
            <div
              key={customer.id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              {/* Customer summary row - clickable to expand */}
              <button
                type="button"
                onClick={() => toggleExpand(customer.id)}
                className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-black truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {formatPhone(customer.phone)}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-black">
                      ₹{customer.totalSpent.toFixed(0)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-1">
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
                      className={`text-gray-400 transition-transform ${
                        expandedCustomerId === customer.id ? 'rotate-180' : ''
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                  <span>Last order: {formatDate(customer.lastOrderAt)}</span>
                  <span>•</span>
                  <span>Since {formatDate(customer.createdAt)}</span>
                </div>
              </button>

              {/* Expanded section - linked orders */}
              {expandedCustomerId === customer.id && (
                <div className="border-t bg-gray-50 p-3">
                  {loadingOrders && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      Loading orders...
                    </p>
                  )}

                  {!loadingOrders && expandedCustomerOrders.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No orders found for this customer.
                    </p>
                  )}

                  {!loadingOrders && expandedCustomerOrders.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Order history ({expandedCustomerOrders.length})
                      </div>
                      {expandedCustomerOrders.map(order => (
                        <div
                          key={order.id}
                          className="bg-white rounded border p-2 text-xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="space-y-0.5">
                                {order.items.map(item => (
                                  <div key={item.id} className="text-gray-700">
                                    {item.quantity} × {item.product.name}
                                    {item.modifiers.length > 0 && (
                                      <span className="text-gray-500">
                                        {' '}({item.modifiers.map(m => m.nameAtTime).join(', ')})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {order.discountPercent > 0 ? (
                                <>
                                  <div className="text-[10px] text-red-500 line-through">
                                    ₹{order.subtotal.toFixed(0)}
                                  </div>
                                  <div className="font-semibold text-green-600">
                                    ₹{order.amount.toFixed(0)}
                                  </div>
                                </>
                              ) : (
                                <div className="font-semibold text-black">
                                  ₹{order.amount.toFixed(0)}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-500">
                                {formatDateTime(order.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats summary at bottom */}
        {!loading && customers.length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow p-3">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
              <span>
                Total revenue: ₹
                {customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}