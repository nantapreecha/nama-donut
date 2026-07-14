"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // อ่านค่าจากฟอร์มจริงเป็นหลัก — กัน iOS autofill ที่เติมค่าแล้วไม่ trigger onChange (state ว่าง)
    const fd = new FormData(e.currentTarget);
    const u = ((fd.get("username") as string) || username).trim();
    const p = (fd.get("password") as string) || password;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username: u,
      password: p,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      // แยก "รหัสผิดจริง" ออกจากปัญหาระบบ — จะได้ไม่โทษรหัสผ่านมั่ว
      setError(
        result.error === "CredentialsSignin"
          ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
          : `ระบบขัดข้องชั่วคราว (${result.error}) — ลองใหม่อีกครั้ง`
      );
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍩</div>
          <h1 className="text-3xl font-bold text-orange-600">Nama</h1>
          <p className="text-gray-500 mt-1">ระบบจัดการสต๊อกโดนัท</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl py-3 text-base transition-colors"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
