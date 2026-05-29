import { logout } from "@/app/actions";

export default function LogoutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <form action={logout}>
        <button type="submit" className="bg-red-400 text-white px-6 py-3 rounded-xl font-semibold">
          กดเพื่อออกจากระบบ
        </button>
      </form>
    </div>
  );
}
