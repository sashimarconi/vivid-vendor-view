import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import MfaVerify from "@/components/auth/MfaVerify";
import MfaEnroll from "@/components/auth/MfaEnroll";

type LoginStep = "credentials" | "mfa-verify" | "mfa-enroll";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useState(() => {
    document.documentElement.classList.add("dark");
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Acesso negado", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check MFA factors
    try {
      const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors();
      if (mfaError) throw mfaError;

      const verifiedFactors = factors.totp.filter((f) => (f.status as string) === "verified");

      if (verifiedFactors.length > 0) {
        // Has verified TOTP factor — need verification
        setMfaFactorId(verifiedFactors[0].id);
        setStep("mfa-verify");
      } else {
        // No 2FA — show enrollment
        setStep("mfa-enroll");
      }
    } catch {
      // If MFA check fails, just proceed
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleMfaSuccess = () => {
    navigate("/dashboard");
  };

  const handleMfaSkip = () => {
    navigate("/dashboard");
  };

  if (step === "mfa-verify") {
    return <MfaVerify factorId={mfaFactorId} onSuccess={handleMfaSuccess} />;
  }

  if (step === "mfa-enroll") {
    return <MfaEnroll onSuccess={handleMfaSuccess} onSkip={handleMfaSkip} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 void-gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-void-purple/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-void-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-void-purple to-void-cyan void-glow-purple mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl">
            <span className="text-foreground">Void</span>
            <span className="text-void-cyan">Tok</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border p-6 space-y-6 void-glow-purple-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-muted/50 border-border focus:border-void-purple focus:ring-void-purple/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-muted/50 border-border focus:border-void-purple focus:ring-void-purple/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  if (!email.trim()) {
                    toast({ title: "Digite seu e-mail", description: "Informe o e-mail para recuperar a senha", variant: "destructive" });
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast({ title: "Erro", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha" });
                  }
                }}
                className="text-xs text-void-cyan hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <Button
              type="submit"
              className="w-full bg-void-cyan hover:bg-void-cyan/90 text-black font-display font-bold tracking-wide void-glow-cyan-sm hover:void-glow-cyan transition-all"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Acessar Painel"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
