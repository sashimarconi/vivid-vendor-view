import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, KeyRound, Loader2, Copy, Check, Trash2 } from "lucide-react";

const AdminSecurity = () => {
  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [unenrollPassword, setUnenrollPassword] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  useEffect(() => {
    if (otpCode.length === 6 && factorId && enrolling) {
      handleVerifyEnroll();
    }
  }, [otpCode]);

  const checkMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.filter((f) => (f.status as string) === "verified");
      setMfaEnabled(verified.length > 0);
      if (verified.length > 0) setFactorId(verified[0].id);
    } catch (err: any) {
      console.error("Erro ao verificar MFA:", err);
    } finally {
      setMfaLoading(false);
    }
  };

  const startEnroll = async () => {
    setEnrolling(true);
    setOtpCode("");
    try {
      // Unenroll any unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.totp?.filter((f) => (f.status as string) === "unverified") || []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "VoidTok Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar configuração do 2FA");
      setEnrolling(false);
    }
  };

  const handleVerifyEnroll = async () => {
    if (otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;

      toast.success("2FA ativado com sucesso!");
      setMfaEnabled(true);
      setEnrolling(false);
      setQrCode("");
      setSecret("");
      setOtpCode("");
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
      setOtpCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    if (!unenrollPassword) {
      toast.error("Digite sua senha atual para desativar o 2FA");
      return;
    }
    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não encontrado");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: unenrollPassword,
      });
      if (signInError) throw new Error("Senha incorreta");

      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast.success("2FA desativado com sucesso!");
      setMfaEnabled(false);
      setFactorId("");
      setUnenrolling(false);
      setUnenrollPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar 2FA");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não encontrado");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Senha atual incorreta");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Segurança</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie a segurança da sua conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2FA Card */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                Autenticação de Dois Fatores
              </div>
              {!mfaLoading && (
                <Badge
                  variant="outline"
                  className={
                    mfaEnabled
                      ? "bg-void-success/10 text-void-success border-void-success/20 text-[10px]"
                      : "bg-muted text-muted-foreground border-border text-[10px]"
                  }
                >
                  {mfaEnabled ? "Ativo" : "Inativo"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : mfaEnabled && !unenrolling ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sua conta está protegida com autenticação de dois fatores (TOTP).
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                  onClick={() => setUnenrolling(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Desativar 2FA
                </Button>
              </div>
            ) : unenrolling ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Digite sua senha atual para confirmar a desativação:
                </p>
                <Input
                  type="password"
                  placeholder="Senha atual"
                  value={unenrollPassword}
                  onChange={(e) => setUnenrollPassword(e.target.value)}
                  className="bg-muted/50 border-border text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={handleUnenroll}
                    disabled={verifying}
                  >
                    {verifying ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setUnenrolling(false);
                      setUnenrollPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : enrolling ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-2.5 rounded-xl">
                    <img src={qrCode} alt="QR Code 2FA" className="w-40 h-40" />
                  </div>
                </div>

                {/* Secret */}
                <button
                  onClick={copySecret}
                  className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 hover:bg-muted/80 transition-colors"
                >
                  <code className="text-[11px] font-mono text-foreground truncate">
                    {secret}
                  </code>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-void-success shrink-0 ml-2" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>

                {/* OTP */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Digite o código do app:
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={verifying}
                    >
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

                {verifying && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Verificando...
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    setEnrolling(false);
                    setQrCode("");
                    setSecret("");
                    setOtpCode("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança com um app autenticador (Google
                  Authenticator, Authy).
                </p>
                <Button
                  size="sm"
                  className="text-xs bg-void-cyan hover:bg-void-cyan/90 text-black"
                  onClick={startEnroll}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Configurar 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="w-4 h-4 text-accent" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Senha atual</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-muted/50 border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="bg-muted/50 border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                  className="bg-muted/50 border-border text-sm"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="text-xs"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : null}
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSecurity;
