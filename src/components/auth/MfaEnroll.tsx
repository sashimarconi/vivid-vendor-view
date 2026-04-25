import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface MfaEnrollProps {
  onSuccess: () => void;
  onSkip?: () => void;
}

const MfaEnroll = ({ onSuccess, onSkip }: MfaEnrollProps) => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    enrollFactor();
  }, []);

  useEffect(() => {
    if (code.length === 6 && factorId) {
      handleVerify();
    }
  }, [code]);

  const enrollFactor = async () => {
    setEnrolling(true);
    try {
      // Limpa fatores TOTP não verificados (de tentativas anteriores) para evitar
      // conflito de "friendly name already exists".
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stale = existing?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      // Se já existe um fator verificado, não precisa cadastrar de novo.
      const verified = existing?.totp?.find((f) => f.status === "verified");
      if (verified) {
        toast.success("2FA já está configurado.");
        onSuccess();
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `VoidTok Authenticator ${Date.now()}`,
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao configurar 2FA");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !factorId) return;
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      toast.success("2FA configurado com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Código inválido. Tente novamente.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (enrolling) {
    return (
      <div className="min-h-screen flex items-center justify-center void-gradient-bg">
        <Loader2 className="w-7 h-7 animate-spin text-void-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 void-gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-void-purple/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-void-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-void-purple to-void-cyan void-glow-purple mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground">Configurar 2FA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escaneie o QR Code com seu app autenticador
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-6 space-y-5 void-glow-purple-sm">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
          </div>

          {/* Secret key */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground text-center">
              Ou copie o código manualmente:
            </p>
            <button
              onClick={copySecret}
              className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 hover:bg-muted/80 transition-colors"
            >
              <code className="text-xs font-mono text-foreground truncate">{secret}</code>
              {copied ? (
                <Check className="w-4 h-4 text-void-success shrink-0 ml-2" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
              )}
            </button>
          </div>

          {/* OTP input */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Digite o código gerado pelo app:
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading}>
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
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
            </div>
          )}

          {onSkip && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
              Configurar depois
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaEnroll;
