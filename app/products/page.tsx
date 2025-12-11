'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  const [togglingProductId, setTogglingProductId] = useState<string | null>(
    null,
  );
  const [deletingModifierId, setDeletingModifierId] = useState<string | null>(
    null,
  );

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

      // hasModifiers might be missing for very old rows; default to false
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
      // keep it silent in UI for now
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
          price: Number(price) || 0,
          cost: Number(cost) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create product');
      }

      setName('');
      setPrice('');
      setCost('');
      await fetchProducts();
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
    try {
      const res = await fetch('/api/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modifierName,
          price: Number(modifierPrice) || 0,
          cost: Number(modifierCost) || 0,
          type: 'topping',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create modifier');
      }

      setModifierName('');
      setModifierPrice('');
      setModifierCost('');

      await fetchModifiers();
    } catch (err) {
      console.error(err);
      // optional: show error somewhere if you want
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

      const updated = (await res.json()) as Product;

      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, hasModifiers: updated.hasModifiers } : p)),
      );
    } catch (err) {
      console.error(err);
      // simple alert for now
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to toggle toppings for product',
      );
    } finally {
      setTogglingProductId(null);
    }
  }

  async function handleDeleteModifier(modifier: Modifier) {
    if (!confirm(`Remove "${modifier.name}"? Existing orders stay unchanged.`))
      return;

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

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl space-y-6">
        {/* Nav */}
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📦 Products & Toppings</h1>
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
              href="/customers"
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
            >
              Customers
            </Link>
          </div>
        </nav>

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
                className="flex justify-between items-center text-xs border rounded px-2 py-1"
              >
                <div>
                  <div className="font-medium text-black">
                    {mod.name}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    ₹{mod.price.toFixed(0)} (cost ₹{mod.cost.toFixed(0)})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteModifier(mod)}
                  disabled={deletingModifierId === mod.id}
                  className="text-[11px] text-red-600"
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
                className="bg-white rounded-lg shadow p-3 flex justify-between items-center gap-3"
              >
                <div className="text-xs">
                  <div className="font-semibold text-sm text-black">
                    {product.name}
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

                <div className="text-right text-[11px] space-y-1">
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
                    When ON, toppings will show for this product in the order screen.
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}