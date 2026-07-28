import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";
import { Tabs, TabsList, TabsTrigger } from "../../components/shadcn/tabs";

// Gestão do catálogo de diagnóstico codificado: Causa / Defeito / Solução.
// São tabelas de códigos padronizados que o técnico escolhe no fechamento do
// chamado. Aqui DONO/GESTOR criam, editam e desativam esses códigos — antes
// isso só existia via API/seed. Defeito e Solução têm um tempo estimado (min)
// usado para planejar/medir o atendimento.

type ItemCatalogo = {
  id: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number | null;
};

type TipoCatalogo = "causas" | "defeitos" | "solucoes";

interface ConfigCatalogo {
  chave: TipoCatalogo;
  rotulo: string; // plural, usado na tab
  singular: string; // usado nos títulos de modal/botão
  genero: "m" | "f"; // concordância nas frases (novo/nova, cadastrado/cadastrada)
  temTempo: boolean;
}

const CATALOGOS: ConfigCatalogo[] = [
  { chave: "causas", rotulo: "Causas", singular: "causa", genero: "f", temTempo: false },
  { chave: "defeitos", rotulo: "Defeitos", singular: "defeito", genero: "m", temTempo: true },
  { chave: "solucoes", rotulo: "Soluções", singular: "solução", genero: "f", temTempo: true },
];

function formatarTempo(min?: number | null): string {
  if (!min) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function SecaoCatalogo({ config }: { config: ConfigCatalogo }) {
  const f = config.genero === "f";
  const novo = f ? "Nova" : "Novo";
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  // modal de criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ItemCatalogo | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tempo, setTempo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    api
      .get(`/diagnostico/${config.chave}`)
      .then((r) => setItens(r.data))
      .catch(() => setErroLista("Não foi possível carregar os itens. Tente novamente."))
      .finally(() => setCarregando(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [config.chave]);

  function abrirNovo() {
    setEditando(null);
    setCodigo("");
    setDescricao("");
    setTempo("");
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(item: ItemCatalogo) {
    setEditando(item);
    setCodigo(item.codigo);
    setDescricao(item.descricao);
    setTempo(item.tempoEstimadoMin ? String(item.tempoEstimadoMin) : "");
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroForm(null);

    const corpo: Record<string, unknown> = {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
    };
    if (config.temTempo) {
      corpo.tempoEstimadoMin = tempo ? Number(tempo) : undefined;
    }

    try {
      if (editando) {
        await api.patch(`/diagnostico/${config.chave}/${editando.id}`, corpo);
      } else {
        await api.post(`/diagnostico/${config.chave}`, corpo);
      }
      setModalAberto(false);
      carregar();
    } catch (err: any) {
      setErroForm(
        err?.response?.data?.erro ?? "Não foi possível salvar o item. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: ItemCatalogo) {
    const ok = window.confirm(
      `Remover ${f ? "a" : "o"} ${config.singular} "${item.codigo} — ${item.descricao}" do catálogo? ` +
        `Ordens de serviço antigas que já usam este item não são afetadas.`
    );
    if (!ok) return;
    try {
      await api.delete(`/diagnostico/${config.chave}/${item.id}`);
      setItens((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      alert(err?.response?.data?.erro ?? "Não foi possível remover o item. Tente novamente.");
    }
  }

  return (
    <Card className="py-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          {config.rotulo}
          {!carregando && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {itens.length}
            </span>
          )}
        </h2>
        <Button size="sm" onClick={abrirNovo}>
          <Plus />
          {novo} {config.singular}
        </Button>
      </div>

      {carregando ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Carregando...</p>
      ) : erroLista ? (
        <p className="px-5 py-6 text-sm text-danger">{erroLista}</p>
      ) : itens.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Nenhum{f ? "a" : ""} {config.singular} cadastrad{f ? "a" : "o"} ainda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-32 px-5 text-xs font-medium text-muted-foreground">
                Código
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Descrição
              </TableHead>
              {config.temTempo && (
                <TableHead className="w-32 px-5 text-xs font-medium text-muted-foreground">
                  Tempo est.
                </TableHead>
              )}
              <TableHead className="w-24 px-5 text-right text-xs font-medium text-muted-foreground">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((item) => (
              <TableRow key={item.id} className="border-border hover:bg-muted/50">
                <TableCell className="px-5 py-2.5">
                  <span className="codigo font-medium text-foreground">{item.codigo}</span>
                </TableCell>
                <TableCell className="px-5 py-2.5 text-foreground">{item.descricao}</TableCell>
                {config.temTempo && (
                  <TableCell className="px-5 py-2.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-muted-foreground" />
                      {formatarTempo(item.tempoEstimadoMin)}
                    </span>
                  </TableCell>
                )}
                <TableCell className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirEdicao(item)}
                      aria-label="Editar"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => excluir(item)}
                      aria-label="Remover"
                      className="text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalAberto} onOpenChange={(aberto) => { if (!aberto) setModalAberto(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`${editando ? "Editar" : novo} ${config.singular}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="catalogo-codigo">Código</Label>
                <Input
                  id="catalogo-codigo"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="C01"
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="catalogo-descricao">Descrição</Label>
                <Input
                  id="catalogo-descricao"
                  required
                  minLength={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição padronizada"
                />
              </div>
            </div>

            {config.temTempo && (
              <div className="grid gap-1.5">
                <Label htmlFor="catalogo-tempo">Tempo estimado (minutos) — opcional</Label>
                <Input
                  id="catalogo-tempo"
                  type="number"
                  min={1}
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Ex.: 90"
                />
              </div>
            )}

            {erroForm && <p className="text-sm text-danger">{erroForm}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function CatalogoDiagnostico() {
  const [tab, setTab] = useState<TipoCatalogo>("causas");
  const ativo = CATALOGOS.find((c) => c.chave === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Catálogo de diagnóstico"
        subtitulo="Padronize as causas, defeitos e soluções escolhidos no fechamento dos chamados."
      />

      <Tabs value={tab} onValueChange={(valor) => setTab(valor as TipoCatalogo)}>
        <TabsList>
          {CATALOGOS.map((c) => (
            <TabsTrigger key={c.chave} value={c.chave}>
              {c.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SecaoCatalogo key={ativo.chave} config={ativo} />
    </div>
  );
}
