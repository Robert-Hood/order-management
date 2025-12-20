'use client';

import { useEffect, useState } from 'react';
import AppNav from '../components/AppNav';
import EditOrderModal from '../components/EditOrderModal';

type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  isActive: boolean;
  hasModifiers: boolean;
  createdAt: string;
};

type Modifier = {
  id: string;
  name: string;
  price: number;
  cost: number;
  type: string;
  isActive: boolean;
  createdAt: string;
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
  amount: number; // final total
  subtotal: number; // before discount
  discountPercent: number;
  discountAmount: number;
  discountNote?: string | null;
  createdAt: string;
  items: OrderItem[];
};

type LocalItem = {
  id: number; // local temporary id for UI
  productId: string;
  quantity: number;
  modifierIds: string[];
};

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [visibleOrderCount, setVisibleOrderCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [items, setItems] = useState<LocalItem[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState('');

  const [discountMode, setDiscountMode] = useState<'preset' | 'custom'>(
    'preset',
  );
  const [customDiscountPercent, setCustomDiscountPercent] =
    useState<string>('0');
  const [customFinalPrice, setCustomFinalPrice] = useState<string>('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Build detailed view of items with product info, toppings, & line totals
  const detailedItems = items
    .map(i => {
      const product = products.find(p => p.id === i.productId);
      if (!product) return null;

      const appliedModifiers = i.modifierIds
        .map(id => modifiers.find(m => m.id === id))
        .filter((m): m is Modifier => !!m);

      const toppingsPerUnit = appliedModifiers.reduce(
        (sum, m) => sum + m.price,
        0,
      );

      const unitPrice = product.price + toppingsPerUnit;
      const lineTotal = unitPrice * i.quantity;

      return { ...i, product, unitPrice, lineTotal, appliedModifiers };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const subtotal = detailedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount;

  function handleSelectPresetDiscount(pct: number) {
    setDiscountMode('preset');
    setDiscountPercent(pct);
  }

  function handleCustomClick() {
    setDiscountMode('custom');
    // start with 0% discount and full price
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

  function toggleModifierForCurrent(modifierId: string) {
    setSelectedModifierIds(prev =>
      prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId],
    );
  }

  async function fetchOrders(limit: number = 10, isLoadingMore: boolean = false) {
    try {
      // Only show top loading indicator for initial load, not for "show more"
      if (!isLoadingMore) {
        setLoadingOrders(true);
      }
      setError(null);

      // Fetch one extra to check if there are more
      const res = await fetch(`/api/orders?limit=${limit + 1}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load orders');
      }

      const data = await res.json();
      const fetchedOrders = data.orders as Order[];
      const totalCount = data.totalCount as number;
      
      // Check if there are more orders than requested
      if (fetchedOrders.length > limit) {
        setHasMoreOrders(true);
        setOrders(fetchedOrders.slice(0, limit));
      } else {
        setHasMoreOrders(totalCount > fetchedOrders.length);
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
    } finally {
      if (!isLoadingMore) {
        setLoadingOrders(false);
      }
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

  async function fetchModifiers() {
    try {
      const res = await fetch('/api/modifiers');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load modifiers');
      }
      const data = (await res.json()) as Modifier[];
      setModifiers(data);
    } catch (err) {
      console.error(err);
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

  function handleOrderUpdated(updatedOrder: Order) {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditingOrder(null);
  }

  useEffect(() => {
    fetchOrders(visibleOrderCount);
    fetchProducts();
    fetchModifiers();
  }, []);

  // reset current toppings when product changes
  useEffect(() => {
    setSelectedModifierIds([]);
  }, [selectedProductId]);

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
        modifierIds: selectedModifierIds,
      },
    ]);
    setItemQuantity('1');
    setSelectedModifierIds([]);
  }

  function handleRemoveItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleShowMore() {
    const newCount = visibleOrderCount + 10;
    setVisibleOrderCount(newCount);
    setLoadingMore(true);
    await fetchOrders(newCount, true);
    setLoadingMore(false);
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
        modifierIds: i.modifierIds,
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create order');
      }

      setCustomerName('');
      setCustomerPhone('');
      setItems([]);
      setDiscountPercent(0);
      setDiscountNote('');
      setDiscountMode('preset');
      setCustomDiscountPercent('0');
      setCustomFinalPrice('');

      await fetchOrders(visibleOrderCount);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Helper to format discount percentage for display (rounded to 2 decimal places, trailing zeros removed)
  function formatDiscountPercent(percent: number): string {
    return percent.toFixed(2).replace(/\.?0+$/, '');
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl">
        <AppNav />

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
              type="tel"
              className="w-full border rounded px-3 py-2 text-sm text-black"
              value={customerPhone}
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 10) {
                  setCustomerPhone(value);
                }
              }}
              placeholder="e.g. 9876543210"
              pattern="[0-9]{10}"
              maxLength={10}
              // required
            />
            {customerPhone.length > 0 && customerPhone.length < 10 && (
              <p className="text-xs text-red-600 mt-1">
                Phone number must be exactly 10 digits
              </p>
            )}
          </div>

          {/* Items builder */}
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Product
                </label>
                {loadingProducts && (
                  <p className="text-xs text-gray-600">
                    Loading products...
                  </p>
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
                className="h-10 px-3 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
              >
                Add
              </button>
            </div>

            {/* Toppings chips for current selection */}
            {(() => {
              const product = products.find(p => p.id === selectedProductId);
              const showToppings =
                product && product.hasModifiers && modifiers.length > 0;

              if (!showToppings) return null;

              return (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium text-black">
                    Toppings:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modifiers.map(mod => {
                      const selected = selectedModifierIds.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModifierForCurrent(mod.id)}
                          className={
                            'px-2 py-1 rounded-full text-xs border ' +
                            (selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-black border-gray-300')
                          }
                        >
                          {mod.name} +₹{mod.price.toFixed(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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
                    {item.appliedModifiers.length > 0 ? (
                      <div className="text-[11px] text-gray-600">
                        {item.quantity} × ₹{item.product.price.toFixed(0)}
                        {item.appliedModifiers.map(m => (
                          <span key={m.id}> + ₹{m.price.toFixed(0)} {m.name}</span>
                        ))}
                        {' '}= ₹{item.unitPrice.toFixed(0)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-600">
                        {item.quantity} × ₹{item.unitPrice.toFixed(0)}
                      </div>
                    )}
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
                        Discount {formatDiscountPercent(discountPercent)}
                        % (₹{discountAmount.toFixed(0)})
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
              className="bg-white rounded-lg shadow p-3 relative overflow-visible cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setEditingOrder(order)}
            >
              {/* Delete button - overlapping top right corner */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModal({ open: true, order });
                }}
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

              <div className="flex justify-between items-center">
                <div className="text-xs">
                  <div className="font-semibold text-sm text-black flex items-center gap-1">
                    {order.customerName}
                    <span className="text-[10px] text-gray-400">✎</span>
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
                            [ ₹{item.unitPrice.toFixed(0)} each
                            {item.modifiers.length > 0 ? (
                              <>
                                {' '}
                                = ₹{basePriceAtTime.toFixed(0)} base
                                {item.modifiers.map(m => (
                                  <span key={m.id}>
                                    {' '}
                                    + ₹{m.priceAtTime.toFixed(0)} {m.nameAtTime} ]
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
                        -{formatDiscountPercent(order.discountPercent)}% (₹
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

          {/* Show more button */}
          {hasMoreOrders && !loadingOrders && (
            <button
              type="button"
              onClick={handleShowMore}
              disabled={loadingMore}
              className="w-full py-2 px-4 rounded-lg border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading more...
                </span>
              ) : (
                'Show more orders'
              )}
            </button>
          )}
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={handleOrderUpdated}
        />
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