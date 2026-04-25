import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface MfaVerifyProps {
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const MfaVerify = ({ factorId, onSuccess, onCancel }: MfaVerifyProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
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

      toast.success("Autenticação verificada com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Código inválido. Tente novamente.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 void-gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-void-purple/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-void-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-void-purple to-void-cyan void-glow-purple mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground">Verificação 2FA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digite o código do seu aplicativo autenticador
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-6 space-y-6 void-glow-purple-sm">
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

          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
            </div>
          )}

          {onCancel && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaVerify;
