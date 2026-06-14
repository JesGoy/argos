'use client';

import { useState, useEffect, useRef, useActionState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethod, PAYMENT_METHOD } from '@/core/domain/constants/SaleConstants';
import { formatMoney } from '@/config/money';
import { processSaleAction, type FormState } from './actions';

interface CartItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface POSProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  sellingPrice: number;
}

interface POSInterfaceProps {
  products: POSProduct[];
  /** Org ISO 4217 currency for money display. */
  currency: string;
}

const initialState: FormState = {};

export function POSInterface({ products, currency }: POSInterfaceProps) {
  const router = useRouter();
  const money = (cents: number) => formatMoney(cents, currency);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CASH);
  const [notes, setNotes] = useState('');
  const [state, formAction, isPending] = useActionState(processSaleAction, initialState);
  const lastHandledResultRef = useRef<unknown>(null);

  // Resetting cart/search/notes in response to a server-action result is the
  // canonical useActionState pattern; the ref guards against re-firing for the
  // same result object across renders.
  useEffect(() => {
    if (state.success && state.result && lastHandledResultRef.current !== state.result) {
      lastHandledResultRef.current = state.result;
      /* eslint-disable react-hooks/set-state-in-effect */
      setCart([]);
      setSearchTerm('');
      setNotes('');
      /* eslint-enable react-hooks/set-state-in-effect */
      alert(`✅ Venta procesada exitosamente!\nNúmero: ${state.result?.saleNumber}\nTotal: ${formatMoney(state.result?.totalAmount ?? 0, currency)}`);
      router.refresh();
    }
  }, [state.success, state.result, router, currency]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: POSProduct) => {
    const existing = cart.find((item) => item.sku === product.sku);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (sku: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.sku === sku
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (sku: string) => {
    setCart(cart.filter((item) => item.sku !== sku));
  };

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('items', JSON.stringify(cart.map(item => ({ sku: item.sku, quantity: item.quantity }))));
    formData.set('paymentMethod', paymentMethod);
    formData.set('notes', notes);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Product Search & Selection */}
      <div className="lg:col-span-2 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Producto
          </label>
          <input
            id="search"
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {(state.error || state.fieldErrors) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {state.error}
            {state.fieldErrors && (
              <ul className="mt-1 list-disc list-inside text-sm">
                {Object.entries(state.fieldErrors).map(([field, errors]) =>
                  (errors as string[]).map((msg) => (
                    <li key={`${field}-${msg}`}>{field}: {msg}</li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 12).map((product) => {
              const outOfStock = product.currentStock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:border-gray-200"
                >
                  <h3 className="font-semibold text-sm truncate text-gray-900">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{money(product.sellingPrice)}</p>
                  <p className={`text-xs mt-1 ${outOfStock ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {outOfStock ? 'Sin stock' : `Stock: ${product.currentStock}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="bg-white rounded-lg shadow p-6 flex flex-col h-fit sticky top-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Carrito de Venta</h2>

        <div className="mb-6 space-y-2 max-h-96 overflow-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carrito vacío</p>
              <p className="text-xs text-gray-400 mt-1">Selecciona productos para agregar</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                  <p className="text-xs text-gray-600 mt-1">{money(item.unitPrice)} × {item.quantity} = {money(item.unitPrice * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.sku, -1)}
                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 font-semibold transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-900">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.sku, 1)}
                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 font-semibold transition-colors"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.sku)}
                    className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center justify-center ml-2 font-semibold transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-200 pt-4">
          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total a Pagar</span>
              <span className="text-2xl font-bold text-gray-900">{money(total)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={PAYMENT_METHOD.CASH}>Efectivo</option>
              <option value={PAYMENT_METHOD.CARD}>Tarjeta</option>
              <option value={PAYMENT_METHOD.TRANSFER}>Transferencia</option>
              <option value={PAYMENT_METHOD.MIXED}>Mixto</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Notas adicionales sobre la venta..."
            />
          </div>

          <button
            type="submit"
            disabled={cart.length === 0 || isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isPending ? 'Procesando...' : cart.length === 0 ? 'Carrito Vacío' : `Procesar Venta - ${money(total)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
