import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { usuarioLogado } from "../../services/auth";
import { SidebarTrigger } from "../shadcn/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../shadcn/breadcrumb";
import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { UserMenu } from "./UserMenu";

// Rótulos legíveis por segmento de rota. Segmentos ausentes (ids dinâmicos como
// /clientes/:id) caem no rótulo genérico "Detalhes".
const CRUMB_LABELS: Record<string, string> = {
  "ordens-servico": "Ordens de serviço",
  nova: "Nova OS",
  "manutencoes-preventivas": "Manutenções preventivas",
  clientes: "Clientes",
  funcionarios: "Equipe & desempenho",
  "catalogo-diagnostico": "Catálogo de diagnóstico",
  "folha-de-ponto": "Folha de ponto",
  "minha-rota": "Minha rota",
  configuracoes: "Configurações",
  rota: "Rota",
  resumo: "Resumo mensal",
};

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

export function Header() {
  const { pathname } = useLocation();
  const usuario = usuarioLogado();

  const segmentos = pathname.split("/").filter(Boolean);
  const crumbs = segmentos.map((seg, i) => ({
    href: `/${segmentos.slice(0, i + 1).join("/")}`,
    label: CRUMB_LABELS[seg] ?? "Detalhes",
    ultimo: i === segmentos.length - 1,
  }));

  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-lg"
    >
      <SidebarTrigger className="-ml-1" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {segmentos.length === 0 ? (
              <BreadcrumbPage>Painel</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link to="/">Início</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <Fragment key={crumb.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.ultimo ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {usuario && (
          <UserMenu
            side="bottom"
            align="end"
            trigger={
              <button
                type="button"
                aria-label="Menu do usuário"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {inicial(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
        )}
      </div>
    </header>
  );
}
