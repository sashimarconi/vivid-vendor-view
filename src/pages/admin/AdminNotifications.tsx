import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Bell, BellOff, Loader2, Monitor, Smartphone, Upload, Volume2, TestTube2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PushNotificationToggle from "@/components/admin/PushNotificationToggle";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type SettingsState = Record<string, any>;
type EventKey = "paid" | "pending";

const DEFAULTS: SettingsState = {
  push_enabled: true,
  notify_paid: true,
  notify_pending: true,
  desktop_enabled: true,
  desktop_notify_paid: true,
  desktop_notify_pending: true,
  desktop_paid_title: "Venda aprovada",
  desktop_paid_body: "{{customer_name}} • {{total}}",
  desktop_paid_sound: "cash-register",
  desktop_paid_sound_url: "",
  desktop_paid_icon_url: "",
  desktop_paid_image_url: "",
  desktop_paid_duration_ms: 7000,
  desktop_pending_title: "Venda pendente",
  desktop_pending_body: "PIX gerado • aguardando pagamento • {{total}}",
  desktop_pending_sound: "soft-chime",
  desktop_pending_sound_url: "",
  desktop_pending_icon_url: "",
  desktop_pending_image_url: "",
  desktop_pending_duration_ms: 6000,
  mobile_enabled: true,
  mobile_paid_title: "✅ Venda aprovada",
  mobile_paid_body: "{{customer_name}} • {{total}}",
  mobile_paid_icon_url: "",
  mobile_paid_image_url: "",
  mobile_pending_title: "🔔 Venda pendente",
  mobile_pending_body: "PIX gerado • {{customer_name}} • {{total}}",
  mobile_pending_icon_url: "",
  mobile_pending_image_url: "",
};

