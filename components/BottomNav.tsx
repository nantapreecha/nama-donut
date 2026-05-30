"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  role: string;
}

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: "📊" },
  { href: "/orders", label: "ออเดอร์", icon: "📋" },
  { href: "/stock", label: "สต๊อก", icon: "📦" },
  { href: "/admin", label: "ตั้งค่า", icon: "⚙️", adminOnly: true },
];

export default function BottomNav({ role }: Props) {
  const pathname = usePathname();
  const items = navItems.filter((i) => !i.adminOnly || role === "ADMIN");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] ${
                active ? "text-orange-500" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs font-medium ${active ? "text-orange-500" : "text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
