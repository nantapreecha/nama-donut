"use client";

interface Props {
  name: string;
  role: string;
}

export default function TopBar({ name, role }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-14 flex items-center px-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍩</span>
        <span className="font-bold text-orange-600 text-lg">Nama</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500">{name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role === "ADMIN" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
          {role === "ADMIN" ? "Admin" : "Staff"}
        </span>
        <form method="POST" action="/api/auth/signout">
          <button
            type="submit"
            className="text-sm text-white bg-red-400 hover:bg-red-500 transition-colors px-3 py-1 rounded-lg font-medium"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}
