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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProducts() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const priceNumber = Number(price) || 0;
      const costNumber = Number(cost) || 0;

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: priceNumber,
          cost: costNumber,
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
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 text-black">
      <div className="w-full max-w-xl">
        {/* Simple mobile-friendly nav */}
        <nav className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">📦 Products</h1>
          <div className="flex gap-2 text-sm">
            <Link
              href="/"
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white"
            >
              Orders
            </Link>
          </div>
        </nav>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-4 space-y-3 mb-6"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-black">
              Product name
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm text-black"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Choco-Hazelnut Cake"
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
                placeholder="e.g. 280"
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
                placeholder="e.g. 160"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Adding...' : 'Add product'}
          </button>
        </form>

        <div className="space-y-2">
          {loading && (
            <p className="text-sm text-gray-700">Loading products...</p>
          )}

          {!loading && products.length === 0 && !error && (
            <p className="text-sm text-gray-700">
              No products yet. Add your first product above.
            </p>
          )}

          {products.map(product => {
            const profit = product.price - product.cost;
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-sm text-black">
                    {product.name}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Added on{' '}
                    {new Date(product.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-black font-semibold">
                    ₹{product.price.toFixed(0)}
                  </div>
                  <div className="text-gray-600">
                    Cost: ₹{product.cost.toFixed(0)}
                  </div>
                  <div className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Profit: ₹{profit.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
