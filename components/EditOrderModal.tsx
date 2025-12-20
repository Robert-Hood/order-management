'use client';

import { useState, useEffect } from 'react';

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

type LocalItem = {
  id: number;
  productId: string;
  quantity: number;
  modifierIds: string[];
};

type EditOrderModalProps = {
  order: Order;
  onClose: () => void;
  onSaved: (updatedOrder: Order) => void;
};

export default function EditOrderModal({ order, onClose, onSaved }: EditOrderModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Customer fields
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);

  // Discount fields
  const [discountPercent, setDiscountPercent] = useState(order.discountPercent);
  const [discountNote, setDiscountNote] = useState(order.discountNote || '');
  const [discountMode, setDiscountMode] = useState<'preset' | 'custom'>(
    [0, 5, 10, 20].includes(order.discountPercent) ? 'preset' : 'custom'
  );
  const [customDiscountPercent, setCustomDiscountPercent] = useState(
    order.discountPercent.toString()
  );

  // New items to add
  const [newItems, setNewItems] = useState<LocalItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products and modifiers
  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, modifiersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/modifiers'),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
          if (productsData.length > 0) {
            setSelectedProductId(productsData[0].id);
          }
        }

        if (modifiersRes.ok) {
          const modifiersData = await modifiersRes.json();
          setModifiers(modifiersData);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Reset modifiers when product changes
  useEffect(() => {
    setSelectedModifierIds([]);
  }, [selectedProductId]);

  // Calculate existing items total
  const existingItemsTotal = order.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  // Calculate new items with details
  const detailedNewItems = newItems
    .map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;

      const appliedModifiers = item.modifierIds
        .map(id => modifiers.find(m => m.id === id))
        .filter((m): m is Modifier => !!m);

      const toppingsPerUnit = appliedModifiers.reduce((sum, m) => sum + m.price, 0);
      const unitPrice = product.price + toppingsPerUnit;
      const lineTotal = unitPrice * item.quantity;

      return { ...item, product, unitPrice, lineTotal, appliedModifiers };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const newItemsTotal = detailedNewItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = existingItemsTotal + newItemsTotal;
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount;

  function toggleModifier(modifierId: string) {
    setSelectedModifierIds(prev =>
      prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  }

  function handleAddItem(e: React.MouseEvent) {
    e.preventDefault();
    if (!selectedProductId) return;

    const q = Math.max(1, Number(itemQuantity) || 1);

    setNewItems(prev => [
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

  function handleRemoveNewItem(id: number) {
    setNewItems(prev => prev.filter(i => i.id !== id));
  }

  function handleSelectPresetDiscount(pct: number) {
    setDiscountMode('preset');
    setDiscountPercent(pct);
  }

  function handleCustomClick() {
    setDiscountMode('custom');
    setCustomDiscountPercent(discountPercent.toString());
  }

  function handleCustomDiscountChange(value: string) {
    setDiscountMode('custom');
    setCustomDiscountPercent(value);

    const raw = Number(value);
    if (!Number.isFinite(raw)) {
      setDiscountPercent(0);
      return;
    }

    const pct = Math.max(0, Math.min(100, raw));
    setDiscountPercent(pct);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: {
        customerName: string;
        customerPhone: string;
        discountPercent: number;
        discountNote: string;
        newItems?: { productId: string; quantity: number; modifierIds: string[] }[];
      } = {
        customerName,
        customerPhone,
        discountPercent,
        discountNote: discountPercent > 0 ? discountNote : '',
      };

      if (newItems.length > 0) {
        payload.newItems = newItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          modifierIds: item.modifierIds,
        }));
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to update order');
        return;
      }

      onSaved(data);
    } catch (err) {
      console.error('Failed to save order:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function formatDiscountPercent(percent: number): string {
    return percent.toFixed(2).replace(/\.?0+$/, '');
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Edit Order</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Customer Info</h4>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Name</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm text-black"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Phone</label>
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
                maxLength={10}
              />
              {customerPhone.length > 0 && customerPhone.length < 10 && (
                <p className="text-xs text-red-600 mt-1">
                  Phone must be 10 digits
                </p>
              )}
            </div>
          </div>

          {/* Existing Items (read-only) */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Current Items</h4>
            <div className="bg-gray-50 rounded-lg p-2 space-y-1">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-gray-700">
                    {item.quantity} × {item.product.name}
                    {item.modifiers.length > 0 && (
                      <span className="text-gray-500">
                        {' '}({item.modifiers.map(m => m.nameAtTime).join(', ')})
                      </span>
                    )}
                  </span>
                  <span className="text-gray-600 font-medium">₹{item.lineTotal.toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal (existing)</span>
                <span>₹{existingItemsTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Add New Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Add Items</h4>
            
            {loadingData ? (
              <p className="text-xs text-gray-500">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-xs text-gray-500">No products available</p>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <select
                      className="w-full border rounded px-2 py-1.5 text-sm text-black"
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} – ₹{p.price.toFixed(0)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min={1}
                      className="w-full border rounded px-2 py-1.5 text-sm text-black"
                      value={itemQuantity}
                      onChange={e => setItemQuantity(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="h-[34px] px-3 rounded bg-blue-600 text-white text-sm"
                  >
                    Add
                  </button>
                </div>

                {/* Modifiers for selected product */}
                {(() => {
                  const product = products.find(p => p.id === selectedProductId);
                  if (!product?.hasModifiers || modifiers.length === 0) return null;

                  return (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {modifiers.map(mod => {
                        const selected = selectedModifierIds.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModifier(mod.id)}
                            className={`px-2 py-1 rounded-full text-xs border ${
                              selected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-black border-gray-300'
                            }`}
                          >
                            {mod.name} +₹{mod.price.toFixed(0)}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}

            {/* New items list */}
            {detailedNewItems.length > 0 && (
              <div className="bg-green-50 rounded-lg p-2 space-y-1 mt-2">
                <div className="text-xs font-medium text-green-700 mb-1">New items to add:</div>
                {detailedNewItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-700">
                      {item.quantity} × {item.product.name}
                      {item.appliedModifiers.length > 0 && (
                        <span className="text-gray-500">
                          {' '}({item.appliedModifiers.map(m => m.name).join(', ')})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium">₹{item.lineTotal.toFixed(0)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-green-200 pt-1 mt-1 flex justify-between text-xs font-medium text-green-700">
                  <span>Subtotal (new)</span>
                  <span>₹{newItemsTotal.toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Discount</h4>
            <div className="flex gap-2 flex-wrap">
              {[0, 5, 10, 20].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSelectPresetDiscount(pct)}
                  className={`px-2 py-1 rounded text-xs border ${
                    discountMode === 'preset' && discountPercent === pct
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-black border-gray-300'
                  }`}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomClick}
                className={`px-2 py-1 rounded text-xs border ${
                  discountMode === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-black border-gray-300'
                }`}
              >
                Custom
              </button>
            </div>

            {discountMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="w-20 border rounded px-2 py-1.5 text-sm text-black"
                  value={customDiscountPercent}
                  onChange={e => handleCustomDiscountChange(e.target.value)}
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            )}

            {discountPercent > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">
                  Discount note (optional)
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={discountNote}
                  onChange={e => setDiscountNote(e.target.value)}
                  placeholder="e.g. Friends & family, promo..."
                />
              </div>
            )}
          </div>

          {/* Total Preview */}
          <div className="bg-gray-100 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-black">₹{subtotal.toFixed(0)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600">
                  Discount ({formatDiscountPercent(discountPercent)}%)
                </span>
                <span className="text-red-600">-₹{discountAmount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t pt-1">
              <span>Total</span>
              <span className="text-green-600">₹{finalTotal.toFixed(0)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !customerName.trim() || (customerPhone.length > 0 && customerPhone.length !== 10)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

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
    </div>
  );
}