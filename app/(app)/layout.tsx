import { auth } from "@/auth";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "STAFF";

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar name={session?.user?.name ?? ""} role={role} />
      <main className="flex-1 overflow-auto pb-20 pt-14">{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
