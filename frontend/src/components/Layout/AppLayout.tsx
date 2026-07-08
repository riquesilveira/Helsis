import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-grafite-50 p-8 print:p-0 print:bg-white">
        <Outlet />
      </main>
    </div>
  );
}
