import { FormEvent, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "../services/api";
import { DadosEmpresa } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/shadcn/card";
import { Button } from "../components/shadcn/button";
import { Input } from "../components/shadcn/input";
import { Label } from "../components/shadcn/label";

const VAZIO: DadosEmpresa = { nome: null, telefone: null, whatsapp: null, email: null };

/**
 * Dados da empresa (PT3): nome e contato que aparecem no link de
 * acompanhamento do cliente. Só Dono/Gestor alteram (a API também recusa os
 * outros papéis).
 */
export function ConfiguracaoEmpresa() {
  const [form, setForm] = useState<DadosEmpresa>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    api.get("/configuracoes/empresa").then((r) => setForm(r.data)).catch(() => {});
  }, []);

  function campo(chave: keyof DadosEmpresa, valor: string) {
    setMsg(null);
    setForm({ ...form, [chave]: valor });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSalvando(true);
    try {
      const { data } = await api.put("/configuracoes/empresa", form);
      setForm(data);
      setMsg({ tipo: "ok", texto: "Dados da empresa salvos." });
    } catch (err: any) {
      setMsg({ tipo: "erro", texto: err?.response?.data?.erro ?? "Não foi possível salvar. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="size-4 text-muted-foreground" />
          Dados da empresa
        </CardTitle>
        <CardDescription className="text-xs">
          Aparecem no link de acompanhamento que o cliente recebe. Deixe em branco o que não quiser mostrar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="empresa-nome">Nome da empresa</Label>
            <Input
              id="empresa-nome"
              value={form.nome ?? ""}
              onChange={(e) => campo("nome", e.target.value)}
              placeholder="Ex: Resso Assistência Técnica"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="empresa-telefone">Telefone</Label>
              <Input
                id="empresa-telefone"
                type="tel"
                value={form.telefone ?? ""}
                onChange={(e) => campo("telefone", e.target.value)}
                placeholder="(11) 3333-4444"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="empresa-whatsapp">WhatsApp</Label>
              <Input
                id="empresa-whatsapp"
                type="tel"
                inputMode="numeric"
                value={form.whatsapp ?? ""}
                onChange={(e) => campo("whatsapp", e.target.value)}
                placeholder="5511999998888"
                aria-describedby="empresa-whatsapp-ajuda"
              />
              <span id="empresa-whatsapp-ajuda" className="text-xs text-muted-foreground">
                Com DDI e DDD, só números.
              </span>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="empresa-email">E-mail</Label>
            <Input
              id="empresa-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => campo("email", e.target.value)}
              placeholder="contato@suaempresa.com.br"
            />
          </div>
          {msg && (
            <p role={msg.tipo === "erro" ? "alert" : "status"} className={`text-xs ${msg.tipo === "ok" ? "text-foreground" : "text-danger"}`}>
              {msg.texto}
            </p>
          )}
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar dados da empresa"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
