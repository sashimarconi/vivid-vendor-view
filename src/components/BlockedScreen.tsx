import { ShieldOff } from "lucide-react";

const BlockedScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="max-w-md w-full text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
        <ShieldOff className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Acesso bloqueado</h1>
    </div>
  </div>
);

export default BlockedScreen;
