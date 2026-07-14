"use client";

import { useEffect, useState, useCallback } from "react";

interface Order {
  id: string;
  customer: { name: string; phone: string };
  orderType: string;
  roundTime: string | null;
  pumpkinQty: number;
  mochiQty: number;
  channel: string;
  isPaid: boolean;
  status: string;
  note: string | null;
}

interface SlotSummary {
  roundTime: string;
  pumpkin: { qty: number; sold: number };
  mochi: { qty: number; sold: number };
}

interface DashboardData {
  totalSold: number;
  pendingOrdersCount: number;
  stockSummary: SlotSummary[];
  orders: Order[];
  date: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook", LINE: "LINE", PHONE: "โทรศัพท์", WALK_IN: "หน้าร้าน", OTHER: "อื่นๆ",
};

function availableColor(available: number, qty: number) {
  if (qty === 0) return "text-gray-300";
  if (available === 0) return "text-red-500";
  if (available <= 5) return "text-yellow-600";
  return "text-green-600";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toggling, setToggling] = useState<string | null>(null);

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

  async function toggleStatus(order: Order) {
    const next = order.status === "PENDING" ? "COMPLETED" : "PENDING";
    setToggling(order.id);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setToggling(null);
    load();
  }

  async function togglePaid(orderId: string, isPaid: boolean) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !isPaid }),
    });
    load();
  }

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // รวม slot จาก stock + orders เรียงตาม roundTime
  const allRoundTimes = Array.from(new Set([
    ...(data?.stockSummary.map((s) => s.roundTime) ?? []),
    ...(data?.orders.map((o) => o.roundTime).filter(Boolean) as string[] ?? []),
  ])).sort();

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">หน้าหลัก</h1>
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
          <p className="text-sm text-blue-600 font-medium">รอรับสินค้า</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{data?.pendingOrdersCount ?? 0}</p>
          <p className="text-xs text-blue-500">รายการ</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">กำลังโหลด...</div>
      ) : allRoundTimes.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>ยังไม่มีข้อมูลวันนี้</p>
        </div>
      ) : (
        allRoundTimes.map((roundTime) => {
          const ordersInSlot = (data?.orders ?? []).filter((o) => o.roundTime === roundTime);
          const slotStock = data?.stockSummary.find((s) => s.roundTime === roundTime);
          const walkInOrders = ordersInSlot.filter((o) => o.orderType === "WALKIN");
          const reserveOrders = ordersInSlot.filter((o) => o.orderType === "RESERVE");
          const hasContent = slotStock || ordersInSlot.length > 0;
          if (!hasContent) return null;

          return (
            <div key={roundTime} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Slot header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="font-bold text-gray-800 text-base">🕐 {roundTime}</p>
                {slotStock && (
                  <div className="flex gap-2 text-xs">
                    <span className={`font-semibold ${availableColor(slotStock.pumpkin.qty - slotStock.pumpkin.sold, slotStock.pumpkin.qty)}`}>
                      🟡 เหลือ {Math.max(0, slotStock.pumpkin.qty - slotStock.pumpkin.sold)} ชิ้น
                    </span>
                    <span className={`font-semibold ${availableColor(slotStock.mochi.qty - slotStock.mochi.sold, slotStock.mochi.qty)}`}>
                      ⚪ เหลือ {Math.max(0, slotStock.mochi.qty - slotStock.mochi.sold)} ชิ้น
                    </span>
                  </div>
                )}
              </div>

              {/* Orders in this slot */}
              {ordersInSlot.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {[...walkInOrders, ...reserveOrders].map((order) => (
                    <div key={order.id} className={`flex items-center px-4 py-3 gap-3 ${order.status === "COMPLETED" ? "opacity-50" : ""}`}>
                      <button
                        onClick={() => toggleStatus(order)}
                        disabled={toggling === order.id}
                        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                          order.status === "COMPLETED"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {order.status === "COMPLETED" && <span className="text-xs">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${order.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {order.customer.name}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${order.orderType === "WALKIN" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                            {order.orderType === "WALKIN" ? "หน้าร้าน" : "จอง"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {order.pumpkinQty > 0 && `🟡${order.pumpkinQty} `}
                            {order.mochiQty > 0 && `⚪${order.mochiQty} `}
                            · {CHANNEL_LABEL[order.channel] ?? order.channel}
                            {order.note ? ` · ${order.note}` : ""}
                          </span>
                          <button
                            onClick={() => togglePaid(order.id, order.isPaid)}
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${order.isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                          >
                            {order.isPaid ? "💰ชำระแล้ว" : "ยังไม่ชำระ"}
                          </button>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                        order.status === "COMPLETED" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {order.status === "COMPLETED" ? "รับแล้ว" : "รอรับ"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {ordersInSlot.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">ไม่มีออเดอร์รอบนี้</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
