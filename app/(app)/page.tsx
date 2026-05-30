"use client";

import { useEffect, useState, useCallback } from "react";

interface SlotSummary {
  orderType: string;
  roundTime: string;
  pumpkin: { qty: number; sold: number };
  mochi: { qty: number; sold: number };
}

interface DashboardData {
  totalSold: number;
  pendingOrdersCount: number;
  stockSummary: SlotSummary[];
  date: string;
}

function availableColor(available: number, qty: number) {
  if (qty === 0) return "text-gray-400";
  if (available === 0) return "text-red-500";
  if (available <= 5) return "text-yellow-600";
  return "text-green-600";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard?date=${selectedDate}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const walkInSlots = data?.stockSummary.filter((s) => s.orderType === "WALKIN") ?? [];
  const reserveSlots = data?.stockSummary.filter((s) => s.orderType === "RESERVE") ?? [];

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">สต๊อกคงเหลือ</h1>
          <p className="text-sm text-gray-500">{displayDate}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-sm text-orange-600 font-medium">ขายวันนี้</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{data?.totalSold ?? 0}</p>
          <p className="text-xs text-orange-500">ชิ้น</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-sm text-blue-600 font-medium">ออเดอร์รอรับ</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{data?.pendingOrdersCount ?? 0}</p>
          <p className="text-xs text-blue-500">รายการ</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">กำลังโหลด...</div>
      ) : data?.stockSummary.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p>ยังไม่มีสต๊อกวันนี้</p>
          <p className="text-sm mt-1">ไปเติมสต๊อกที่หน้าสต๊อกก่อนนะ</p>
        </div>
      ) : (
        <>
          {/* Walk-in */}
          {walkInSlots.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-50 bg-orange-50">
                <h2 className="font-semibold text-orange-700">🟠 หน้าร้าน</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {walkInSlots.map((slot) => (
                  <div key={slot.roundTime} className="px-4 py-3">
                    <p className="font-medium text-gray-700 mb-2">รอบ {slot.roundTime}</p>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">🟡 แป้งฟักทอง</p>
                        <p className={`text-lg font-bold ${availableColor(slot.pumpkin.qty - slot.pumpkin.sold, slot.pumpkin.qty)}`}>
                          {slot.pumpkin.qty === 0 ? "—" : `เหลือ ${Math.max(0, slot.pumpkin.qty - slot.pumpkin.sold)}`}
                          {slot.pumpkin.qty > 0 && <span className="text-xs font-normal text-gray-400"> /{slot.pumpkin.qty} ชิ้น</span>}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">⚪ แป้งโมจิ</p>
                        <p className={`text-lg font-bold ${availableColor(slot.mochi.qty - slot.mochi.sold, slot.mochi.qty)}`}>
                          {slot.mochi.qty === 0 ? "—" : `เหลือ ${Math.max(0, slot.mochi.qty - slot.mochi.sold)}`}
                          {slot.mochi.qty > 0 && <span className="text-xs font-normal text-gray-400"> /{slot.mochi.qty} ชิ้น</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reserve */}
          {reserveSlots.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-50 bg-blue-50">
                <h2 className="font-semibold text-blue-700">🔵 จอง</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {reserveSlots.map((slot) => (
                  <div key={slot.roundTime} className="px-4 py-3">
                    <p className="font-medium text-gray-700 mb-2">รอบ {slot.roundTime}</p>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">🟡 แป้งฟักทอง</p>
                        <p className={`text-lg font-bold ${availableColor(slot.pumpkin.qty - slot.pumpkin.sold, slot.pumpkin.qty)}`}>
                          {slot.pumpkin.qty === 0 ? "—" : `เหลือ ${Math.max(0, slot.pumpkin.qty - slot.pumpkin.sold)}`}
                          {slot.pumpkin.qty > 0 && <span className="text-xs font-normal text-gray-400"> /{slot.pumpkin.qty} ชิ้น</span>}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">⚪ แป้งโมจิ</p>
                        <p className={`text-lg font-bold ${availableColor(slot.mochi.qty - slot.mochi.sold, slot.mochi.qty)}`}>
                          {slot.mochi.qty === 0 ? "—" : `เหลือ ${Math.max(0, slot.mochi.qty - slot.mochi.sold)}`}
                          {slot.mochi.qty > 0 && <span className="text-xs font-normal text-gray-400"> /{slot.mochi.qty} ชิ้น</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
