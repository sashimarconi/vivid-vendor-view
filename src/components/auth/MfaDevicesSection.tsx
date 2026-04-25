import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Smartphone, Plus, Trash2, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Mfa2faPrompt from "./Mfa2faPrompt";

interface Factor {
  id: string;
  friendly_name?: string | null;
  status: string;
  created_at: string;
}

const MfaDevicesSection = () => {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);

  // Add device dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [friendlyName, setFriendlyName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // AAL2 step-up for removal
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [aal2Open, setAal2Open] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("Erro ao carregar dispositivos 2FA");
      setLoading(false);
      return;
    }
    const totp = (data?.totp ?? []) as Factor[];
    setFactors(totp.filter((f) => f.status === "verified"));
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const startEnroll = async () => {
    const name = friendlyName.trim() || `Dispositivo ${new Date().toLocaleDateString("pt-BR")}`;
    setEnrolling(true);
    setQrCode("");
    setSecret("");
    setFactorId("");
    setCode("");
    try {
      // Clean up any unverified leftovers
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stale = existing?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `${name} - ${Date.now()}`,
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar cadastro");
      setAddOpen(false);
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !factorId) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      toast.success("Dispositivo cadastrado com sucesso!");
      setAddOpen(false);
      setFriendlyName("");
      setQrCode("");
      setSecret("");
      setFactorId("");
      setCode("");
      await loadFactors();
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (code.length === 6 && factorId && !verifying) {
      handleVerify();
    }
  }, [code, factorId]);

  const openAddDialog = () => {
    setAddOpen(true);
    setFriendlyName("");
    setQrCode("");
    setSecret("");
    setCode("");
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const performRemove = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("AAL2") || (error as any).code === "insufficient_aal") {
        setPendingRemoveId(id);
        setAal2Open(true);
        return;
      }
      toast.error(msg || "Erro ao remover dispositivo");
      return;
    }
    toast.success("Dispositivo removido");
    await loadFactors();
  };

  const handleRemove = (id: string, name?: string | null) => {
    if (!confirm(`Remover o dispositivo "${name || "2FA"}"? Você não poderá mais usá-lo para entrar.`)) return;
    performRemove(id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Autenticação em 2 Fatores (2FA)
        </CardTitle>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar dispositivo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : factors.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nenhum dispositivo 2FA cadastrado.
          </div>
        ) : (
          <div className="space-y-2">
            {factors.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {f.friendly_name || "Dispositivo sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adicionado em {format(new Date(f.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Ativo</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(f.id, f.friendly_name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Cadastre o mesmo código em vários aparelhos (celular, tablet, notebook) usando apps como Google Authenticator, Authy ou 1Password.
        </p>
      </CardContent>

      {/* Add device dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar novo dispositivo 2FA</DialogTitle>
            <DialogDescription>
              Use seu app autenticador para escanear o QR Code ou digitar o código manualmente.
            </DialogDescription>
          </DialogHeader>

          {!qrCode ? (
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nome do dispositivo (opcional)
              </label>
              <input
                type="text"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="Ex: iPhone do trabalho"
                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm"
              />
              <Button onClick={startEnroll} disabled={enrolling} className="w-full">
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Gerar QR Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44" />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground text-center">Ou digite manualmente:</p>
                <button
                  onClick={copySecret}
                  className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-md px-3 py-2 hover:bg-muted/80 transition-colors"
                >
                  <code className="text-xs font-mono text-foreground truncate">{secret}</code>
                  {copied ? (
                    <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Digite o código de 6 dígitos do app:
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode} disabled={verifying}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {verifying && (
                  <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AAL2 prompt for removal */}
      <Mfa2faPrompt
        open={aal2Open}
        onClose={() => {
          setAal2Open(false);
          setPendingRemoveId(null);
        }}
        onVerified={async () => {
          setAal2Open(false);
          if (pendingRemoveId) {
            await performRemove(pendingRemoveId);
            setPendingRemoveId(null);
          }
        }}
      />
    </Card>
  );
};

export default MfaDevicesSection;
