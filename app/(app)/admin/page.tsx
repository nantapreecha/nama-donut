"use client";

import { useEffect, useState, useCallback } from "react";

interface Product { id: string; name: string; isActive: boolean; }
interface TimeSlot { id: string; label: string; startTime: string; endTime: string; maxOrders: number; isActive: boolean; }
interface User { id: string; username: string; name: string; role: string; }

type AdminTab = "products" | "timeslots" | "users";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // New product
  const [newProductName, setNewProductName] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  // Slot bottom sheet (สไตล์นาฬิกาปลุก iPhone) — id = null คือเพิ่มรอบใหม่
  const [slotSheet, setSlotSheet] = useState<{ id: string | null; label: string; startTime: string } | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  // สร้าง dropdown เลือกเวลาทุก 30 นาที ตั้งแต่ 07:00–21:00
  const timeOptions = Array.from({ length: 29 }, (_, i) => {
    const totalMins = 7 * 60 + i * 30;
    const h = String(Math.floor(totalMins / 60)).padStart(2, "0");
    const m = String(totalMins % 60).padStart(2, "0");
    return `${h}:${m}`;
  });

  // New user
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "STAFF" });
  const [addingUser, setAddingUser] = useState(false);

  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [pRes, sRes, uRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/timeslots?all=1"),
      fetch("/api/users"),
    ]);
    if (pRes.ok) setProducts(await pRes.json());
    if (sRes.ok) setSlots(await sRes.json());
    if (uRes.ok) setUsers(await uRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setAddingProduct(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProductName }),
    });
    setNewProductName("");
    setAddingProduct(false);
    showMsg("เพิ่มสินค้าเรียบร้อย");
    loadData();
  }

  async function toggleProduct(id: string, isActive: boolean) {
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadData();
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`ลบ "${name}" ออกจากระบบ?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    showMsg("ลบสินค้าเรียบร้อย");
    loadData();
  }

  async function saveSlotSheet(e: React.FormEvent) {
    e.preventDefault();
    if (!slotSheet || !slotSheet.startTime) return;
    setSavingSlot(true);
    if (slotSheet.id) {
      await fetch(`/api/timeslots/${slotSheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: slotSheet.label, startTime: slotSheet.startTime }),
      });
    } else {
      await fetch("/api/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: slotSheet.label, startTime: slotSheet.startTime }),
      });
    }
    setSavingSlot(false);
    setSlotSheet(null);
    showMsg(slotSheet.id ? "แก้ไขรอบเวลาเรียบร้อย" : "เพิ่มรอบเวลาเรียบร้อย");
    loadData();
  }

  async function toggleSlot(s: TimeSlot) {
    await fetch(`/api/timeslots/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    loadData();
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/timeslots/${id}`, { method: "DELETE" });
    setSlotSheet(null);
    setConfirmDeleteSlot(false);
    showMsg("ลบรอบเวลาเรียบร้อย");
    loadData();
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setAddingUser(false);
    if (res.ok) {
      setNewUser({ username: "", password: "", name: "", role: "STAFF" });
      showMsg("เพิ่มผู้ใช้เรียบร้อย");
      loadData();
    }
  }

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "products", label: "🍩 สินค้า" },
    { key: "timeslots", label: "🕐 รอบเวลา" },
    { key: "users", label: "👤 ผู้ใช้" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">ตั้งค่า</h1>

      {message && (
        <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">{message}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? "bg-orange-500 text-white" : "bg-white text-gray-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Products */}
      {tab === "products" && (
        <div className="space-y-3">
          <form onSubmit={addProduct} className="flex gap-2">
            <input
              type="text"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="ชื่อสินค้าใหม่"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <button
              type="submit"
              disabled={addingProduct}
              className="bg-orange-500 text-white rounded-xl px-4 py-3 font-semibold"
            >
              เพิ่ม
            </button>
          </form>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {products.map((p) => (
              <div key={p.id} className="flex items-center px-4 py-3">
                <p className={`flex-1 font-medium ${p.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                  {p.name}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleProduct(p.id, p.isActive)}
                    className={`text-sm px-3 py-1.5 rounded-xl font-medium ${p.isActive ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-600"}`}
                  >
                    {p.isActive ? "ปิด" : "เปิด"}
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id, p.name)}
                    className="text-sm px-3 py-1.5 rounded-xl font-medium bg-red-50 text-red-500"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Slots — สไตล์นาฬิกาปลุก iPhone: แตะเวลาเพื่อแก้ไข สวิตช์เปิด/ปิดรอบ */}
      {tab === "timeslots" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {slots.length === 0 ? (
              <p className="text-center text-gray-400 py-8">ยังไม่มีรอบเวลา</p>
            ) : (
              slots.map((s) => (
                <div key={s.id} className="flex items-center px-4 py-2.5">
                  <button
                    onClick={() => { setSlotSheet({ id: s.id, label: s.label, startTime: s.startTime }); setConfirmDeleteSlot(false); }}
                    className="flex-1 text-left"
                  >
                    <p className={`text-4xl font-light tracking-tight ${s.isActive ? "text-gray-800" : "text-gray-300"}`}>{s.startTime}</p>
                    <p className={`text-xs mt-0.5 ${s.isActive ? "text-gray-500" : "text-gray-300"}`}>{s.label}</p>
                  </button>
                  <button
                    onClick={() => toggleSlot(s)}
                    aria-label={s.isActive ? "ปิดรอบ" : "เปิดรอบ"}
                    className={`relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0 ${s.isActive ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${s.isActive ? "left-[24px]" : "left-1"}`} />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => { setSlotSheet({ id: null, label: "", startTime: "" }); setConfirmDeleteSlot(false); }}
            className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold"
          >
            + เพิ่มรอบเวลา
          </button>
          <p className="text-xs text-gray-400 text-center">แตะเวลาเพื่อแก้ไข · สวิตช์ = เปิด/ปิดรอบชั่วคราว</p>

          {/* Bottom sheet เพิ่ม/แก้ไขรอบ */}
          {slotSheet && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => !savingSlot && setSlotSheet(null)}>
              <form onSubmit={saveSlotSheet} className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setSlotSheet(null)} className="text-sm text-gray-500 px-2 py-1">ยกเลิก</button>
                  <h3 className="font-bold text-gray-800">{slotSheet.id ? "แก้ไขรอบเวลา" : "เพิ่มรอบเวลา"}</h3>
                  <button type="submit" disabled={savingSlot || !slotSheet.startTime}
                    className="text-sm font-bold text-orange-500 px-2 py-1 disabled:text-gray-300">
                    {savingSlot ? "..." : "บันทึก"}
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">เวลา</label>
                  <select
                    value={slotSheet.startTime}
                    onChange={(e) => setSlotSheet({ ...slotSheet, startTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-3xl font-light text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required
                  >
                    <option value="">--:--</option>
                    {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ชื่อรอบ</label>
                  <input
                    type="text"
                    value={slotSheet.label}
                    onChange={(e) => setSlotSheet({ ...slotSheet, label: e.target.value })}
                    placeholder="รอบที่ 1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required
                  />
                </div>
                {slotSheet.id && (
                  confirmDeleteSlot ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmDeleteSlot(false)}
                        className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-semibold">
                        ไม่ลบ
                      </button>
                      <button type="button" onClick={() => deleteSlot(slotSheet.id!)}
                        className="flex-1 bg-red-500 text-white rounded-xl py-3 text-sm font-semibold">
                        ยืนยันลบถาวร
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteSlot(true)}
                      className="w-full bg-red-50 text-red-500 rounded-xl py-3 text-sm font-semibold">
                      ลบรอบเวลา
                    </button>
                  )
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-3">
          <form onSubmit={addUser} className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">เพิ่มผู้ใช้</h3>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="ชื่อ"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="username"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="รหัสผ่าน"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <div className="flex gap-2">
              {["STAFF", "ADMIN"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewUser({ ...newUser, role: r })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${newUser.role === r ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={addingUser}
              className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold"
            >
              เพิ่มผู้ใช้
            </button>
          </form>

          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === "ADMIN" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
