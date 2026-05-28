"use client";

import { useEffect, useState, useCallback } from "react";

interface StockItem {
  productId: string;
  name: string;
  produced: number;
  reserved: number;
  walkIn: number;
  sold: number;
  available: number;
}

interface DashboardData {
  totalSold: number;
  pendingOrdersCount: number;
  stockSummary: StockItem[];
  lowStock: StockItem[];
  outOfStock: StockItem[];
}

function statusIcon(item: StockItem) {
  if (item.produced === 0) return { icon: "⚪", label: "ยังไม่ตั้งสต๊อก", color: "text-gray-400" };
  if (item.available === 0) return { icon: "🔴", label: "หมด", color: "text-red-500" };
  if (item.available <= 5) return { icon: "🟡", label: `เหลือ ${item.available}`, color: "text-yellow-500" };
  return { icon: "🟢", label: `เหลือ ${item.available}`, color: "text-green-600" };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-800">หน้าหลัก</h1>
        <p className="text-sm text-gray-500">{today}</p>
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

      {/* Alert: Out of stock */}
      {(data?.outOfStock?.length ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="font-semibold text-red-600 mb-2">🔴 ของหมด</p>
          <div className="flex flex-wrap gap-2">
            {data!.outOfStock.map((s) => (
              <span key={s.productId} className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alert: Low stock */}
      {(data?.lowStock?.length ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
          <p className="font-semibold text-yellow-700 mb-2">🟡 เหลือน้อย</p>
          <div className="flex flex-wrap gap-2">
            {data!.lowStock.map((s) => (
              <span key={s.productId} className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full">
                {s.name} ({s.available})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stock Summary */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-gray-700">สต๊อกวันนี้</h2>
        </div>
        {(data?.stockSummary ?? []).length === 0 ? (
          <p className="text-center text-gray-400 py-8">ยังไม่มีสินค้า</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data!.stockSummary.map((item) => {
              const { icon, label, color } = statusIcon(item);
              return (
                <div key={item.productId} className="flex items-center px-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ผลิต {item.produced} · จอง {item.reserved} · หน้าร้าน {item.walkIn}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg">{icon}</span>
                    <p className={`text-xs font-medium ${color}`}>{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
