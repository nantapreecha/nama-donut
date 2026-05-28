"use client";

import { useEffect, useState, useCallback } from "react";

interface StockItem {
  productId: string;
  name: string;
  available: number;
  produced: number;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
}

export default function POSPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadStock = useCallback(async () => {
    const res = await fetch("/api/stock");
    if (res.ok) setStock(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStock();
    const interval = setInterval(loadStock, 5000);
    return () => clearInterval(interval);
  }, [loadStock]);

  function addToCart(item: StockItem) {
    if (item.available <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.productId);
      if (existing) {
        if (existing.quantity >= item.available) return prev;
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { productId: item.productId, name: item.name, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) =>
      prev
        .map((c) => (c.productId === productId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  }

  function clearCart() {
    setCart([]);
  }

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  async function sell() {
    if (cart.length === 0) return;
    setSelling(true);
    const res = await fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
    setSelling(false);
    if (res.ok) {
      setCart([]);
      setMessage({ text: `ขายสำเร็จ ${totalItems} ชิ้น`, type: "success" });
      loadStock();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "เกิดข้อผิดพลาด", type: "error" });
    }
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>;
  }

  const activeProducts = stock.filter((s) => s.produced > 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">ขายหน้าร้าน</h1>

      {message && (
        <div className={`rounded-2xl px-4 py-3 text-center font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Product Grid */}
      {activeProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p>ยังไม่มีสต๊อกวันนี้</p>
          <p className="text-sm mt-1">ไปตั้งสต๊อกที่หน้าสต๊อกก่อนนะ</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {activeProducts.map((item) => {
            const cartItem = cart.find((c) => c.productId === item.productId);
            const qty = cartItem?.quantity ?? 0;
            const sold = item.available === 0 && item.produced > 0;

            return (
              <button
                key={item.productId}
                onClick={() => addToCart(item)}
                disabled={item.available <= 0}
                className={`relative bg-white rounded-2xl p-4 text-left shadow-sm border-2 transition-all active:scale-95 ${
                  qty > 0 ? "border-orange-400" : "border-transparent"
                } ${item.available <= 0 ? "opacity-50" : ""}`}
              >
                <p className="font-semibold text-gray-800 text-base">{item.name}</p>
                <p className={`text-sm mt-1 ${
                  sold ? "text-red-500" : item.available <= 5 ? "text-yellow-600" : "text-green-600"
                }`}>
                  {sold ? "หมด" : item.available <= 5 ? `เหลือ ${item.available}` : `เหลือ ${item.available}`}
                </p>
                {qty > 0 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {qty}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">ตะกร้า</h2>
            <button onClick={clearCart} className="text-sm text-red-400">ล้าง</button>
          </div>
          <div className="divide-y divide-gray-50">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center px-4 py-3">
                <span className="flex-1 font-medium text-gray-800">{item.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => {
                      const s = stock.find((s) => s.productId === item.productId);
                      if (s) addToCart(s);
                    }}
                    className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3">
            <button
              onClick={sell}
              disabled={selling}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl py-4 text-lg transition-colors"
            >
              {selling ? "กำลังบันทึก..." : `ขาย ${totalItems} ชิ้น ✓`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
