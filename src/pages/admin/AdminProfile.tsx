import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Crown, Save, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Mfa2faPrompt from "@/components/auth/Mfa2faPrompt";
import MfaDevicesSection from "@/components/auth/MfaDevicesSection";

const AdminProfile = () => {
  const { toast } = useToast();
  const { plan, planType, isLoading: planLoading } = usePlanLimits();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);

  const performPasswordUpdate = async () => {
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("AAL2") || (error as any).code === "insufficient_aal") {
        setChangingPassword(false);
        setMfaOpen(true);
        return;
      }
      toast({ title: "Erro ao alterar senha", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setChangingPassword(false);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");
      setCreatedAt(user.created_at || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url || "");
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : email ? email[0].toUpperCase() : "U";

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/15 text-primary border-primary/30",
    enterprise: "bg-accent/15 text-accent border-accent/30",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar & Summary Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <Avatar className="w-20 h-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary to-accent text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{fullName || "Sem nome"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <Badge className={planColors[planType] || planColors.free} variant="outline">
              <Crown className="w-3 h-3 mr-1" />
              Plano {planType.charAt(0).toUpperCase() + planType.slice(1)}
            </Badge>
            {createdAt && (
              <p className="text-xs text-muted-foreground">
                Membro desde {format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                E-mail
              </Label>
              <Input id="email" value={email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nome Completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">URL do Avatar</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/sua-foto.jpg"
              />
            </div>

            {createdAt && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Conta criada em
                </Label>
                <Input
                  value={format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  disabled
                  className="opacity-60"
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            disabled={changingPassword || !newPassword || !confirmNewPassword}
            onClick={async () => {
              if (newPassword.length < 6) {
                toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres", variant: "destructive" });
                return;
              }
              if (newPassword !== confirmNewPassword) {
                toast({ title: "Senhas não coincidem", variant: "destructive" });
                return;
              }
              await performPasswordUpdate();
            }}
            className="w-full sm:w-auto"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      <Mfa2faPrompt
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        onVerified={async () => {
          setMfaOpen(false);
          await performPasswordUpdate();
        }}
      />

      <MfaDevicesSection />

      {/* Plan Info */}
      {!planLoading && plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Detalhes do Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Plano Atual</p>
                <p className="text-lg font-bold mt-1 capitalize">{planType}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Taxa por Transação</p>
                <p className="text-lg font-bold mt-1">{plan.transactionFeePercent}%</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Mensalidade</p>
                <p className="text-lg font-bold mt-1">
                  {plan.monthlyPrice === 0 ? "Grátis" : `R$ ${plan.monthlyPrice}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminProfile;
