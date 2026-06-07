"use client";

import { useEffect, useState, useCallback } from "react";

interface HistoryEntry { id: string; amount: number; note: string | null; createdAt: string; createdBy: string | null; }
interface StockBatch {
  id: string; orderType: string; roundTime: string; doughType: string;
  qty: number; sold: number; available: number; history: HistoryEntry[];
}
interface TimeSlot { id: string; label: string; startTime: string; orderType: string; }

const DOUGH_TYPES = [
  { value: "PUMPKIN", label: "🟡 แป้งฟักทอง" },
  { value: "MOCHI", label: "⚪ แป้งโมจิ" },
];

export default function StockPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [addAmount, setAddAmount] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [stockRes, slotRes] = await Promise.all([
      fetch(`/api/stock?date=${selectedDate}`),
      fetch("/api/timeslots"),
    ]);
    if (stockRes.ok) setBatches(await stockRes.json());
    if (slotRes.ok) setTimeSlots(await slotRes.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const walkInSlots = timeSlots.filter((s) => s.orderType === "WALKIN").map((s) => s.startTime);
  const reserveSlots = timeSlots.filter((s) => s.orderType === "RESERVE").map((s) => s.startTime);

  function key(orderType: string, roundTime: string, doughType: string) {
    return `${orderType}|${roundTime}|${doughType}`;
  }
  function getBatch(orderType: string, roundTime: string, doughType: string) {
    return batches.find((b) => b.orderType === orderType && b.roundTime === roundTime && b.doughType === doughType);
  }

  async function saveStock(orderType: string, roundTime: string, doughType: string, mode: "set" | "add" | "reduce") {
    const k = key(orderType, roundTime, doughType);
    const amount = addAmount[k] ?? 0;
    if (amount <= 0) return;
    const batch = getBatch(orderType, roundTime, doughType);
    // ตรวจสต๊อกไม่ติดลบ
    if (mode === "reduce") {
      const newQty = (batch?.qty ?? 0) - amount;
      if (newQty < (batch?.sold ?? 0)) {
        alert(`ไม่สามารถลดได้ เพราะมีขายไปแล้ว ${batch?.sold ?? 0} ชิ้น`);
        return;
      }
    }
    setSaving((s) => ({ ...s, [k]: true }));
    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockDate: selectedDate, orderType, roundTime, doughType, amount: mode === "reduce" ? -amount : amount, mode: mode === "reduce" ? "add" : mode }),
    });
    setSaving((s) => ({ ...s, [k]: false }));
    setSaved((s) => ({ ...s, [k]: true }));
    setAddAmount((a) => { const n = { ...a }; delete n[k]; return n; });
    load();
    setTimeout(() => setSaved((s) => ({ ...s, [k]: false })), 2000);
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
                const k = key(orderType, roundTime, doughType);
                const batch = getBatch(orderType, roundTime, doughType);
                const curAdd = addAmount[k] ?? 0;
                const currentQty = batch?.qty ?? 0;
                const sold = batch?.sold ?? 0;
                const available = Math.max(0, currentQty - sold);
                const showHist = showHistory[k] ?? false;

                return (
                  <div key={doughType} className="space-y-2">
                    {/* ป้ายสรุป */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{label}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {saved[k] && <span className="text-green-600 font-medium">✓ บันทึกแล้ว</span>}
                        <span>สต๊อก {currentQty} · ขาย {sold} · <span className={available <= 0 ? "text-red-500 font-semibold" : available <= 5 ? "text-yellow-600 font-semibold" : "text-green-600 font-semibold"}>เหลือ {available}</span> ชิ้น</span>
                      </div>
                    </div>

                    {/* ปุ่มตั้งต้น (ถ้ายังไม่มีสต๊อก) หรือเติมสต๊อก */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddAmount((a) => ({ ...a, [k]: Math.max(0, curAdd - 1) }))}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-bold">−</button>
                      <input
                        type="number" min={0} value={curAdd}
                        onChange={(e) => setAddAmount((a) => ({ ...a, [k]: parseInt(e.target.value) || 0 }))}
                        className="w-16 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <button onClick={() => setAddAmount((a) => ({ ...a, [k]: curAdd + 1 }))}
                        className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold">+</button>
                      <span className="text-xs text-gray-400">ชิ้น</span>
                      <div className="ml-auto flex gap-1">
                        {currentQty === 0 ? (
                          <button onClick={() => saveStock(orderType, roundTime, doughType, "set")}
                            disabled={curAdd <= 0 || saving[k]}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold ${curAdd > 0 ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                            {saving[k] ? "..." : "ตั้งต้น"}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => saveStock(orderType, roundTime, doughType, "reduce")}
                              disabled={curAdd <= 0 || saving[k]}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold ${curAdd > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                              {saving[k] ? "..." : "− ลด"}
                            </button>
                            <button onClick={() => saveStock(orderType, roundTime, doughType, "add")}
                              disabled={curAdd <= 0 || saving[k]}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold ${curAdd > 0 ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                              {saving[k] ? "..." : "+ เติม"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ประวัติการเติม */}
                    {batch?.history && batch.history.length > 0 && (
                      <div>
                        <button onClick={() => setShowHistory((h) => ({ ...h, [k]: !showHist }))}
                          className="text-xs text-gray-400 underline">
                          {showHist ? "ซ่อน" : "ดู"} ประวัติ ({batch.history.length})
                        </button>
                        {showHist && (
                          <div className="mt-2 space-y-1 bg-gray-50 rounded-xl p-3">
                            {batch.history.map((h) => (
                              <div key={h.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  {new Date(h.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                  {h.createdBy ? ` · ${h.createdBy}` : ""}
                                </span>
                                <span className={`font-semibold ${h.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                                  {h.amount >= 0 ? `+${h.amount}` : h.amount} ชิ้น
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
        <input type="date" value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setAddAmount({}); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
