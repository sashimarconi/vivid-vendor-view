import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, Search, Settings, Pencil, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import utmifyLogo from "@/assets/utmify-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.jpg";

const PLATFORMS = [
  {
    id: "utmify",
    name: "Utmify",
    description: "Rastreamento de vendas e UTMs para otimização de campanhas",
    icon: utmifyLogo,
    color: "bg-[#0d1117]",
    enabled: true,
    isUtmify: true,
  },
  {
    id: "tiktok",
    name: "TikTok Pixel",
    description: "Rastreie conversões e otimize campanhas no TikTok Ads",
    icon: tiktokLogo,
    color: "bg-black",
    enabled: true,
  },
  {
    id: "meta",
    name: "Meta Pixel",
    description: "Rastreie conversões e otimize campanhas no Meta Ads",
    icon: "📘",
    color: "bg-blue-600 text-white",
    enabled: false,
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Rastreie conversões e otimize campanhas no Google Ads",
    icon: "📊",
    color: "bg-yellow-500 text-white",
    enabled: false,
  },
  {
    id: "google_analytics",
    name: "Google Analytics 4",
    description: "Rastreie e analise o comportamento dos usuários em seu site",
    icon: "📈",
    color: "bg-orange-500 text-white",
    enabled: false,
  },
  {
    id: "kwai",
    name: "Kwai Pixel",
    description: "Rastreie conversões e otimize campanhas no Kwai Ads",
    icon: "🎬",
    color: "bg-orange-600 text-white",
    enabled: false,
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    description: "Gerencie tags e scripts do Google Analytics e outros serviços",
    icon: "🏷️",
    color: "bg-blue-500 text-white",
    enabled: false,
  },
];

type View = "grid" | "list" | "create" | "edit" | "utmify";

