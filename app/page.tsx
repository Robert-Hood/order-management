'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  isActive: boolean;
  createdAt: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: Product;
};

type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;          // final total
  subtotal: number;        // before discount
  discountPercent: number;
  discountAmount: number;
  discountNote?: string | null;
  createdAt: string;
  items: OrderItem[];
};

type LocalItem = {
  id: number;      // local temporary id for UI
  productId: string;
  quantity: number;
};

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [items, setItems] = useState<LocalItem[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState('');

  const [discountMode, setDiscountMode] = useState<'preset' | 'custom'>('preset');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('0');
  const [customFinalPrice, setCustomFinalPrice] = useState<string>('');


  // Build detailed view of items with product info & line totals
  const detailedItems = items
    .map(i => {
      const product = products.find(p => p.id === i.productId);
      if (!product) return null;
      const unitPrice = product.price;
      const lineTotal = unitPrice * i.quantity;
      return { ...i, product, unitPrice, lineTotal };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const subtotal = detailedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount;

  function handleSelectPresetDiscount(pct: number) {
    setDiscountMode('preset');
    setDiscountPercent(pct);
  }

  function handleCustomClick() {
    setDiscountMode('custom');
    // start with 0% discount and full price as you wanted
    setDiscountPercent(0);
    setCustomDiscountPercent('0');
    setCustomFinalPrice(subtotal > 0 ? subtotal.toFixed(0) : '');
  }

  function handleCustomDiscountPercentChange(value: string) {
    setDiscountMode('custom');
    setCustomDiscountPercent(value);

    const raw = Number(value);
    if (!Number.isFinite(raw) || subtotal <= 0) {
      setDiscountPercent(0);
      setCustomFinalPrice(subtotal ? subtotal.toFixed(0) : '');
      return;
    }

    const pct = Math.max(0, Math.min(100, raw));
    setDiscountPercent(pct);

    const finalPrice = subtotal - (subtotal * pct) / 100;
    setCustomFinalPrice(finalPrice.toFixed(0));
  }

  function handleCustomFinalPriceChange(value: string) {
    setDiscountMode('custom');
    setCustomFinalPrice(value);

    const price = Number(value);
    if (!Number.isFinite(price) || subtotal <= 0) {
      setDiscountPercent(0);
      setCustomDiscountPercent('0');
      return;
    }

    // keep final price between 0 and subtotal
    const constrainedPrice = Math.max(0, Math.min(subtotal, price));
    const pct = ((subtotal - constrainedPrice) / subtotal) * 100;

    setDiscountPercent(pct);
    setCustomDiscountPercent(pct.toFixed(1));
  }


  async function fetchOrders() {
    try {
      setLoadingOrders(true);
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
      setLoadingOrders(false);
    }
  }

  async function fetchProducts() {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/products');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load products');
      }
      const data = (await res.json()) as Product[];
      setProducts(data);
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  function handleAddItem(e: React.MouseEvent) {
    e.preventDefault();
    if (!selectedProductId) return;
    const q = Math.max(1, Number(itemQuantity) || 1);

    setItems(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productId: selectedProductId,
        quantity: q,
      },
    ]);
    setItemQuantity('1');
  }

  function handleRemoveItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (detailedItems.length === 0) {
      setError('Please add at least one item to the order');
      return;
    }

    setSubmitting(true);

    try {
      const payloadItems = detailedItems.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: payloadItems,
          discountPercent,
          discountNote: discountPercent > 0 ? discountNote : undefined,
        }),
      });

      setCustomerName('');
      setCustomerPhone('');
      setItems([]);
      setDiscountPercent(0);
      setDiscountNote('');


      await fetchOrders();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl">
        <nav className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black">
            🍽️ Kitchen Orders
          </h1>
          <div className="flex gap-2 text-sm">
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

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-4 space-y-4 mb-6"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Customer name
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm text-black"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Customer phone
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm text-black"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          {/* Items builder */}
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Product
                </label>
                {loadingProducts && (
                  <p className="text-xs text-gray-600">Loading products...</p>
                )}
                {!loadingProducts && products.length === 0 && (
                  <p className="text-xs text-red-600">
                    No products yet. Add one on the Products page.
                  </p>
                )}
                {products.length > 0 && (
                  <select
                    className="w-full border rounded px-3 py-2 text-sm text-black"
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} – ₹{p.price.toFixed(0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="w-20">
                <label className="block text-sm font-medium mb-1 text-black">
                  Qty
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded px-2 py-2 text-sm text-black"
                  value={itemQuantity}
                  onChange={e => setItemQuantity(e.target.value)}
                />
              </div>

              <button
                onClick={handleAddItem}
                disabled={products.length === 0}
                className="h-10 px-3 rounded-lg bg-gray-800 text-white text-sm disabled:opacity-60"
              >
                Add
              </button>
            </div>

            {/* Current items list */}
            <div className="space-y-1 mt-2">
              {detailedItems.length === 0 && (
                <p className="text-xs text-gray-600">
                  No items added yet.
                </p>
              )}

              {detailedItems.map(item => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-xs bg-gray-50 border rounded px-2 py-1"
                >
                  <div>
                    <div className="font-medium">
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {item.quantity} × ₹{item.unitPrice.toFixed(0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ₹{item.lineTotal.toFixed(0)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-[11px] text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount controls + totals */}
            <div className="space-y-2 pt-2 border-t mt-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Discount</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  {[0, 5, 10, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSelectPresetDiscount(pct)}
                      className={
                        'px-2 py-1 rounded text-xs border ' +
                        (discountMode === 'preset' && discountPercent === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-black border-gray-300')
                      }
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleCustomClick}
                    disabled={subtotal <= 0}
                    className={
                      'px-2 py-1 rounded text-xs border ' +
                      (discountMode === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-black border-gray-300') +
                      (subtotal <= 0 ? ' opacity-50 cursor-not-allowed' : '')
                    }
                  >
                    Custom
                  </button>
                </div>
              </div>

              {discountMode === 'custom' && subtotal > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">
                      Custom discount %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className="w-full border rounded px-3 py-2 text-xs text-black"
                      value={customDiscountPercent}
                      onChange={e =>
                        handleCustomDiscountPercentChange(e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">
                      Custom final price (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-full border rounded px-3 py-2 text-xs text-black"
                      value={customFinalPrice}
                      onChange={e =>
                        handleCustomFinalPriceChange(e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {discountPercent > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">
                    Discount note (optional)
                  </label>
                  <input
                    className="w-full border rounded px-3 py-2 text-xs text-black"
                    value={discountNote}
                    onChange={e => setDiscountNote(e.target.value)}
                    placeholder="e.g. Friends & family, promo, issue compensation..."
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <div className="text-right">
                  {discountPercent > 0 && subtotal > 0 ? (
                    <>
                      <div className="text-xs text-red-600 line-through">
                        ₹{subtotal.toFixed(0)}
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        ₹{finalTotal.toFixed(0)}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Discount {discountPercent.toFixed(1).replace(/\.0$/, '')}%
                        {' '}(
                        ₹{discountAmount.toFixed(0)})
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-semibold text-black">
                      ₹{subtotal.toFixed(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              products.length === 0 ||
              detailedItems.length === 0
            }
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Adding...' : 'Add order'}
          </button>
        </form>

        {/* Recent orders summary below form */}
        <div className="space-y-2">
          {loadingOrders && (
            <p className="text-sm text-gray-700">Loading orders...</p>
          )}

          {!loadingOrders && orders.length === 0 && !error && (
            <p className="text-sm text-gray-700">
              No orders yet. Add your first order above.
            </p>
          )}

          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow p-3 flex justify-between items-center"
            >
              <div className="text-xs">
                <div className="font-semibold text-sm text-black">
                  {order.customerName}
                </div>
                <div className="text-xs text-gray-700">
                  {order.customerPhone}
                </div>
                <div className="mt-1 space-y-0.5">
                  {order.items.map(item => (
                    <div
                      key={item.id}
                      className="text-[11px] text-gray-600"
                    >
                      {item.quantity} × {item.product.name} (
                      ₹{item.unitPrice.toFixed(0)})
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-sm text-black">
                  ₹{order.amount.toFixed(0)}
                </div>
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
