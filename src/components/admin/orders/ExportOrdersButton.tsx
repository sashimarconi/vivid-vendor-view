import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getEffectiveStatus } from "./order-utils";
import type { AdminOrderRecord } from "./types";

interface Props {
  orders: AdminOrderRecord[];
}

type PaidFilter = "all" | "paid";

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[",\n;]/.test(str) ? `"${str}"` : str;
};

export const ExportOrdersButton = ({ orders }: Props) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");

  const handleExport = () => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    const filtered = orders.filter((order) => {
      const created = new Date(order.created_at);
      if (start && created < start) return false;
      if (end && created > end) return false;
      if (paidFilter === "paid" && getEffectiveStatus(order) !== "paid") return false;
      return true;
    });

    if (filtered.length === 0) {
      toast.error("Nenhum lead encontrado com esses filtros");
      return;
    }

    const headers = [
      "ID do pedido",
      "Data de criação",
      "Data de pagamento",
      "Status",
      "Método",
      "Nome",
      "Email",
      "Telefone",
      "Documento (CPF)",
      "CEP",
      "Endereço",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "Estado",
      "Produto",
      "Variante",
      "Quantidade",
      "Subtotal",
      "Frete",
      "Order bumps",
      "Total",
      "ID transação",
      "PIX copiado",
      "IP",
      "User Agent",
    ];

    const rows = filtered.map((o) => [
      o.id,
      o.created_at,
      o.paid_at || "",
      getEffectiveStatus(o),
      o.payment_method,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.customer_document,
      o.customer_cep || "",
      o.customer_address || "",
      o.customer_number || "",
      o.customer_complement || "",
      o.customer_neighborhood || "",
      o.customer_city || "",
      o.customer_state || "",
      o.product?.title || "",
      o.variant_name || o.product_variant || "",
      o.quantity,
      o.subtotal,
      o.shipping_cost ?? 0,
      o.bumps_total ?? 0,
      o.total,
      o.transaction_id || "",
      o.pix_copied ? "Sim" : "Não",
      o.customer_ip || "",
      o.customer_user_agent || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.download = `leads-${paidFilter === "paid" ? "pagos" : "todos"}-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${filtered.length} leads exportados`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar leads</span>
          <span className="sm:hidden">Exportar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Exportar leads</p>
            <p className="text-xs text-muted-foreground mt-0.5">Gera um arquivo CSV com os dados dos clientes.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="export-start" className="text-[11px] text-muted-foreground">De</Label>
                <Input
                  id="export-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="export-end" className="text-[11px] text-muted-foreground">Até</Label>
                <Input
                  id="export-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Deixe em branco para incluir todas as datas.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos</p>
            <div className="flex gap-2">
              {([
                { value: "all", label: "Todos" },
                { value: "paid", label: "Somente pagos" },
              ] as { value: PaidFilter; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaidFilter(opt.value)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    paidFilter === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Baixar CSV
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
