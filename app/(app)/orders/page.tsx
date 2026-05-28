"use client";

import { useEffect, useState, useCallback } from "react";

interface Product { id: string; name: string; }
interface TimeSlot { id: string; label: string; startTime: string; endTime: string; maxOrders: number; }
interface StockItem { productId: string; name: string; available: number; produced: number; }
interface OrderItem { product: Product; quantity: number; }
interface Order {
  id: string;
  customer: { name: string; phone: string };
  timeSlot: TimeSlot | null;
  pickupDate: string;
  channel: string;
  status: string;
  note: string;
  items: OrderItem[];
}

const CHANNELS = [
  { value: "WALK_IN", label: "หน้าร้าน" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINE", label: "LINE" },
  { value: "PHONE", label: "โทรศัพท์" },
  { value: "OTHER", label: "อื่นๆ" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอรับ", COMPLETED: "รับแล้ว", CANCELLED: "ยกเลิก",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  const [tab, setTab] = useState<"list" | "new">("list");
  const [orders, setOrders] = useState<Order[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nameFound, setNameFound] = useState(false);
  const [channel, setChannel] = useState("FACEBOOK");
  const [slotId, setSlotId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadData = useCallback(async () => {
    const [ordersRes, slotsRes, stockRes] = await Promise.all([
      fetch("/api/orders"),
      fetch("/api/timeslots"),
      fetch("/api/stock"),
    ]);
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (slotsRes.ok) setSlots(await slotsRes.json());
    if (stockRes.ok) setStock(await stockRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function lookupPhone() {
    if (phone.length < 9) return;
    const res = await fetch(`/api/customers?phone=${phone}`);
    if (res.ok) {
      const customer = await res.json();
      if (customer) { setName(customer.name); setNameFound(true); }
      else { setName(""); setNameFound(false); }
    }
  }

  function setItem(productId: string, qty: number) {
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const orderItems = Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (orderItems.length === 0) { setFormError("กรุณาเลือกสินค้าอย่างน้อย 1 อย่าง"); return; }

    setSubmitting(true);
    const customerRes = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const customer = await customerRes.json();

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        timeSlotId: slotId || null,
        pickupDate: new Date().toISOString().split("T")[0],
        channel,
        note,
        items: orderItems,
      }),
    });
    setSubmitting(false);

    if (res.ok) {
      setFormSuccess("บันทึกออเดอร์เรียบร้อย");
      setPhone(""); setName(""); setNameFound(false); setChannel("FACEBOOK");
      setSlotId(""); setNote(""); setItems({});
      loadData();
      setTimeout(() => { setFormSuccess(""); setTab("list"); }, 1500);
    } else {
      const data = await res.json();
      setFormError(data.error ?? "เกิดข้อผิดพลาด");
    }
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Tab */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("list")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tab === "list" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
        >
          ออเดอร์วันนี้
        </button>
        <button
          onClick={() => setTab("new")}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tab === "new" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
        >
          + รับออเดอร์ใหม่
        </button>
      </div>

      {tab === "list" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">📋</p>
              <p>ยังไม่มีออเดอร์วันนี้</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{order.customer.name}</p>
                    <p className="text-sm text-gray-500">{order.customer.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap text-xs text-gray-500">
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">
                    {CHANNELS.find((c) => c.value === order.channel)?.label}
                  </span>
                  {order.timeSlot && (
                    <span className="bg-gray-50 px-2 py-1 rounded-lg">
                      {order.timeSlot.label} {order.timeSlot.startTime}–{order.timeSlot.endTime}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-700">
                  {order.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}
                </div>
                {order.note && <p className="text-xs text-gray-400">{order.note}</p>}
                {order.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(order.id, "COMPLETED")}
                      className="flex-1 bg-green-500 text-white rounded-xl py-2 text-sm font-semibold"
                    >
                      รับแล้ว ✓
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, "CANCELLED")}
                      className="px-4 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm font-semibold"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "new" && (
        <form onSubmit={submitOrder} className="space-y-4">
          {formError && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{formError}</div>}
          {formSuccess && <div className="bg-green-50 text-green-600 rounded-xl px-4 py-3 text-sm font-medium">{formSuccess}</div>}

          {/* Phone */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">ข้อมูลลูกค้า</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">เบอร์โทร *</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={lookupPhone}
                  placeholder="0812345678"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
                <button type="button" onClick={lookupPhone} className="bg-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-600">
                  ค้นหา
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                ชื่อ * {nameFound && <span className="text-green-600 ml-1">✓ ลูกค้าเก่า</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อลูกค้า"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
          </div>

          {/* Channel + Slot */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">ช่องทางและรอบ</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">ช่องทาง</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setChannel(c.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${channel === c.value ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {slots.length > 0 && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">รอบเวลา (ถ้ามี)</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSlotId("")}
                    className={`px-3 py-2 rounded-xl text-sm font-medium ${slotId === "" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    ไม่ระบุ
                  </button>
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium ${slotId === s.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      {s.label} {s.startTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">หมายเหตุ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ไม่มี"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">สินค้า</h3>
            {stock.filter((s) => s.produced > 0).map((item) => (
              <div key={item.productId} className="flex items-center">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className={`text-xs ${item.available <= 0 ? "text-red-500" : item.available <= 5 ? "text-yellow-600" : "text-gray-400"}`}>
                    เหลือ {item.available}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setItem(item.productId, (items[item.productId] ?? 0) - 1)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{items[item.productId] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setItem(item.productId, (items[item.productId] ?? 0) + 1)}
                    disabled={item.available <= (items[item.productId] ?? 0)}
                    className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-lg font-bold disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl py-4 text-lg"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
          </button>
        </form>
      )}
    </div>
  );
}
