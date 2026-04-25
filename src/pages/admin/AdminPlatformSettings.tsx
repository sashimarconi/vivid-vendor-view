import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Settings2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GATEWAYS_DEFAULTS: Record<string, { label: string; description: string; logoUrl: string }> = {
  blackcatpay: {
    label: "BlackCatPay",
    description: "Gateway de pagamentos PIX rápido e seguro",
    logoUrl: "https://app.cloudfycheckout.com/_next/image?url=%2Fgateways%2FblackCat.png&w=3840&q=75",
  },
  ghostspay: {
    label: "GhostsPay",
    description: "Gateway de pagamentos PIX com alta conversão",
    logoUrl: "https://app.cloudfycheckout.com/gateways/ghostPay.svg",
  },
  duck: {
    label: "Duck",
    description: "Gateway de pagamentos PIX simples e eficiente",
    logoUrl: "https://app.usecorvex.com.br/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fduni5gxk4%2Fimage%2Fupload%2Fv1773135358%2Facquirers%2Flogos%2Fvgsat7jyqfqtbnby8zwg.jpg&w=3840&q=75",
  },
  hisounique: {
    label: "Hiso Unique",
    description: "Plataforma moderna e segura para pagamentos digitais",
    logoUrl: "https://hisoftware-assets.s3.us-east-2.amazonaws.com/uploads/1768398933749-HIGH-SOFTWARE-LOGO-3-01.png",
  },
  paradise: {
    label: "Paradise",
    description: "Gateway PIX com checkout otimizado para conversão",
    logoUrl: "https://multi.paradisepags.com/assets/images/a.png",
  },
};

const AdminPlatformSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const logoOpenRef = useRef<HTMLInputElement>(null);
  const logoClosedRef = useRef<HTMLInputElement>(null);
  const logoOpenLightRef = useRef<HTMLInputElement>(null);
  const logoClosedLightRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [editGateway, setEditGateway] = useState<string | null>(null);
  const [gwForm, setGwForm] = useState({ display_name: "", description: "", logo_url: "" });
  const gwLogoRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.key] = row.value || "";
      });
      return map;
    },
  });

  // Gateway catalog names from GATEWAYS_DEFAULTS keys
  const gatewayNames = Object.keys(GATEWAYS_DEFAULTS);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Configuração salva!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateGateway = useMutation({
    mutationFn: async ({ gatewayName, display_name, description, logo_url }: { gatewayName: string; display_name: string; description: string; logo_url: string }) => {
      const meta = JSON.stringify({ display_name, description, logo_url });
      const key = `gateway_meta_${gatewayName}`;
      // Upsert into platform_settings
      const { data: existing } = await (supabase as any)
        .from("platform_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();
      if (existing) {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .update({ value: meta, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .insert({ key, value: meta });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      setEditGateway(null);
      toast({ title: "Gateway atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleUpload = async (file: File, key: string) => {
    setUploading(key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/platform-${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      await updateSetting.mutateAsync({ key, value: urlData.publicUrl });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleGwLogoUpload = async (file: File) => {
    setUploading("gw-logo");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/gateway-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setGwForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  const items = [
    {
      key: "sidebar_logo_open",
      label: "Logo da Sidebar Aberta (Dark)",
      desc: "Logo exibida no tema escuro quando a sidebar está expandida. Recomendado: 160×32 px (PNG transparente)",
      ref: logoOpenRef,
    },
    {
      key: "sidebar_logo_open_light",
      label: "Logo da Sidebar Aberta (Light)",
      desc: "Logo exibida no tema claro quando a sidebar está expandida. Recomendado: 160×32 px (PNG transparente)",
      ref: logoOpenLightRef,
    },
    {
      key: "sidebar_logo_collapsed",
      label: "Logo da Sidebar Fechada (Dark)",
      desc: "Ícone exibido no tema escuro quando a sidebar está colapsada. Recomendado: 32×32 px (PNG transparente)",
      ref: logoClosedRef,
    },
    {
      key: "sidebar_logo_collapsed_light",
      label: "Logo da Sidebar Fechada (Light)",
      desc: "Ícone exibido no tema claro quando a sidebar está colapsada. Recomendado: 32×32 px (PNG transparente)",
      ref: logoClosedLightRef,
    },
    {
      key: "dashboard_banner_url",
      label: "Banner do Dashboard",
      desc: "Banner exibido no topo do dashboard dos usuários. Recomendado: 1200×300 px (JPG ou PNG)",
      ref: bannerRef,
    },
  ];

  const getGatewayMeta = (name: string) => {
    const raw = settings?.[`gateway_meta_${name}`];
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  };

  const openEditGateway = (name: string) => {
    const defaults = GATEWAYS_DEFAULTS[name];
    const meta = getGatewayMeta(name);
    setGwForm({
      display_name: meta?.display_name || defaults?.label || name,
      description: meta?.description || defaults?.description || "",
      logo_url: meta?.logo_url || defaults?.logoUrl || "",
    });
    setEditGateway(name);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configurações da <span className="text-destructive">Plataforma</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie logos, banner e personalização dos gateways</p>
      </div>

      <div className="grid gap-5">
        {items.map((item) => (
          <Card key={item.key} className="border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div>
                  <Label className="text-sm font-semibold">{item.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>

                {settings?.[item.key] && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center justify-center">
                    <img
                      src={settings[item.key]}
                      alt={item.label}
                      className={item.key === "dashboard_banner_url" ? "max-h-[120px] w-full object-cover rounded-md" : "max-h-[40px] object-contain"}
                    />
                  </div>
                )}

                <input
                  ref={item.ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, item.key);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={uploading === item.key}
                    onClick={() => item.ref.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading === item.key ? "Enviando..." : "Upload"}
                  </Button>
                  {settings?.[item.key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => updateSetting.mutate({ key: item.key, value: "" })}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Banner link */}
        <Card className="border-border/60 bg-card">
          <CardContent className="p-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Link do Banner (opcional)</Label>
              <p className="text-xs text-muted-foreground">URL para onde o banner redireciona ao clicar</p>
              <div className="flex gap-2">
                <Input
                  defaultValue={settings?.dashboard_banner_link || ""}
                  placeholder="https://..."
                  className="flex-1"
                  onBlur={(e) => updateSetting.mutate({ key: "dashboard_banner_link", value: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Customization */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            Personalização dos Gateways
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edite o nome, descrição e logo dos gateways configurados pelos usuários
          </p>
        </div>

        <div className="grid gap-3">
          {gatewayNames.map((name) => {
            const defaults = GATEWAYS_DEFAULTS[name];
            const meta = getGatewayMeta(name);
            const displayName = meta?.display_name || defaults?.label || name;
            const displayDesc = meta?.description || defaults?.description || "";
            const displayLogo = meta?.logo_url || defaults?.logoUrl || "";

            return (
              <Card key={name} className="border-border/60 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {displayLogo && (
                        <img
                          src={displayLogo}
                          alt={displayName}
                          className="w-9 h-9 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{displayDesc}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => openEditGateway(name)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Gateway Dialog */}
      <Dialog open={!!editGateway} onOpenChange={(open) => !open && setEditGateway(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Personalizar Gateway</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Nome de exibição</Label>
              <Input
                value={gwForm.display_name}
                onChange={(e) => setGwForm((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Ex: BlackCatPay"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={gwForm.description}
                onChange={(e) => setGwForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Gateway de pagamentos PIX..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Logo do Gateway</Label>
              {gwForm.logo_url && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center justify-center">
                  <img src={gwForm.logo_url} alt="Logo" className="max-h-[40px] object-contain" />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={gwForm.logo_url}
                  onChange={(e) => setGwForm((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="URL da logo ou faça upload"
                  className="flex-1"
                />
                <input
                  ref={gwLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleGwLogoUpload(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading === "gw-logo"}
                  onClick={() => gwLogoRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                if (editGateway) {
                  updateGateway.mutate({
                    gatewayName: editGateway,
                    display_name: gwForm.display_name,
                    description: gwForm.description,
                    logo_url: gwForm.logo_url,
                  });
                }
              }}
              disabled={updateGateway.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlatformSettings;
