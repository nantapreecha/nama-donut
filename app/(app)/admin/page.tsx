"use client";

import { useEffect, useState, useCallback } from "react";

interface Product { id: string; name: string; isActive: boolean; }
interface TimeSlot { id: string; label: string; startTime: string; endTime: string; maxOrders: number; isActive: boolean; orderType: string; }
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

  // New slot
  const [newSlot, setNewSlot] = useState({ label: "", startTime: "", maxOrders: 20, orderType: "WALKIN" });

  // สร้าง dropdown เลือกเวลาทุก 30 นาที ตั้งแต่ 07:00–21:00
  const timeOptions = Array.from({ length: 29 }, (_, i) => {
    const totalMins = 7 * 60 + i * 30;
    const h = String(Math.floor(totalMins / 60)).padStart(2, "0");
    const m = String(totalMins % 60).padStart(2, "0");
    return `${h}:${m}`;
  });
  const [addingSlot, setAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ id: string; label: string; startTime: string; orderType: string } | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);

  // New user
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "STAFF" });
  const [addingUser, setAddingUser] = useState(false);

  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [pRes, sRes, uRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/timeslots"),
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

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setAddingSlot(true);
    await fetch("/api/timeslots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSlot),
    });
    setNewSlot({ label: "", startTime: "", maxOrders: 20, orderType: "WALKIN" });
    setAddingSlot(false);
    showMsg("เพิ่มรอบเวลาเรียบร้อย");
    loadData();
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/timeslots/${id}`, { method: "DELETE" });
    loadData();
  }

  async function saveEditSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSlot) return;
    setSavingSlot(true);
    await fetch(`/api/timeslots/${editingSlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editingSlot.label, startTime: editingSlot.startTime, orderType: editingSlot.orderType }),
    });
    setSavingSlot(false);
    setEditingSlot(null);
    showMsg("แก้ไขรอบเวลาเรียบร้อย");
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

      {/* Time Slots */}
      {tab === "timeslots" && (
        <div className="space-y-3">
          <form onSubmit={addSlot} className="bg-white rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">เพิ่มรอบเวลา</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ชื่อรอบ เช่น รอบที่ 1</label>
              <input
                type="text"
                value={newSlot.label}
                onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
                placeholder="รอบที่ 1"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">เวลารับสินค้า</label>
              <select
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              >
                <option value="">เลือกเวลา</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ประเภทออเดอร์</label>
              <div className="flex gap-2">
                {[{ v: "WALKIN", l: "🟠 หน้าร้าน" }, { v: "RESERVE", l: "🔵 จอง" }].map((o) => (
                  <button key={o.v} type="button"
                    onClick={() => setNewSlot({ ...newSlot, orderType: o.v })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${newSlot.orderType === o.v ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={addingSlot}
              className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold">
              เพิ่มรอบเวลา
            </button>
          </form>

          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {slots.length === 0 ? (
              <p className="text-center text-gray-400 py-8">ยังไม่มีรอบเวลา</p>
            ) : (
              slots.map((s) => (
                <div key={s.id}>
                  {editingSlot?.id === s.id ? (
                    <form onSubmit={saveEditSlot} className="px-4 py-3 space-y-2 bg-orange-50">
                      <input
                        type="text"
                        value={editingSlot.label}
                        onChange={(e) => setEditingSlot({ ...editingSlot, label: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        required
                      />
                      <div className="flex gap-2">
                        <select
                          value={editingSlot.startTime}
                          onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          required
                        >
                          {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex gap-1">
                          {[{ v: "WALKIN", l: "🟠" }, { v: "RESERVE", l: "🔵" }].map((o) => (
                            <button key={o.v} type="button"
                              onClick={() => setEditingSlot({ ...editingSlot, orderType: o.v })}
                              className={`px-3 py-2 rounded-xl text-sm font-semibold ${editingSlot.orderType === o.v ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingSlot}
                          className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-semibold">
                          {savingSlot ? "..." : "บันทึก"}
                        </button>
                        <button type="button" onClick={() => setEditingSlot(null)}
                          className="px-4 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm font-semibold">
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center px-4 py-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{s.label} — {s.startTime}</p>
                        <p className="text-xs text-gray-400">{s.orderType === "WALKIN" ? "🟠 หน้าร้าน" : "🔵 จอง"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSlot({ id: s.id, label: s.label, startTime: s.startTime, orderType: s.orderType })}
                          className="text-sm text-orange-500 px-3 py-1.5 font-medium"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => deleteSlot(s.id)}
                          className="text-sm text-red-400 px-3 py-1.5"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
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