const AdminPixels = () => {
  const [view, setView] = useState<View>("grid");
  const [activePlatform, setActivePlatform] = useState<string>("tiktok");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPixelName, setNewPixelName] = useState("");
  const [newPixelId, setNewPixelId] = useState("");
  const [newPixelActive, setNewPixelActive] = useState(true);
  const [fireOnPaidOnly, setFireOnPaidOnly] = useState(false);
  const [editingPixel, setEditingPixel] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pixel queries — proxy via edge function com nome NEUTRO para contornar bloqueadores
  // (uBlock/Brave/AdGuard/Pi-hole) que bloqueiam requests cujo path contém "tracking",
  // "pixel", "ad", "ads" ou "integrations".
  const callPixelsApi = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("conversion-config-manager", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message || "Falha na requisição");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const { data: pixels, isLoading } = useQuery({
    queryKey: ["admin-tracking-pixels"],
    queryFn: async () => {
      const res = await callPixelsApi("list");
      return res.data || [];
    },
  });

  // Utmify queries
  const { data: utmifySettings, isLoading: utmifyLoading } = useQuery({
    queryKey: ["utmify-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utmify_settings" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [utmifyToken, setUtmifyToken] = useState("");
  const [utmifyPlatformName, setUtmifyPlatformName] = useState("VoidTok");
  const [utmifyActive, setUtmifyActive] = useState(true);

  const saveUtmifyMutation = useMutation({
    mutationFn: async () => {
      if (utmifySettings?.id) {
        const { error } = await supabase
          .from("utmify_settings" as any)
          .update({
            api_token: utmifyToken.trim(),
            platform_name: utmifyPlatformName.trim(),
            active: utmifyActive,
          })
          .eq("id", utmifySettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("utmify_settings" as any)
          .insert({
            api_token: utmifyToken.trim(),
            platform_name: utmifyPlatformName.trim(),
            active: utmifyActive,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utmify-settings"] });
      toast({ title: "Utmify configurado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteUtmifyMutation = useMutation({
    mutationFn: async () => {
      if (!utmifySettings?.id) return;
      const { error } = await supabase
        .from("utmify_settings" as any)
        .delete()
        .eq("id", utmifySettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utmify-settings"] });
      setUtmifyToken("");
      setUtmifyPlatformName("VoidTok");
      setUtmifyActive(true);
      toast({ title: "Configuração da Utmify removida!" });
    },
  });

  // Pixel mutations
  const [accessToken, setAccessToken] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      await callPixelsApi("create", {
        payload: {
          pixel_id: newPixelId.trim(),
          name: newPixelName.trim() || null,
          platform: activePlatform,
          active: newPixelActive,
          fire_on_paid_only: fireOnPaidOnly,
          access_token: accessToken.trim() || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      setNewPixelId("");
      setNewPixelName("");
      setNewPixelActive(true);
      setFireOnPaidOnly(false);
      setAccessToken("");
      setView("list");
      toast({ title: "Pixel adicionado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await callPixelsApi("update", { id, payload: { active } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await callPixelsApi("delete", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      toast({ title: "Pixel removido!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; pixel_id: string; name: string | null; active: boolean; fire_on_paid_only: boolean; access_token: string | null }) => {
      await callPixelsApi("update", {
        id: data.id,
        payload: {
          pixel_id: data.pixel_id,
          name: data.name,
          active: data.active,
          fire_on_paid_only: data.fire_on_paid_only,
          access_token: data.access_token,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
      setEditingPixel(null);
      setView("list");
      toast({ title: "Pixel atualizado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openEdit = (pixel: any) => {
    setEditingPixel({ ...pixel });
    setView("edit");
  };

  const platformPixels = (pixels || []).filter((p: any) => p.platform === activePlatform);
  const filteredPixels = platformPixels.filter((p: any) =>
    p.pixel_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const platform = PLATFORMS.find(p => p.id === activePlatform);

  const renderPlatformIcon = (p: typeof PLATFORMS[0], size = "w-10 h-10") => {
    if (typeof p.icon === "string" && (p.icon.endsWith(".png") || p.icon.endsWith(".jpg"))) {
      return (
        <div className={`${size} rounded-xl ${p.color} flex items-center justify-center shrink-0 overflow-hidden`}>
          <img src={p.icon} alt={p.name} className="w-full h-full object-cover rounded-xl" />
        </div>
      );
    }
    return (
      <div className={`${size} rounded-xl ${p.color} flex items-center justify-center text-lg shrink-0`}>
        {p.icon}
      </div>
    );
  };

  // ─── Utmify config view ───
  if (view === "utmify") {
    const hasExisting = !!utmifySettings;
    const tokenValue = utmifyToken || utmifySettings?.api_token || "";
    const platformNameValue = utmifyPlatformName || utmifySettings?.platform_name || "VoidTok";
    const activeValue = utmifySettings ? (utmifyActive !== undefined ? utmifyActive : utmifySettings.active) : utmifyActive;

    // Sync state on first render
    if (utmifySettings && !utmifyToken && utmifySettings.api_token) {
      setUtmifyToken(utmifySettings.api_token);
      setUtmifyPlatformName(utmifySettings.platform_name || "VoidTok");
      setUtmifyActive(utmifySettings.active);
    }

    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
          <span>/</span>
          <span className="text-foreground">Utmify</span>
        </div>

        <div className="flex items-center gap-3">
          <img src={utmifyLogo} alt="Utmify" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Utmify</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Rastreamento automático de vendas e UTMs</p>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Credencial de API (x-api-token)</Label>
              <Input
                type="password"
                value={utmifyToken}
                onChange={(e) => setUtmifyToken(e.target.value)}
                placeholder="Ex: KVRxalfMiBfm8Rm1nP5YxfwYzArNsA0VLeWC"
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Utmify → Integrações → Webhooks → Credenciais de API
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Nome da Plataforma</Label>
              <Input
                value={utmifyPlatformName}
                onChange={(e) => setUtmifyPlatformName(e.target.value)}
                placeholder="Ex: VoidTok"
              />
              <p className="text-xs text-muted-foreground">
                Esse nome aparecerá nos pedidos dentro da Utmify (campo "platform")
              </p>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Integração Ativa</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quando ativa, os pedidos serão enviados automaticamente para a Utmify
                </p>
              </div>
              <Switch checked={utmifyActive} onCheckedChange={setUtmifyActive} />
            </div>

            <div className="flex justify-between pt-2">
              {hasExisting && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => deleteUtmifyMutation.mutate()}
                  disabled={deleteUtmifyMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Remover
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setView("grid")}>Cancelar</Button>
                <Button
                  onClick={() => saveUtmifyMutation.mutate()}
                  disabled={!utmifyToken.trim() || saveUtmifyMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Como funciona:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Quando um pedido PIX é <strong>gerado</strong>, enviamos com status <code className="text-primary/80">waiting_payment</code></li>
            <li>Quando o pagamento é <strong>confirmado</strong>, enviamos com status <code className="text-primary/80">paid</code></li>
            <li>Os dados de UTM são capturados automaticamente da URL do checkout</li>
            <li>Cada conta de usuário usa sua própria credencial — dados completamente isolados</li>
          </ul>
        </div>
      </div>
    );
  }

  // ─── Grid view (main integrations page) ───
  if (view === "grid") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">Pixels, rastreamento e ferramentas de marketing</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => (
            <Card
              key={p.id}
              className={`border-border transition-all ${p.enabled ? "hover:border-primary/50 cursor-pointer" : "opacity-60"}`}
              onClick={() => {
                if (!p.enabled) {
                  toast({ title: "Em breve", description: `${p.name} será implementado em breve!` });
                  return;
                }
                if (p.isUtmify) {
                  setView("utmify");
                  return;
                }
                setActivePlatform(p.id);
                setView("list");
              }}
            >
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  {renderPlatformIcon(p)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      {p.id === "utmify" && utmifySettings?.active && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-marketplace-green/15 text-marketplace-green">Conectado</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    disabled={!p.enabled}
                  >
                    Configurar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Create pixel form ───
  if (view === "create") {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
          <span>/</span>
          <button onClick={() => setView("list")} className="hover:text-foreground transition-colors">{platform?.name}</button>
          <span>/</span>
          <span className="text-foreground">Criar</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Criar {platform?.name}</h1>

        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Nome</Label>
              <Input
                value={newPixelName}
                onChange={(e) => setNewPixelName(e.target.value)}
                placeholder="Ex: Campanha Principal"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Pixel ID</Label>
              <Input
                value={newPixelId}
                onChange={(e) => setNewPixelId(e.target.value)}
                placeholder="Ex: CXXXXXXXXXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-primary">
                  Access Token (Events API) <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                  Obrigatório
                </span>
              </div>
              <Input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Cole aqui o Access Token da Events API do TikTok"
                type="password"
                className={!accessToken.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
              />
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sem o Access Token o pixel NÃO vai marcar conversões
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O TikTok Ads exige o Access Token da <strong>Events API</strong> para receber conversões pelo servidor (S2S).
                  Sem ele, o pixel só funciona via navegador — e a maioria dos visitantes tem ad-blocker, navegação fechada antes do tempo, iOS com proteção de rastreamento, etc.
                  Resultado: <strong>quase nenhuma venda aparece no TikTok</strong>.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Onde achar:</strong> TikTok Ads → Ferramentas → Events Manager → seu Pixel → aba "Configurar" → "Configurar Events API" → "Gerar Access Token".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Disparar apenas quando a venda estiver paga</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dispara o pixel SOMENTE quando o pagamento for confirmado (não dispara na criação)</p>
              </div>
              <Switch checked={fireOnPaidOnly} onCheckedChange={setFireOnPaidOnly} />
            </div>

            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-semibold text-foreground">Conversão Ativa</p>
              <Switch checked={newPixelActive} onCheckedChange={setNewPixelActive} />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (!accessToken.trim()) {
                    toast({
                      title: "Access Token é obrigatório",
                      description: "Sem o Access Token o TikTok não vai receber as conversões. Cole o token gerado no Events Manager.",
                      variant: "destructive",
                    });
                    return;
                  }
                  addMutation.mutate();
                }}
                disabled={!newPixelId.trim() || addMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Edit pixel form ───
  if (view === "edit" && editingPixel) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
          <span>/</span>
          <button onClick={() => { setView("list"); setEditingPixel(null); }} className="hover:text-foreground transition-colors">{platform?.name}</button>
          <span>/</span>
          <span className="text-foreground">Editar</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Editar Pixel</h1>

        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Nome</Label>
              <Input
                value={editingPixel.name ?? ""}
                onChange={(e) => setEditingPixel({ ...editingPixel, name: e.target.value })}
                placeholder="Ex: Campanha Principal"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary">Pixel ID</Label>
              <Input
                value={editingPixel.pixel_id}
                onChange={(e) => setEditingPixel({ ...editingPixel, pixel_id: e.target.value })}
                placeholder="Ex: CXXXXXXXXXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-primary">
                  Access Token (Events API) <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                  Obrigatório
                </span>
              </div>
              <Input
                value={editingPixel.access_token ?? ""}
                onChange={(e) => setEditingPixel({ ...editingPixel, access_token: e.target.value })}
                placeholder="Cole aqui o Access Token da Events API do TikTok"
                type="password"
                className={!editingPixel.access_token?.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
              />
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sem o Access Token o pixel NÃO marca conversões no TikTok
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gere em: TikTok Ads → Ferramentas → Events Manager → seu Pixel → aba "Configurar" → "Configurar Events API" → "Gerar Access Token".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Disparar apenas quando a venda estiver paga</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dispara o pixel SOMENTE quando o pagamento for confirmado</p>
              </div>
              <Switch
                checked={editingPixel.fire_on_paid_only ?? false}
                onCheckedChange={(checked) => setEditingPixel({ ...editingPixel, fire_on_paid_only: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <p className="text-sm font-semibold text-foreground">Conversão Ativa</p>
              <Switch
                checked={editingPixel.active}
                onCheckedChange={(checked) => setEditingPixel({ ...editingPixel, active: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setView("list"); setEditingPixel(null); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => updateMutation.mutate({
                  id: editingPixel.id,
                  pixel_id: editingPixel.pixel_id.trim(),
                  name: editingPixel.name?.trim() || null,
                  active: editingPixel.active,
                  fire_on_paid_only: editingPixel.fire_on_paid_only ?? false,
                  access_token: editingPixel.access_token?.trim() || null,
                })}
                disabled={!editingPixel.pixel_id.trim() || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── List view (pixels for a platform) ───
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setView("grid")} className="hover:text-foreground transition-colors">Integrações</button>
        <span>/</span>
        <span className="text-foreground">{platform?.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {platform && renderPlatformIcon(platform)}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{platform?.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Integração nativa com pixel do {platform?.name} para rastreio de suas vendas.</p>
          </div>
        </div>
        <Button onClick={() => setView("create")} className="bg-primary hover:bg-primary/90 gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Novo Pixel
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pixels..."
            className="pl-9"
          />
        </div>
      </div>

      {!isLoading && filteredPixels.some((p: any) => !p.access_token) && activePlatform === "tiktok" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-destructive">Você tem pixels SEM Access Token</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pixels marcados com <span className="font-semibold text-destructive">"Sem token"</span> abaixo NÃO conseguem mandar conversões pelo servidor para o TikTok.
              Isso explica por que suas vendas não estão aparecendo no Events Manager mesmo gerando PIX.
              <strong> Edite cada pixel e cole o Access Token gerado no TikTok Events Manager.</strong>
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filteredPixels.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mx-auto mb-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Nenhum pixel encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Comece criando um novo pixel para sua integração</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPixels.map((pixel: any) => (
            <Card key={pixel.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {platform && renderPlatformIcon(platform, "w-9 h-9")}
                  <div>
                    <p className="text-sm font-medium text-foreground">{pixel.pixel_id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground capitalize">{pixel.platform}</p>
                      {activePlatform === "tiktok" && !pixel.access_token && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/15 text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Sem token — não marca conversão
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pixel.active ? "bg-marketplace-green/15 text-marketplace-green" : "bg-muted text-muted-foreground"}`}>
                      {pixel.active ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={pixel.active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: pixel.id, active: checked })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(pixel)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(pixel.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          O evento <strong>Purchase</strong> será disparado automaticamente quando um pagamento PIX for gerado.
        </p>
      </div>
    </div>
  );
};

export default AdminPixels;
