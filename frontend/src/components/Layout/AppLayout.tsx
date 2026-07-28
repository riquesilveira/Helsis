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
        <SidebarInset className="bg-grafite-50 print:bg-white">
          <Header />
          <main className="flex-1 p-4 md:p-6 print:p-0">
            <div className="mx-auto w-full max-w-6xl print:max-w-none">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
