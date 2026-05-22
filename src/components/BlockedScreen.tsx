import { ShieldOff } from "lucide-react";

const BlockedScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="max-w-md w-full text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
        <ShieldOff className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Acesso bloqueado</h1>
      <p className="text-sm text-muted-foreground">
        Seu acesso a esta página foi bloqueado pelo lojista. Se você acredita que isso é um engano, entre em contato com o suporte da loja.
      </p>
    </div>
  </div>
);

export default BlockedScreen;
