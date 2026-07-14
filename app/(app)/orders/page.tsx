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
  pickupDate: string;
  isPaid: boolean;
  status: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  note: string | null;
}
interface TimeSlot { id: string; label: string; startTime: string; }

const CHANNELS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINE", label: "LINE" },
  { value: "PHONE", label: "โทรศัพท์" },
  { value: "WALK_IN", label: "หน้าร้าน" },
  { value: "OTHER", label: "อื่นๆ" },
];
const STATUS_LABEL: Record<string, string> = { PENDING: "รอรับ", COMPLETED: "รับแล้ว", CANCELLED: "ยกเลิก" };
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

type MainTab = "list" | "new";
type TypeTab = "WALKIN" | "RESERVE";

export default function OrdersPage() {
  const [mainTab, setMainTab] = useState<MainTab>("list");
  const [typeTab, setTypeTab] = useState<TypeTab>("WALKIN");
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Form state — ค่าเริ่มต้นเป็นออเดอร์จอง toggle เปิด = ออเดอร์หน้าร้าน
  const [orderType, setOrderType] = useState<TypeTab>("RESERVE");
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nameFound, setNameFound] = useState(false);
  const [channel, setChannel] = useState("FACEBOOK");
  const [roundTime, setRoundTime] = useState("");
  const [pumpkinQty, setPumpkinQty] = useState(0);
  const [mochiQty, setMochiQty] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadOrders = useCallback(async () => {
    const [ordersRes, slotsRes] = await Promise.all([
      fetch("/api/orders"),
      fetch("/api/timeslots"),
    ]);
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (slotsRes.ok) setTimeSlots(await slotsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // รอบเวลาจาก DB — สต๊อกกองเดียวกัน ใช้รายการเดียวกันทั้งจองและหน้าร้าน
  const availableSlots = timeSlots;
  const isWalkIn = orderType === "WALKIN";

  // Reset roundTime เมื่อเปลี่ยนวันที่รับ
  useEffect(() => { setRoundTime(""); }, [pickupDate]);

  // toggle ออเดอร์หน้าร้าน: ปรับช่องทางให้อัตโนมัติ
  function toggleWalkIn() {
    setOrderType((t) => {
      const next = t === "WALKIN" ? "RESERVE" : "WALKIN";
      setChannel(next === "WALKIN" ? "WALK_IN" : "FACEBOOK");
      return next;
    });
  }

  async function lookupPhone() {
    if (phone.length < 9) return;
    const res = await fetch(`/api/customers?phone=${phone}`);
    if (res.ok) {
      const c = await res.json();
      if (c) { setName(c.name); setNameFound(true); }
      else { setName(""); setNameFound(false); }
    }
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!roundTime) { setFormError("กรุณาเลือกรอบเวลา"); return; }
    if (pumpkinQty + mochiQty === 0) { setFormError("กรุณาระบุจำนวนอย่างน้อย 1 ชิ้น"); return; }

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
      body: JSON.stringify({ customerId: customer.id, pickupDate, channel, orderType, roundTime, pumpkinQty, mochiQty, note }),
    });
    setSubmitting(false);

    if (res.ok) {
      setFormSuccess("บันทึกออเดอร์เรียบร้อย");
      setPhone(""); setName(""); setNameFound(false); setChannel("FACEBOOK");
      setRoundTime(""); setPumpkinQty(0); setMochiQty(0); setNote("");
      loadOrders();
      setTimeout(() => { setFormSuccess(""); setMainTab("list"); }, 1500);
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
    loadOrders();
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    await fetch(`/api/orders/${cancelTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setCancelling(false);
    setCancelTarget(null);
    loadOrders();
  }

  async function togglePaid(orderId: string, isPaid: boolean) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !isPaid }),
    });
    loadOrders();
  }

  const filteredOrders = orders.filter((o) => o.orderType === typeTab);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMainTab("list")} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${mainTab === "list" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}>
          ออเดอร์วันนี้
        </button>
        <button onClick={() => setMainTab("new")} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${mainTab === "new" ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}>
          + รับออเดอร์ใหม่
        </button>
      </div>

      {mainTab === "list" && (
        <>
          <div className="flex gap-2">
            <button onClick={() => setTypeTab("WALKIN")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${typeTab === "WALKIN" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-transparent bg-white text-gray-500"}`}>
              🟠 หน้าร้าน ({orders.filter(o => o.orderType === "WALKIN" && o.status === "PENDING").length})
            </button>
            <button onClick={() => setTypeTab("RESERVE")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${typeTab === "RESERVE" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-transparent bg-white text-gray-500"}`}>
              🔵 จอง ({orders.filter(o => o.orderType === "RESERVE" && o.status === "PENDING").length})
            </button>
          </div>

          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">{typeTab === "WALKIN" ? "🟠" : "🔵"}</p>
                <p>ยังไม่มีออเดอร์{typeTab === "WALKIN" ? "หน้าร้าน" : "จอง"}วันนี้</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className={`bg-white rounded-2xl shadow-sm p-4 space-y-2 border-l-4 ${order.orderType === "WALKIN" ? "border-orange-400" : "border-blue-400"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{order.customer.name}</p>
                      <p className="text-sm text-gray-500">{order.customer.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                      <button
                        onClick={() => togglePaid(order.id, order.isPaid)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${order.isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {order.isPaid ? "💰 ชำระแล้ว" : "⏳ ยังไม่ชำระ"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs text-gray-500">
                    {order.roundTime && <span className="bg-gray-50 px-2 py-1 rounded-lg font-medium">รอบ {order.roundTime}</span>}
                    <span className="bg-gray-50 px-2 py-1 rounded-lg">{CHANNELS.find(c => c.value === order.channel)?.label}</span>
                  </div>
                  <div className="text-sm text-gray-700 flex gap-3">
                    {order.pumpkinQty > 0 && <span>🟡 ฟักทอง {order.pumpkinQty} ชิ้น</span>}
                    {order.mochiQty > 0 && <span>⚪ โมจิ {order.mochiQty} ชิ้น</span>}
                  </div>
                  {order.note && <p className="text-xs text-gray-400">{order.note}</p>}
                  {order.status === "CANCELLED" && order.cancelledAt && (
                    <p className="text-xs text-red-400 bg-red-50 rounded-lg px-2 py-1">
                      ❌ ยกเลิกเมื่อ {new Date(order.cancelledAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {order.cancelledBy ? ` · โดย ${order.cancelledBy}` : ""}
                    </p>
                  )}
                  {order.status === "PENDING" && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => updateStatus(order.id, "COMPLETED")} className="flex-1 bg-green-500 text-white rounded-xl py-2 text-sm font-semibold">รับแล้ว ✓</button>
                      <button onClick={() => setCancelTarget(order)} className="px-4 bg-red-50 text-red-500 rounded-xl py-2 text-sm font-semibold">ยกเลิก</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {mainTab === "new" && (
        <form onSubmit={submitOrder} className="space-y-4">
          {formError && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{formError}</div>}
          {formSuccess && <div className="bg-green-50 text-green-600 rounded-xl px-4 py-3 text-sm font-medium">{formSuccess}</div>}

          {/* Toggle ออเดอร์หน้าร้าน */}
          <div className={`rounded-2xl p-4 flex items-center justify-between transition-colors ${isWalkIn ? "bg-orange-50 border border-orange-200" : "bg-white"}`}>
            <div>
              <h3 className="font-semibold text-gray-700">🟠 ออเดอร์หน้าร้าน</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isWalkIn ? "ตัดสต๊อกจากรอบผลิตที่เลือกทันที" : "ปิดอยู่ = ออเดอร์จอง 🔵 (เลือกเวลานัดรับ)"}
              </p>
            </div>
            <button type="button" onClick={toggleWalkIn} aria-label="สลับออเดอร์หน้าร้าน"
              className={`relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0 ${isWalkIn ? "bg-orange-500" : "bg-gray-200"}`}>
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${isWalkIn ? "left-[24px]" : "left-1"}`} />
            </button>
          </div>

          {/* ข้อมูลลูกค้า */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">ข้อมูลลูกค้า</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">เบอร์โทร *</label>
              <div className="flex gap-2">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={lookupPhone}
                  placeholder="0812345678" required
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <button type="button" onClick={lookupPhone} className="bg-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-600">ค้นหา</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">ชื่อ * {nameFound && <span className="text-green-600 ml-1">✓ ลูกค้าเก่า</span>}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อลูกค้า" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {/* วันที่รับ + รอบเวลา/รอบผลิต */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">{isWalkIn ? "วันที่ & รอบผลิต" : "วันที่รับ & รอบเวลา"}</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{isWalkIn ? "วันที่ขาย" : "วันที่รับ"}</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                {isWalkIn ? "รอบผลิตที่ตัดสต๊อก *" : "รอบเวลานัดรับ *"}
              </label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-gray-400">ยังไม่มีรอบเวลา — ให้ Admin เพิ่มที่หน้าตั้งค่า</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {availableSlots.map((slot) => (
                    <button key={slot.id} type="button" onClick={() => setRoundTime(slot.startTime)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${roundTime === slot.startTime ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {slot.label} {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* จำนวนแป้ง */}
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <h3 className="font-semibold text-gray-700">จำนวนแป้ง</h3>
            {[{ label: "🟡 แป้งฟักทอง", val: pumpkinQty, set: setPumpkinQty }, { label: "⚪ แป้งโมจิ", val: mochiQty, set: setMochiQty }].map(({ label, val, set }) => (
              <div key={label} className="flex items-center">
                <p className="flex-1 text-sm font-medium text-gray-700">{label}</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set(Math.max(0, val - 1))} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold">−</button>
                  <span className="font-semibold w-8 text-center">{val}</span>
                  <button type="button" onClick={() => set(val + 1)} className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-lg font-bold">+</button>
                  <span className="text-xs text-gray-400">ชิ้น</span>
                </div>
              </div>
            ))}
          </div>

          {/* ช่องทาง */}
          <div className="bg-white rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-gray-700">ช่องทาง</h3>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button key={c.value} type="button" onClick={() => setChannel(c.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${channel === c.value ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* หมายเหตุ */}
          <div className="bg-white rounded-2xl p-4">
            <label className="text-sm text-gray-600 mb-1 block">หมายเหตุ</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ไม่มี"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl py-4 text-lg">
            {submitting ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
          </button>
        </form>
      )}

      {/* Popup ยืนยันยกเลิกออเดอร์ */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-4xl mb-2">⚠️</p>
              <h3 className="font-bold text-gray-800 text-lg">ยกเลิกออเดอร์?</h3>
              <p className="text-sm text-gray-500 mt-1">{cancelTarget.customer.name}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
              <p className="text-xs text-gray-500">สินค้าจะถูกคืนเข้ารอบ {cancelTarget.roundTime}:</p>
              {cancelTarget.pumpkinQty > 0 && <p>🟡 ฟักทอง {cancelTarget.pumpkinQty} ชิ้น</p>}
              {cancelTarget.mochiQty > 0 && <p>⚪ โมจิ {cancelTarget.mochiQty} ชิ้น</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCancelTarget(null)} disabled={cancelling}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-semibold">
                ไม่ยกเลิก
              </button>
              <button onClick={confirmCancel} disabled={cancelling}
                className="flex-1 bg-red-500 text-white rounded-xl py-3 text-sm font-semibold">
                {cancelling ? "..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
