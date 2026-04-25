import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminDomains = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const { data: domains, isLoading } = useQuery({
    queryKey: ["custom-domains"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("custom_domains")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        domain: string;
        verified: boolean;
        verification_token: string;
        created_at: string;
      }>;
    },
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const clean = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "");
      if (!clean || !clean.includes(".")) throw new Error("Domínio inválido");
      const { error } = await (supabase as any)
        .from("custom_domains")
        .insert({ domain: clean });
      if (error) {
        if (error.code === "23505") throw new Error("Este domínio já está em uso");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      setAddOpen(false);
      setNewDomain("");
      toast({ title: "Domínio adicionado!", description: "Configure o DNS conforme as instruções." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("custom_domains")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast({ title: "Domínio removido!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase as any)
        .from("custom_domains")
        .update({ verified })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Domínios <span className="text-destructive">Personalizados</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte seu domínio para que seus clientes acessem suas lojas e produtos por ele
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Domínio
        </Button>
      </div>

      {/* Instruções */}
      <Card className="border-border/60 bg-card">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Como configurar seu domínio
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Adicione seu domínio clicando em "Adicionar Domínio"</li>
            <li>No painel DNS do seu provedor (Cloudflare, GoDaddy, Hostinger, etc.), adicione um registro <strong className="text-foreground">CNAME</strong> apontando para <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">voidtok.site</code></li>
            <li>Adicione um registro <strong className="text-foreground">TXT</strong> com o nome <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">_voidtok</code> e o valor do token de verificação</li>
            <li>Aguarde a propagação DNS (pode levar até 48h)</li>
          </ol>
        </CardContent>
      </Card>

      {/* Lista de domínios */}
      {domains && domains.length > 0 ? (
        <div className="grid gap-3">
          {domains.map((d) => (
            <Card key={d.id} className="border-border/60 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.verified ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                    {d.verified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{d.domain}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${d.verified ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {d.verified ? "Verificado" : "Pendente"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Token: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{d.verification_token}</code>
                      </p>
                      <button
                        onClick={() => copyToClipboard(d.verification_token)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => window.open(`https://${d.domain}`, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      onClick={() => removeDomain.mutate(d.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* DNS Records */}
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Registros DNS necessários</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="bg-muted/30 rounded-lg p-2.5 text-xs">
                      <span className="font-medium text-foreground">CNAME</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-muted-foreground">@ → voidtok.site</span>
                        <button onClick={() => copyToClipboard("voidtok.site")} className="text-muted-foreground hover:text-foreground">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5 text-xs">
                      <span className="font-medium text-foreground">TXT</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-muted-foreground truncate mr-2">_voidtok → {d.verification_token}</span>
                        <button onClick={() => copyToClipboard(d.verification_token)} className="text-muted-foreground hover:text-foreground shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/60 bg-card border-dashed">
          <CardContent className="p-10 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum domínio configurado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Adicione um domínio para começar</p>
          </CardContent>
        </Card>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Domínio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Domínio</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="minhaloja.com.br"
              />
              <p className="text-[10px] text-muted-foreground">
                Insira apenas o domínio, sem http:// ou www.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => addDomain.mutate(newDomain)}
              disabled={addDomain.isPending || !newDomain.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDomains;
