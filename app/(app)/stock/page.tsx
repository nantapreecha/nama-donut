"use client";

import { useEffect, useState, useCallback } from "react";
import { getTimeSlots } from "@/lib/dateUtils";

interface BatchKey { orderType: string; roundTime: string; doughType: string; }
interface StockBatch extends BatchKey { qty: number; sold: number; available: number; }

const DOUGH_TYPES = [
  { value: "PUMPKIN", label: "🟡 แป้งฟักทอง" },
  { value: "MOCHI", label: "⚪ แป้งโมจิ" },
];

export default function StockPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/stock?date=${selectedDate}`);
    if (res.ok) setBatches(await res.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const date = new Date(selectedDate + "T00:00:00");
  const walkInSlots = getTimeSlots(date, "WALKIN");
  const reserveSlots = getTimeSlots(date, "RESERVE");

  function batchKey(orderType: string, roundTime: string, doughType: string) {
    return `${orderType}|${roundTime}|${doughType}`;
  }

  function getBatch(orderType: string, roundTime: string, doughType: string): StockBatch | undefined {
    return batches.find((b) => b.orderType === orderType && b.roundTime === roundTime && b.doughType === doughType);
  }

  function getQty(orderType: string, roundTime: string, doughType: string): number {
    const key = batchKey(orderType, roundTime, doughType);
    if (editing[key] !== undefined) return editing[key];
    return getBatch(orderType, roundTime, doughType)?.qty ?? 0;
  }

  function setEdit(orderType: string, roundTime: string, doughType: string, val: number) {
    setEditing((e) => ({ ...e, [batchKey(orderType, roundTime, doughType)]: Math.max(0, val) }));
  }

  async function save(orderType: string, roundTime: string, doughType: string) {
    const key = batchKey(orderType, roundTime, doughType);
    const qty = editing[key];
    if (qty === undefined) return;
    setSaving((s) => ({ ...s, [key]: true }));
    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockDate: selectedDate, orderType, roundTime, doughType, qty }),
    });
    setSaving((s) => ({ ...s, [key]: false }));
    setSaved((s) => ({ ...s, [key]: true }));
    setEditing((e) => { const n = { ...e }; delete n[key]; return n; });
    load();
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
  }

  const displayDate = date.toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  function renderSlotGroup(orderType: "WALKIN" | "RESERVE", slots: string[]) {
    const isWalkIn = orderType === "WALKIN";
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className={`px-4 py-3 border-b ${isWalkIn ? "bg-orange-50 border-orange-50" : "bg-blue-50 border-blue-50"}`}>
          <h2 className={`font-semibold ${isWalkIn ? "text-orange-700" : "text-blue-700"}`}>
            {isWalkIn ? "🟠 หน้าร้าน" : "🔵 จอง"}
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {slots.map((roundTime) => (
            <div key={roundTime} className="px-4 py-3 space-y-3">
              <p className="font-medium text-gray-700">รอบ {roundTime}</p>
              {DOUGH_TYPES.map(({ value: doughType, label }) => {
                const key = batchKey(orderType, roundTime, doughType);
                const qty = getQty(orderType, roundTime, doughType);
                const batch = getBatch(orderType, roundTime, doughType);
                const isDirty = editing[key] !== undefined;
                return (
                  <div key={doughType}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-600">{label}</p>
                      <div className="flex items-center gap-2">
                        {saved[key] && <span className="text-xs text-green-600">✓ บันทึกแล้ว</span>}
                        {batch && <span className="text-xs text-gray-400">ขายแล้ว {batch.sold} ชิ้น</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEdit(orderType, roundTime, doughType, qty - 1)}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold"
                      >−</button>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setEdit(orderType, roundTime, doughType, parseInt(e.target.value) || 0)}
                        className="w-16 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <button
                        onClick={() => setEdit(orderType, roundTime, doughType, qty + 1)}
                        className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold"
                      >+</button>
                      <span className="text-xs text-gray-400">ชิ้น</span>
                      <button
                        onClick={() => save(orderType, roundTime, doughType)}
                        disabled={!isDirty || saving[key]}
                        className={`ml-auto px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isDirty ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}
                      >
                        {saving[key] ? "..." : "บันทึก"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">จัดการสต๊อก</h1>
          <p className="text-sm text-gray-500">{displayDate}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setEditing({}); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">กำลังโหลด...</div>
      ) : (
        <>
          {renderSlotGroup("WALKIN", walkInSlots)}
          {renderSlotGroup("RESERVE", reserveSlots)}
        </>
      )}
    </div>
  );
}
