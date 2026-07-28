import { Link, useLocation } from "react-router-dom";
import { Activity, ChevronsUpDown } from "lucide-react";
import { usuarioLogado } from "../../services/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../shadcn/sidebar";
import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { NAV_GROUPS, ROTULO_PAPEL, type NavItemConfig } from "./nav-data";
import { UserMenu } from "./UserMenu";

function podeVer(item: NavItemConfig, papel?: string) {
  return !item.restritoA || (!!papel && item.restritoA.includes(papel));
}

function estaAtivo(pathname: string, item: NavItemConfig) {
  if (item.exato) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

export function AppSidebar() {
  const usuario = usuarioLogado();
  const papel = usuario?.papel;
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-1 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity size={18} />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="text-[15px] font-semibold tracking-tight text-foreground">Resso</p>
            <p className="text-[11px] text-muted-foreground">Gestão de serviços</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((grupo) => {
          const itens = grupo.itens.filter((item) => podeVer(item, papel));
          if (itens.length === 0) return null;
          return (
            <SidebarGroup key={grupo.titulo}>
              <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
              <SidebarMenu>
                {itens.map((item) => {
                  const Icone = item.icone;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={estaAtivo(pathname, item)}
                        tooltip={item.rotulo}
                        className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary data-[active=true]:hover:text-sidebar-primary-foreground"
                      >
                        <Link to={item.to}>
                          <Icone />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {usuario && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu
                side="right"
                align="end"
                trigger={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {inicial(usuario.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium">{usuario.nome}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ROTULO_PAPEL[usuario.papel] ?? usuario.papel}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
