"use client";

import { useEffect, useState, useCallback } from "react";

interface StockItem {
  productId: string;
  name: string;
  produced: number;
  reserved: number;
  walkIn: number;
  available: number;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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

  function getEditing(productId: string, produced: number) {
    return editing[productId] !== undefined ? editing[productId] : produced;
  }

  async function saveStock(productId: string) {
    const produced = editing[productId];
    if (produced === undefined) return;
    setSaving((s) => ({ ...s, [productId]: true }));
    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, produced }),
    });
    setSaving((s) => ({ ...s, [productId]: false }));
    setSaved((s) => ({ ...s, [productId]: true }));
    setEditing((e) => { const n = { ...e }; delete n[productId]; return n; });
    loadStock();
    setTimeout(() => setSaved((s) => ({ ...s, [productId]: false })), 2000);
  }

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>;

  const totalProduced = stock.reduce((s, i) => s + i.produced, 0);
  const totalSold = stock.reduce((s, i) => s + i.reserved + i.walkIn, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">จัดการสต๊อก</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-orange-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{totalProduced}</p>
          <p className="text-xs text-orange-500 mt-0.5">ผลิตทั้งหมด</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{totalSold}</p>
          <p className="text-xs text-green-500 mt-0.5">ขายแล้ว</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{stock.reduce((s, i) => s + i.available, 0)}</p>
          <p className="text-xs text-blue-500 mt-0.5">คงเหลือ</p>
        </div>
      </div>

      {/* Stock List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="font-semibold text-gray-700">ตั้งจำนวนผลิต</p>
          <p className="text-xs text-gray-400 mt-0.5">รีเซ็ตทุกวันเช้า — กดบันทึกหลังแก้ไข</p>
        </div>
        <div className="divide-y divide-gray-50">
          {stock.map((item) => {
            const val = getEditing(item.productId, item.produced);
            const isDirty = editing[item.productId] !== undefined;

            return (
              <div key={item.productId} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {saved[item.productId] && (
                    <span className="text-xs text-green-600 font-medium">✓ บันทึกแล้ว</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => setEditing((e) => ({ ...e, [item.productId]: Math.max(0, val - 1) }))}
                      className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={val}
                      onChange={(e) => setEditing((ed) => ({ ...ed, [item.productId]: parseInt(e.target.value) || 0 }))}
                      className="w-16 text-center text-xl font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      onClick={() => setEditing((e) => ({ ...e, [item.productId]: val + 1 }))}
                      className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => saveStock(item.productId)}
                    disabled={!isDirty || saving[item.productId]}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isDirty ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {saving[item.productId] ? "..." : "บันทึก"}
                  </button>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span>จอง {item.reserved}</span>
                  <span>หน้าร้าน {item.walkIn}</span>
                  <span className={`font-medium ${item.available <= 0 ? "text-red-500" : item.available <= 5 ? "text-yellow-600" : "text-green-600"}`}>
                    เหลือ {item.available}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
