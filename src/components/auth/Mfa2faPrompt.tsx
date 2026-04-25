import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Mfa2faPromptProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * Prompts the user for their TOTP code and elevates the current session to AAL2.
 * Required by Supabase before updating email/password when MFA is enabled.
 */
const Mfa2faPrompt = ({ open, onClose, onVerified }: Mfa2faPromptProps) => {
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFactor, setLoadingFactor] = useState(true);

  useEffect(() => {
    if (!open) {
      setCode("");
      return;
    }
    setLoadingFactor(true);
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error || !data?.totp?.length) {
        toast.error("Nenhum fator MFA encontrado.");
        onClose();
        return;
      }
      const verified = data.totp.find((f) => f.status === "verified") ?? data.totp[0];
      setFactorId(verified.id);
      setLoadingFactor(false);
    });
  }, [open]);

  useEffect(() => {
    if (code.length === 6 && factorId && !loading) {
      handleVerify();
    }
  }, [code, factorId]);

  const handleVerify = async () => {
    if (!factorId) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      toast.success("Verificação 2FA concluída.");
      onVerified();
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verificação 2FA
          </DialogTitle>
          <DialogDescription>
            Sua conta tem 2FA ativado. Digite o código do app autenticador para alterar a senha.
          </DialogDescription>
        </DialogHeader>

        {loadingFactor ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
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
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Mfa2faPrompt;
