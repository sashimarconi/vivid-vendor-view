import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle } from "lucide-react";
import Mfa2faPrompt from "@/components/auth/Mfa2faPrompt";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const performUpdate = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("AAL2") || (error as any).code === "insufficient_aal") {
        setLoading(false);
        setMfaOpen(true);
        return;
      }
      toast({ title: "Erro ao redefinir senha", description: msg, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Senha redefinida com sucesso!" });
      setTimeout(() => navigate("/login"), 3000);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");

    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "Verifique e tente novamente", variant: "destructive" });
      return;
    }

    await performUpdate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 void-gradient-bg relative overflow-hidden">
      <Mfa2faPrompt
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        onVerified={async () => {
          setMfaOpen(false);
          await performUpdate();
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-void-purple/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-void-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-void-purple to-void-cyan void-glow-purple mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground">Redefinir Senha</h1>
          <p className="text-sm text-muted-foreground mt-1">Digite sua nova senha abaixo</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-6 space-y-6 void-glow-purple-sm">
          {success ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle className="w-12 h-12 text-void-cyan mx-auto" />
              <p className="text-foreground font-semibold">Senha redefinida!</p>
              <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
            </div>
          ) : !isRecovery ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-muted-foreground text-sm">
                Link inválido ou expirado. Solicite um novo link de recuperação na tela de login.
              </p>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Voltar ao Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-muted/50 border-border focus:border-void-purple focus:ring-void-purple/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-muted/50 border-border focus:border-void-purple focus:ring-void-purple/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-void-cyan hover:bg-void-cyan/90 text-black font-display font-bold tracking-wide void-glow-cyan-sm hover:void-glow-cyan transition-all"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Redefinir Senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