const soundOptions = [
  { value: "cash-register", label: "Caixa registradora" },
  { value: "soft-chime", label: "Toque suave" },
  { value: "bell", label: "Campainha" },
  { value: "none", label: "Sem som" },
  { value: "custom", label: "Áudio personalizado" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function renderTemplate(template: string, values: Record<string, string>) {
  return String(template || "")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, values.customer_name)
    .replace(/\{\{\s*total\s*\}\}/gi, values.total)
    .replace(/\{\{\s*gateway\s*\}\}/gi, values.gateway)
    .replace(/\{\{\s*product_title\s*\}\}/gi, values.product_title);
}

function playPreviewSound(kind: EventKey, settings: SettingsState) {
  const preset = settings[`desktop_${kind}_sound`];
  const customUrl = settings[`desktop_${kind}_sound_url`];
  const fallback = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const tone = (freq: number, start: number, duration: number, gain: number) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        g.gain.setValueAtTime(gain, audioCtx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      if (preset === "cash-register") {
        tone(2200, 0, 0.08, 0.28);
        tone(2800, 0.1, 0.08, 0.28);
        tone(3400, 0.2, 0.18, 0.26);
        tone(2600, 0.42, 0.12, 0.2);
        return;
      }
      if (preset === "soft-chime") {
        tone(1200, 0, 0.09, 0.16);
        tone(1600, 0.1, 0.16, 0.14);
        return;
      }
      if (preset === "bell") {
        tone(1500, 0, 0.14, 0.18);
        tone(2100, 0.08, 0.22, 0.16);
      }
    } catch {
      // ignore
    }
  };

  if (preset === "none") return;
  if (customUrl) {
    const audio = new Audio(customUrl);
    audio.preload = "auto";
    void audio.play().catch(fallback);
    return;
  }
  fallback();
}

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState<EventKey | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const imageInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const soundInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data } = await (supabase as any)
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSettings({ ...DEFAULTS, ...(data || {}) });
    setLoading(false);
  }

  async function save(updates: SettingsState) {
    if (!userId) return;
    setSaving(true);

    const nextState = { ...settings, ...updates };
    setSettings(nextState);

    const payload = {
      user_id: userId,
      ...nextState,
      mobile_enabled: nextState.push_enabled,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from("notification_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
      setSettings(settings);
    } else {
      toast.success("Configurações salvas");
    }

    setSaving(false);
  }

  async function uploadAsset(file: File, folder: "images" | "sounds") {
    if (!userId) throw new Error("Usuário não autenticado");
    const ext = file.name.split(".").pop() || (folder === "images" ? "png" : "mp3");
    const path = `${userId}/notification-assets/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleFileUpload(field: string, folder: "images" | "sounds", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadAsset(file, folder);
      await save({ [field]: url });
      toast.success(folder === "images" ? "Imagem enviada" : "Som enviado");
    } catch (error: any) {
      toast.error(error.message || "Falha ao enviar arquivo");
    } finally {
      event.target.value = "";
    }
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações nativas");
      return;
    }

    const result = await Notification.requestPermission();
    if (result === "granted") toast.success("Permissão do navegador liberada");
    else toast.error("Permissão negada no navegador");
  }

  function previewDesktop(kind: EventKey) {
    const title = renderTemplate(settings[`desktop_${kind}_title`], {
      customer_name: "Cliente Teste",
      total: formatCurrency(197.9),
      gateway: "Paradise",
      product_title: "Produto Teste",
    });
    const body = renderTemplate(settings[`desktop_${kind}_body`], {
      customer_name: "Cliente Teste",
      total: formatCurrency(197.9),
      gateway: "Paradise",
      product_title: "Produto Teste",
    });

    playPreviewSound(kind, settings);

    if ("Notification" in window && Notification.permission === "granted") {
      const imageUrl = settings[`desktop_${kind}_image_url`];
      const notification = new Notification(title, {
        body,
        icon: settings[`desktop_${kind}_icon_url`] || "/icon-192.png",
        tag: `desktop-preview-${kind}`,
        ...(imageUrl ? { image: imageUrl } : {}),
      } as NotificationOptions);
      notification.onclick = () => {
        window.focus();
        window.location.href = "/dashboard/orders";
      };
    }

    toast(title, {
      description: body,
      duration: Number(settings[`desktop_${kind}_duration_ms`] || 6000),
    });
  }

  async function sendPushTest(kind: EventKey) {
    if (!userId) return;
    setTestingPush(kind);

    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        event_type: kind === "paid" ? "order_paid" : "order_pending",
        owner_user_id: userId,
        customer_name: "Cliente Teste",
        total_amount: 197.9,
        gateway_name: "Paradise",
        product_title: "Produto Teste",
        url: "/dashboard/orders",
        tag: `push-test-${kind}-${Date.now()}`,
      },
    });

    if (error) toast.error("Falha ao enviar teste para o celular");
    else toast.success("Teste enviado para seus dispositivos cadastrados");
    setTestingPush(null);
  }

  const desktopSummary = useMemo(() => ({
    pending: renderTemplate(settings.desktop_pending_body, {
      customer_name: "Cliente Teste",
      total: formatCurrency(197.9),
      gateway: "Paradise",
      product_title: "Produto Teste",
    }),
    paid: renderTemplate(settings.desktop_paid_body, {
      customer_name: "Cliente Teste",
      total: formatCurrency(197.9),
      gateway: "Paradise",
      product_title: "Produto Teste",
    }),
  }), [settings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle o som, imagem, texto e comportamento das notificações no navegador e no celular.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ativação rápida</CardTitle>
          <CardDescription>Libere permissões e cadastre este dispositivo para receber push.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <PushNotificationToggle />
            <Button variant="outline" onClick={requestBrowserPermission}>
              <Bell className="mr-2 h-4 w-4" />
              Permitir no navegador
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use o botão acima neste PC ou no celular para registrar o dispositivo.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Notificações no PC</CardTitle>
              <CardDescription>Toast na tela + notificação nativa do navegador + som customizável.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ativar alertas no PC</Label>
              <p className="text-xs text-muted-foreground">Mostra alerta de venda enquanto você estiver no painel.</p>
            </div>
            <Switch checked={!!settings.desktop_enabled} disabled={saving} onCheckedChange={(value) => void save({ desktop_enabled: value })} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Venda pendente</Label>
                <p className="text-xs text-muted-foreground">{desktopSummary.pending}</p>
              </div>
              <Switch checked={!!settings.desktop_notify_pending} disabled={saving || !settings.desktop_enabled} onCheckedChange={(value) => void save({ desktop_notify_pending: value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Venda aprovada</Label>
                <p className="text-xs text-muted-foreground">{desktopSummary.paid}</p>
              </div>
              <Switch checked={!!settings.desktop_notify_paid} disabled={saving || !settings.desktop_enabled} onCheckedChange={(value) => void save({ desktop_notify_paid: value })} />
            </div>
          </div>

          {(["pending", "paid"] as EventKey[]).map((kind) => (
            <div key={kind} className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{kind === "paid" ? "Venda aprovada" : "Venda pendente"}</h3>
                  <p className="text-xs text-muted-foreground">Placeholders: {"{{customer_name}}"}, {"{{total}}"}, {"{{gateway}}"}, {"{{product_title}}"}</p>
                </div>
                <Button variant="outline" onClick={() => previewDesktop(kind)}>
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Testar no PC
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={settings[`desktop_${kind}_title`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_title`]: e.target.value }))} onBlur={() => void save({ [`desktop_${kind}_title`]: settings[`desktop_${kind}_title`] })} />
                </div>
                <div className="space-y-2">
                  <Label>Duração (ms)</Label>
                  <Input type="number" min={1000} max={30000} value={settings[`desktop_${kind}_duration_ms`] || 6000} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_duration_ms`]: Number(e.target.value) || 6000 }))} onBlur={() => void save({ [`desktop_${kind}_duration_ms`]: Number(settings[`desktop_${kind}_duration_ms`]) || 6000 })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Texto</Label>
                <Textarea value={settings[`desktop_${kind}_body`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_body`]: e.target.value }))} onBlur={() => void save({ [`desktop_${kind}_body`]: settings[`desktop_${kind}_body`] })} rows={3} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Som</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings[`desktop_${kind}_sound`] || "soft-chime"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSettings((prev) => ({ ...prev, [`desktop_${kind}_sound`]: value }));
                      void save({ [`desktop_${kind}_sound`]: value });
                    }}
                  >
                    {soundOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>URL do som</Label>
                  <div className="flex gap-2">
                    <Input value={settings[`desktop_${kind}_sound_url`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_sound_url`]: e.target.value }))} onBlur={() => void save({ [`desktop_${kind}_sound_url`]: settings[`desktop_${kind}_sound_url`] })} placeholder="https://.../som.mp3" />
                    <Button type="button" variant="outline" onClick={() => soundInputs.current[`desktop_${kind}_sound_url`]?.click()}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <input ref={(el) => (soundInputs.current[`desktop_${kind}_sound_url`] = el)} type="file" accept="audio/*" className="hidden" onChange={(e) => void handleFileUpload(`desktop_${kind}_sound_url`, "sounds", e)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex gap-2">
                    <Input value={settings[`desktop_${kind}_icon_url`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_icon_url`]: e.target.value }))} onBlur={() => void save({ [`desktop_${kind}_icon_url`]: settings[`desktop_${kind}_icon_url`] })} placeholder="https://.../icone.png" />
                    <Button type="button" variant="outline" onClick={() => imageInputs.current[`desktop_${kind}_icon_url`]?.click()}>
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input ref={(el) => (imageInputs.current[`desktop_${kind}_icon_url`] = el)} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFileUpload(`desktop_${kind}_icon_url`, "images", e)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Imagem grande</Label>
                  <div className="flex gap-2">
                    <Input value={settings[`desktop_${kind}_image_url`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`desktop_${kind}_image_url`]: e.target.value }))} onBlur={() => void save({ [`desktop_${kind}_image_url`]: settings[`desktop_${kind}_image_url`] })} placeholder="https://.../banner.png" />
                    <Button type="button" variant="outline" onClick={() => imageInputs.current[`desktop_${kind}_image_url`]?.click()}>
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <input ref={(el) => (imageInputs.current[`desktop_${kind}_image_url`] = el)} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFileUpload(`desktop_${kind}_image_url`, "images", e)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Notificações no celular</CardTitle>
              <CardDescription>Push com mensagens separadas para pedido pendente e pedido aprovado.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ativar push no celular</Label>
              <p className="text-xs text-muted-foreground">Desligando aqui, o backend para de enviar push para seus dispositivos.</p>
            </div>
            <Switch checked={!!settings.push_enabled} disabled={saving} onCheckedChange={(value) => void save({ push_enabled: value, mobile_enabled: value })} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Venda pendente</Label>
                <p className="text-xs text-muted-foreground">Pedido criado / PIX gerado.</p>
              </div>
              <Switch checked={!!settings.notify_pending} disabled={saving || !settings.push_enabled} onCheckedChange={(value) => void save({ notify_pending: value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Venda aprovada</Label>
                <p className="text-xs text-muted-foreground">Pagamento confirmado.</p>
              </div>
              <Switch checked={!!settings.notify_paid} disabled={saving || !settings.push_enabled} onCheckedChange={(value) => void save({ notify_paid: value })} />
            </div>
          </div>

          {(["pending", "paid"] as EventKey[]).map((kind) => (
            <div key={kind} className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{kind === "paid" ? "Push de venda aprovada" : "Push de venda pendente"}</h3>
                  <p className="text-xs text-muted-foreground">Esses textos serão usados no celular.</p>
                </div>
                <Button variant="outline" disabled={testingPush === kind || !settings.push_enabled} onClick={() => void sendPushTest(kind)}>
                  {testingPush === kind ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                  Enviar teste
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={settings[`mobile_${kind}_title`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`mobile_${kind}_title`]: e.target.value }))} onBlur={() => void save({ [`mobile_${kind}_title`]: settings[`mobile_${kind}_title`] })} />
                </div>
                <div className="space-y-2">
                  <Label>Ícone / imagem</Label>
                  <div className="flex gap-2">
                    <Input value={settings[`mobile_${kind}_icon_url`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`mobile_${kind}_icon_url`]: e.target.value }))} onBlur={() => void save({ [`mobile_${kind}_icon_url`]: settings[`mobile_${kind}_icon_url`] })} placeholder="https://.../icone.png" />
                    <Button type="button" variant="outline" onClick={() => imageInputs.current[`mobile_${kind}_icon_url`]?.click()}>
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input ref={(el) => (imageInputs.current[`mobile_${kind}_icon_url`] = el)} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFileUpload(`mobile_${kind}_icon_url`, "images", e)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Texto</Label>
                <Textarea value={settings[`mobile_${kind}_body`] || ""} onChange={(e) => setSettings((prev) => ({ ...prev, [`mobile_${kind}_body`]: e.target.value }))} onBlur={() => void save({ [`mobile_${kind}_body`]: settings[`mobile_${kind}_body`] })} rows={3} />
              </div>
            </div>
          ))}

          {!settings.push_enabled && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <BellOff className="h-4 w-4 shrink-0" />
              <span>As notificações push estão desativadas.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
