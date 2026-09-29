import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "../shadcn/sidebar";
import { TooltipProvider } from "../shadcn/tooltip";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-grafite-50 print:bg-white">
          <Header />
          <main className="flex-1 overflow-x-clip p-4 md:p-6 print:overflow-x-visible print:p-0">
            <div className="mx-auto w-full min-w-0 max-w-7xl print:max-w-none">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
