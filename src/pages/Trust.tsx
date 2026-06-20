import { Shield, Lock, Eye, FileText, Mail, Server } from "lucide-react";

const Trust = () => {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Confiança & Segurança
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Como protegemos seus dados</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Esta página é mantida pelos administradores da plataforma para esclarecer
            práticas de segurança, privacidade e operação. Não é uma certificação
            independente.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Acesso e autenticação</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>Login por e-mail e senha com verificação de senha vazada (HIBP).</li>
            <li>Opção de autenticação de dois fatores (2FA) para contas administrativas.</li>
            <li>Sessões protegidas por tokens com expiração e renovação automática.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Infraestrutura e isolamento</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>Banco de dados com Row-Level Security: cada lojista enxerga apenas seus próprios dados.</li>
            <li>Funções server-side autenticadas para operações sensíveis (pagamentos, notificações, webhooks).</li>
            <li>Comunicação sempre por HTTPS/TLS.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Dados coletados</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Coletamos apenas os dados necessários para processar pedidos PIX e
            fornecer o painel ao lojista: nome, e-mail, telefone, CPF (quando exigido
            pelo gateway), endereço de entrega e dados de navegação anônimos para
            métricas. Não vendemos dados a terceiros.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Responsabilidade compartilhada</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            A plataforma fornece a infraestrutura segura. Cada lojista é responsável
            por usar credenciais fortes, manter o conteúdo de suas páginas em
            conformidade com a lei e responder aos seus clientes finais sobre LGPD,
            reembolsos e atendimento.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Contato de segurança</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Encontrou uma vulnerabilidade ou tem dúvidas sobre privacidade?
            Entre em contato pelo painel administrativo da sua loja para que o
            time responsável seja acionado.
          </p>
        </section>

        <footer className="text-xs text-muted-foreground text-center pt-6 border-t border-border">
          Última atualização: junho de 2026 · Conteúdo editável pelos administradores da plataforma.
        </footer>
      </div>
    </main>
  );
};

export default Trust;
