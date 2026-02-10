'use client';

import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethod, PAYMENT_METHOD } from '@/core/domain/constants/SaleConstants';
import { processSaleAction, type FormState } from './actions';

interface CartItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface POSInterfaceProps {
  products: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    currentStock: number;
  }>;
}

const initialState: FormState = {};

export function POSInterface({ products }: POSInterfaceProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHOD.CASH);
  const [notes, setNotes] = useState('');
  const [state, formAction] = useActionState(processSaleAction, initialState);

  // Handle successful sale
  useEffect(() => {
    if (state.success) {
      setCart([]);
      setSearchTerm('');
      setNotes('');
      alert(`✅ Venta procesada exitosamente!\nNúmero: ${state.result?.saleNumber}\nTotal: $${state.result?.totalAmount}`);
      router.refresh();
    }
  }, [state.success, state.result, router]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: typeof products[0]) => {
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
          unitPrice: 10, // TODO: Agregar precio real al producto
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
    formAction(formData);
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

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {state.error}
          </div>
        )}

        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 12).map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-all"
              >
                <h3 className="font-semibold text-sm truncate text-gray-900">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
                <p className="text-xs text-gray-500 mt-1">Stock: {product.currentStock}</p>
              </button>
            ))}
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
                  <p className="text-xs text-gray-600 mt-1">${item.unitPrice} × {item.quantity} = ${(item.unitPrice * item.quantity).toFixed(2)}</p>
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
              <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
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
            disabled={cart.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {cart.length === 0 ? 'Carrito Vacío' : `Procesar Venta - $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
