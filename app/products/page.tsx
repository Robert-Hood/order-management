'use client';

import { useEffect, useState } from 'react';
import AppNav from '../../components/AppNav';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');

  const [modifierName, setModifierName] = useState('');
  const [modifierPrice, setModifierPrice] = useState('');
  const [modifierCost, setModifierCost] = useState('');

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingModifier, setSubmittingModifier] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [deletingModifierId, setDeletingModifierId] = useState<string | null>(null);

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function fetchProducts() {
    try {
      setLoadingProducts(true);
      setError(null);
      const res = await fetch('/api/products');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load products');
      }
      const data = (await res.json()) as Product[];
      setProducts(data);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchModifiers() {
    try {
      setLoadingModifiers(true);
      const res = await fetch('/api/modifiers');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load modifiers');
      }
      const data = (await res.json()) as Modifier[];
      setModifiers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModifiers(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchModifiers();
  }, []);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingProduct(true);
    setError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          cost: parseFloat(cost),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create product');
      }

      const newProduct = (await res.json()) as Product;
      setProducts(prev => [newProduct, ...prev]);
      setName('');
      setPrice('');
      setCost('');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to create product';
      setError(message);
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function handleCreateModifier(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingModifier(true);
    setError(null);

    try {
      const res = await fetch('/api/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modifierName,
          price: parseFloat(modifierPrice),
          cost: parseFloat(modifierCost),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create modifier');
      }

      const newModifier = (await res.json()) as Modifier;
      setModifiers(prev => [newModifier, ...prev]);
      setModifierName('');
      setModifierPrice('');
      setModifierCost('');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to create modifier';
      setError(message);
    } finally {
      setSubmittingModifier(false);
    }
  }

  async function handleToggleHasModifiers(product: Product) {
    try {
      setTogglingProductId(product.id);

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasModifiers: !product.hasModifiers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update product');
      }

      setProducts(prev =>
        prev.map(p =>
          p.id === product.id
            ? { ...p, hasModifiers: !p.hasModifiers }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to toggle toppings',
      );
    } finally {
      setTogglingProductId(null);
    }
  }

  async function handleDeleteModifier(modifier: Modifier) {
    if (!confirm(`Remove "${modifier.name}" topping?`)) return;

    try {
      setDeletingModifierId(modifier.id);
      const res = await fetch(`/api/modifiers/${modifier.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete modifier');
      }

      setModifiers(prev => prev.filter(m => m.id !== modifier.id));
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to delete modifier',
      );
    } finally {
      setDeletingModifierId(null);
    }
  }

  // Open edit modal for product
  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setEditingModifier(null);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditCost(product.cost.toString());
  }

  // Open edit modal for modifier
  function openEditModifier(modifier: Modifier) {
    setEditingModifier(modifier);
    setEditingProduct(null);
    setEditName(modifier.name);
    setEditPrice(modifier.price.toString());
    setEditCost(modifier.cost.toString());
  }

  // Close edit modal
  function closeEditModal() {
    setEditingProduct(null);
    setEditingModifier(null);
    setEditName('');
    setEditPrice('');
    setEditCost('');
  }

  // Save product edit
  async function handleSaveProductEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          price: parseFloat(editPrice),
          cost: parseFloat(editCost),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update product');
      }

      const updated = (await res.json()) as Product;
      setProducts(prev =>
        prev.map(p => (p.id === updated.id ? updated : p)),
      );
      closeEditModal();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  // Save modifier edit
  async function handleSaveModifierEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingModifier) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/modifiers/${editingModifier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          price: parseFloat(editPrice),
          cost: parseFloat(editCost),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update topping');
      }

      const updated = (await res.json()) as Modifier;
      setModifiers(prev =>
        prev.map(m => (m.id === updated.id ? updated : m)),
      );
      closeEditModal();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl space-y-6">
        <AppNav />

        {/* Page Title */}
        <h1 className="text-xl font-bold text-black flex items-center gap-2">
          <span>📦</span>
          <span>Products & Toppings</span>
        </h1>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* New product form */}
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Add product
          </h2>

          <form
            onSubmit={handleCreateProduct}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Product name
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm text-black"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Milk Chocolate Mousse"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Price (₹)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Cost (₹)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingProduct}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submittingProduct ? 'Adding...' : 'Add product'}
            </button>
          </form>
        </section>

        {/* Modifier management */}
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Toppings
          </h2>

          <form
            onSubmit={handleCreateModifier}
            className="space-y-2"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-black">
                Topping name
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm text-black"
                value={modifierName}
                onChange={e => setModifierName(e.target.value)}
                placeholder="e.g. Nuts, Caramel, Berries"
                required
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Price (₹)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={modifierPrice}
                  onChange={e => setModifierPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-black">
                  Cost (₹)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={modifierCost}
                  onChange={e => setModifierCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingModifier}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submittingModifier ? 'Adding topping...' : 'Add topping'}
            </button>
          </form>

          <div className="space-y-1 mt-3">
            {loadingModifiers && (
              <p className="text-xs text-gray-600">Loading toppings...</p>
            )}

            {!loadingModifiers && modifiers.length === 0 && (
              <p className="text-xs text-gray-600">
                No toppings yet. Add a few above and then enable them per product.
              </p>
            )}

            {modifiers.map(mod => (
              <div
                key={mod.id}
                className="flex justify-between items-center text-xs border rounded px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                onClick={() => openEditModifier(mod)}
              >
                <div>
                  <div className="font-medium text-black flex items-center gap-1">
                    {mod.name}
                    <span className="text-[10px] text-gray-400">✎</span>
                  </div>
                  <div className="text-[11px] text-gray-600">
                    ₹{mod.price.toFixed(0)} (cost ₹{mod.cost.toFixed(0)})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModifier(mod);
                  }}
                  disabled={deletingModifierId === mod.id}
                  className="text-[11px] text-red-600 hover:text-red-800"
                >
                  {deletingModifierId === mod.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Product list with toppings toggle */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Products
          </h2>

          {loadingProducts && (
            <p className="text-sm text-gray-700">Loading products...</p>
          )}

          {!loadingProducts && products.length === 0 && (
            <p className="text-sm text-gray-700">
              No products yet. Add your first product above.
            </p>
          )}

          {products.map(product => {
            const profit = product.price - product.cost;
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => openEditProduct(product)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="text-xs flex-1">
                    <div className="font-semibold text-sm text-black flex items-center gap-1">
                      {product.name}
                      <span className="text-[10px] text-gray-400">✎</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Added on{' '}
                      {new Date(product.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">
                      ₹{product.price.toFixed(0)} (cost ₹
                      {product.cost.toFixed(0)}, profit ₹
                      {profit.toFixed(0)})
                    </div>
                  </div>

                  <div 
                    className="text-right text-[11px] space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Toppings</span>
                      <button
                        type="button"
                        onClick={() => handleToggleHasModifiers(product)}
                        disabled={togglingProductId === product.id}
                        className={
                          'px-2 py-1 rounded-full border text-[11px] ' +
                          (product.hasModifiers
                            ? 'bg-green-100 text-green-700 border-green-500'
                            : 'bg-gray-100 text-gray-700 border-gray-300')
                        }
                      >
                        {togglingProductId === product.id
                          ? 'Saving...'
                          : product.hasModifiers
                          ? 'On'
                          : 'Off'}
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      When ON, toppings show in order screen.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => !savingEdit && closeEditModal()}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Edit Product
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Name
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-black"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-black"
                    value={editCost}
                    onChange={e => setEditCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Note:</strong> Price changes only affect future orders. Past orders keep their original prices.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modifier Modal */}
      {editingModifier && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => !savingEdit && closeEditModal()}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Edit Topping
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveModifierEdit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Name
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm text-black"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-black"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-black">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm text-black"
                    value={editCost}
                    onChange={e => setEditCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Note:</strong> Price changes only affect future orders. Past orders keep their original prices.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
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
