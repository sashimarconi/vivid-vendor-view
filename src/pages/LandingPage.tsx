import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import voidtokLogo from "@/assets/voidtok-logo.png";
import {
  Zap, ShieldCheck, TrendingUp, Store, Paintbrush, Eye, BarChart3,
  Globe, CreditCard, Smartphone, Package, Settings2,
  ArrowRight, CheckCircle2, Layers, Link2, Bell, ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { Infinity as InfinityIcon } from "lucide-react";

/* ── Animated purple blob background ── */
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large animated purple blobs */}
    <motion.div
      className="absolute w-[900px] h-[900px] rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(263 70% 50% / 0.25) 0%, hsl(263 70% 50% / 0.08) 40%, transparent 70%)",
        top: "-30%",
        left: "50%",
        x: "-50%",
        filter: "blur(60px)",
      }}
      animate={{
        scale: [1, 1.15, 1.05, 1.2, 1],
        x: ["-50%", "-45%", "-55%", "-48%", "-50%"],
        y: ["0%", "5%", "-3%", "2%", "0%"],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute w-[600px] h-[600px] rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(263 80% 60% / 0.18) 0%, hsl(280 60% 50% / 0.06) 50%, transparent 70%)",
        top: "10%",
        right: "-10%",
        filter: "blur(80px)",
      }}
      animate={{
        scale: [1, 1.2, 0.95, 1.1, 1],
        x: ["0%", "-8%", "5%", "-3%", "0%"],
        y: ["0%", "8%", "-5%", "3%", "0%"],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute w-[500px] h-[500px] rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(199 89% 48% / 0.1) 0%, hsl(220 80% 50% / 0.04) 50%, transparent 70%)",
        bottom: "0%",
        left: "10%",
        filter: "blur(80px)",
      }}
      animate={{
        scale: [1, 1.1, 1.2, 0.95, 1],
        x: ["0%", "5%", "-3%", "8%", "0%"],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Subtle grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(hsl(263 70% 60% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(263 70% 60% / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />
  </div>
);

/* ── Glass card component ── */
const GlassCard = ({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) => (
  <motion.div
    className={`
      rounded-2xl border border-white/[0.06] 
      bg-white/[0.03] backdrop-blur-xl
      ${hover ? "hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_0_30px_hsl(263,70%,58%,0.08)]" : ""}
      transition-all duration-500
      ${className}
    `}
    whileHover={hover ? { y: -2 } : undefined}
  >
    {children}
  </motion.div>
);

/* ── Fade-in on scroll wrapper ── */
const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── Badge pill ── */
const Badge = ({ children, dotColor = "hsl(263,70%,58%)" }: { children: React.ReactNode; dotColor?: string }) => (
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm text-[11px] tracking-widest text-white/50 font-medium uppercase">
    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: dotColor }} />
    {children}
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen bg-[hsl(240,10%,3.5%)] text-white overflow-x-hidden selection:bg-[hsl(263,70%,58%,0.3)]">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04]">
        <div className="absolute inset-0 bg-[hsl(240,10%,3.5%)/0.6] backdrop-blur-2xl" />
        <div className="relative max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <img src={voidtokLogo} alt="VoidTok" className="h-9 object-contain" />
          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/40 font-medium">
            <a href="#recursos" className="hover:text-white transition-colors duration-300">Recursos</a>
            <a href="#funcionalidades" className="hover:text-white transition-colors duration-300">Funcionalidades</a>
            <a href="#precos" className="hover:text-white transition-colors duration-300">Preços</a>
          </div>
          <button
            onClick={() => navigate("/register")}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[hsl(263,70%,58%)] text-white hover:bg-[hsl(263,70%,52%)] hover:shadow-[0_0_25px_hsl(263,70%,58%,0.4)] transition-all duration-300"
          >
            Começar Agora
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16">
        <HeroBackground />
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative text-center px-6 max-w-5xl mx-auto">
          <FadeIn>
            <Badge>PLATAFORMA DE ALTA CONVERSÃO</Badge>
          </FadeIn>

          <FadeIn delay={0.1}>
            <img src={voidtokLogo} alt="VoidTok" className="h-14 md:h-20 object-contain mx-auto mt-6" />
            <h1 className="mt-8 text-5xl sm:text-6xl md:text-[5.5rem] font-extrabold tracking-tight leading-[1.05]">
              VENDA QUE{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[hsl(263,70%,65%)] via-[hsl(280,80%,70%)] to-[hsl(263,70%,58%)] bg-clip-text text-transparent">
                  CONECTA, PERSONALIZA
                </span>
              </span>
              <br />
              E CONVERTE
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="mt-7 text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed font-light">
              Crie lojas e checkouts personalizados com alta conversão.
              Gerencie produtos, pedidos, upsells e integrações em um único painel.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate("/register")}
                className="group px-8 py-3.5 rounded-full font-semibold bg-[hsl(263,70%,58%)] text-white hover:bg-[hsl(263,70%,52%)] hover:shadow-[0_0_40px_hsl(263,70%,58%,0.35)] transition-all duration-400 text-sm flex items-center gap-2"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3.5 rounded-full font-semibold border border-white/[0.08] text-white/70 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 text-sm"
              >
                Acessar Dashboard
              </button>
            </div>
          </FadeIn>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(240,10%,3.5%)] to-transparent" />
      </section>

      {/* ─── Platform Section ─── */}
      <section className="py-28 px-6 relative">
        {/* Section glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse,hsl(263,70%,50%,0.06),transparent_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <GlassCard hover={false} className="p-12 md:p-20 text-center relative overflow-hidden">
              {/* Inner glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,hsl(263,70%,58%,0.08),transparent_70%)] pointer-events-none" />
              <div className="relative">
                <Badge dotColor="hsl(152,60%,48%)">PLATAFORMA COMPLETA</Badge>
                <h2 className="mt-8 text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  A Plataforma que{" "}
                  <span className="bg-gradient-to-r from-[hsl(263,60%,68%)] to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
                    Vende Mais
                  </span>
                  <br />com Sua Identidade
                </h2>
                <p className="mt-6 text-white/35 max-w-2xl mx-auto leading-relaxed">
                  Checkout personalizável, lojas ilimitadas, integrações com gateways e pixels.
                  Tudo em um painel intuitivo feito para alta conversão.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-10 text-sm">
                  {[
                    { icon: Store, label: "Lojas Ilimitadas" },
                    { icon: CreditCard, label: "Multi-Gateway" },
                    { icon: Zap, label: "Checkout Rápido" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-white/50">
                      <Icon className="w-4 h-4 text-[hsl(263,70%,58%)]" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </section>

      {/* ─── Feature Cards ─── */}
      <section id="recursos" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Paintbrush,
              title: "Personalização Total",
              desc: "Checkout builder drag-and-drop. Customize cores, textos, layout e componentes sem código.",
              color: "263,70%,58%",
            },
            {
              icon: CreditCard,
              title: "Multi-Gateway",
              desc: "Conecte múltiplos gateways PIX: BlackCatPay, GhostsPay, Duck, Hiso e Paradise.",
              color: "199,89%,48%",
            },
            {
              icon: ShieldCheck,
              title: "Transparência Total",
              desc: "Checkout transparente sem redirecionamentos. Seus clientes ficam no seu ambiente.",
              color: "152,60%,48%",
            },
            {
              icon: Zap,
              title: "Alta Conversão",
              desc: "Order bumps, upsells e checkout otimizado para maximizar cada venda.",
              color: "38,92%,50%",
            },
            {
              icon: BarChart3,
              title: "Analytics Avançado",
              desc: "Funil de conversão, live view com globo 3D, métricas em tempo real e relatórios.",
              color: "263,70%,58%",
            },
            {
              icon: Globe,
              title: "Rastreamento Completo",
              desc: "TikTok Pixel, Meta Pixel, UTMify e webhooks para rastrear cada conversão.",
              color: "199,89%,48%",
            },
          ].map(({ icon: Icon, title, desc, color }, i) => (
            <FadeIn key={title} delay={i * 0.08}>
              <GlassCard className="p-7 h-full">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `hsl(${color} / 0.1)`, boxShadow: `0 0 20px hsl(${color} / 0.08)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: `hsl(${color})` }} />
                </div>
                <h3 className="font-semibold text-white text-[15px] mb-2">{title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{desc}</p>
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Order Bumps Section ─── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <div>
              <Badge>ORDER BUMPS & UPSELLS</Badge>
              <h2 className="mt-6 text-3xl md:text-[2.6rem] font-bold tracking-tight leading-tight">
                Venda mais com{" "}
                <span className="text-[hsl(263,70%,58%)]">Order Bumps</span>
              </h2>
              <p className="mt-5 text-white/35 leading-relaxed">
                Adicione ofertas complementares no checkout que aumentam o ticket médio.
                Configure produtos extras com preços especiais e posições personalizadas.
              </p>
              <div className="mt-6 space-y-3 text-sm">
                {["Aumente seu ticket médio", "Ofertas automáticas no checkout", "Posicionamento personalizável"].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-white/50">
                    <ArrowRight className="w-4 h-4 text-[hsl(263,70%,58%)]" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <GlassCard hover={false} className="p-8 relative overflow-hidden">
              {/* Inner glow */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[radial-gradient(circle,hsl(263,70%,58%,0.1),transparent_70%)] pointer-events-none" />
              <div className="relative rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(263,70%,58%)] to-[hsl(199,89%,48%)] shadow-[0_0_20px_hsl(263,70%,58%,0.3)]" />
                  <div>
                    <p className="font-semibold text-white text-sm">Oferta Especial</p>
                    <p className="text-xs text-white/35">Adicione ao pedido com 1 clique</p>
                  </div>
                </div>
                <button className="w-full py-3 rounded-xl bg-[hsl(263,70%,58%)] text-white font-semibold text-sm hover:bg-[hsl(263,70%,52%)] hover:shadow-[0_0_25px_hsl(263,70%,58%,0.3)] transition-all duration-300">
                  Adicionar ao Pedido
                </button>
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </section>

      {/* ─── Lojas Ilimitadas ─── */}
      <section className="py-28 px-6 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,hsl(263,70%,50%,0.04),transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <FadeIn>
            <Badge dotColor="hsl(199,89%,48%)">
              <InfinityIcon className="w-3 h-3 inline mr-1" />
              LOJAS ILIMITADAS
            </Badge>
            <h2 className="mt-8 text-4xl md:text-5xl font-bold tracking-tight mb-5">
              <span className="text-[hsl(263,70%,58%)]">Liberdade</span> para Crescer Sem Limites
            </h2>
            <p className="text-white/35 max-w-2xl mx-auto leading-relaxed mb-14">
              Crie quantas lojas precisar, todas gerenciadas em um único painel.
              Vitrines independentes com identidade visual própria.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {([
              { icon: Store as LucideIcon, title: "Lojas Ilimitadas", desc: "Crie quantas lojas precisar, todas gerenciadas em um único painel." },
              { icon: Settings2 as LucideIcon, title: "Gestão Centralizada", desc: "Controle todas as suas lojas através de uma única interface intuitiva." },
              { icon: InfinityIcon as LucideIcon, title: "Possibilidades Infinitas", desc: "Expanda seus negócios sem restrições, com total liberdade para crescer." },
            ] as const).map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 0.1}>
                <GlassCard className="p-7 text-left h-full">
                  <Icon className="w-6 h-6 text-[hsl(263,70%,58%)] mb-5" />
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{desc}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Funcionalidades Grid ─── */}
      <section id="funcionalidades" className="py-28 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <FadeIn>
            <Badge dotColor="hsl(199,89%,48%)">FUNCIONALIDADES</Badge>
            <h2 className="mt-8 text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Algumas Funcionalidades <span className="text-[hsl(263,70%,58%)]">VoidTok</span>
            </h2>
            <p className="text-white/35 max-w-2xl mx-auto mb-14">
              Descubra as ferramentas que tornam o VoidTok a escolha ideal para seu negócio
            </p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShoppingCart, label: "Order Bumps" },
              { icon: Package, label: "Checkout Builder" },
              { icon: Eye, label: "Live View" },
              { icon: TrendingUp, label: "Analytics" },
              { icon: Layers, label: "Product Builder" },
              { icon: Bell, label: "Notificações" },
              { icon: Link2, label: "Webhooks" },
              { icon: Smartphone, label: "PWA Mobile" },
            ].map(({ icon: Icon, label }, i) => (
              <FadeIn key={label} delay={i * 0.05}>
                <GlassCard className="p-5 text-left h-full">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(263,70%,58%,0.1)] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-[hsl(263,70%,58%)]" />
                  </div>
                  <p className="text-sm font-medium text-white">{label}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Integrações ─── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <FadeIn>
            <Badge dotColor="hsl(152,60%,48%)">INTEGRAÇÕES</Badge>
            <h2 className="mt-8 text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Rastreamento e{" "}
              <span className="bg-gradient-to-r from-[hsl(263,60%,68%)] to-[hsl(199,89%,48%)] bg-clip-text text-transparent">
                Análise Completa
              </span>
            </h2>
            <p className="text-white/35 max-w-2xl mx-auto mb-14">
              Conecte suas ferramentas favoritas e otimize suas campanhas
            </p>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-4">
            {["TikTok Pixel", "Meta Pixel", "UTMify", "Webhooks", "TikTok Ads"].map((name, i) => (
              <FadeIn key={name} delay={i * 0.06}>
                <GlassCard className="px-8 py-6">
                  <p className="text-sm font-medium text-white/80">{name}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="precos" className="py-28 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,hsl(263,70%,50%,0.05),transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative">
          <FadeIn>
            <Badge>PREÇOS</Badge>
            <h2 className="mt-8 text-3xl md:text-4xl font-bold tracking-tight mb-14">
              <span className="text-[hsl(263,70%,58%)]">Escolha o plano</span> ideal para seu negócio
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                badge: "Gratuito",
                badgeColor: "white/10",
                badgeText: "white/50",
                name: "Start",
                price: "0",
                fee: "2,5%",
                feeColor: "hsl(263,70%,58%)",
                desc: "Comece a vender online agora mesmo",
                features: ["Checkout completo", "Personalização de temas", "Integrações com gateways", "Live View com globo 3D", "Suporte via chat"],
              },
              {
                badge: "Intermediário",
                badgeColor: "hsl(199,89%,48%,0.12)",
                badgeText: "hsl(199,89%,48%)",
                name: "Pro",
                price: "147",
                fee: "2,0%",
                feeColor: "hsl(199,89%,48%)",
                desc: "Ideal para quem já fatura e quer crescer",
                features: ["Tudo do plano Start", "Analytics avançados", "Mais integrações", "Suporte prioritário", "Relatórios completos", "Checkout personalizado"],
              },
              {
                badge: "Avançado",
                badgeColor: "hsl(263,70%,58%,0.12)",
                badgeText: "hsl(263,70%,58%)",
                name: "Enterprise",
                price: "497",
                fee: "1,5%",
                feeColor: "hsl(263,70%,58%)",
                desc: "Recursos premium para maximizar vendas",
                features: ["Tudo do plano Pro", "Menor taxa de transação", "Integrações ilimitadas", "Suporte premium", "Atualizações em primeira mão", "Implementação assistida"],
              },
            ].map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <GlassCard hover={false} className="p-8 text-left h-full flex flex-col">
                  <span
                    className="inline-block self-start px-3 py-1 rounded-full text-[11px] font-medium mb-5"
                    style={{ backgroundColor: plan.badgeColor, color: plan.badgeText }}
                  >
                    {plan.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-xs text-white/40">R$</span>
                    <span className="text-5xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-sm text-white/40">/mês</span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: plan.feeColor }}>• {plan.fee} por transação</p>
                  <p className="text-sm text-white/35 mt-3">{plan.desc}</p>
                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                        <CheckCircle2 className="w-4 h-4 text-[hsl(152,60%,48%)] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/register")}
                    className="w-full mt-8 py-3.5 rounded-xl bg-[hsl(263,70%,58%)] text-white font-semibold text-sm hover:bg-[hsl(263,70%,52%)] hover:shadow-[0_0_25px_hsl(263,70%,58%,0.3)] transition-all duration-300"
                  >
                    Começar Agora
                  </button>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10">
          <div>
            <span className="text-lg font-bold">
              <span className="text-[hsl(263,70%,58%)]">Void</span>
              <span className="text-white/90">Tok</span>
            </span>
            <p className="mt-3 text-sm text-white/30 leading-relaxed">
              Plataforma completa para criar lojas e checkouts de alta conversão.
              Personalizável e sem burocracia.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white/80 mb-4 text-sm">Links Rápidos</h4>
            <ul className="space-y-2.5 text-sm text-white/35">
              <li><a href="#recursos" className="hover:text-white transition-colors duration-300">Recursos</a></li>
              <li><a href="#funcionalidades" className="hover:text-white transition-colors duration-300">Funcionalidades</a></li>
              <li><a href="#precos" className="hover:text-white transition-colors duration-300">Preços</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white/80 mb-4 text-sm">Políticas</h4>
            <ul className="space-y-2.5 text-sm text-white/35">
              <li><a href="#" className="hover:text-white transition-colors duration-300">Políticas de Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-300">Termos de Uso</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white/80 mb-4 text-sm">Suporte</h4>
            <ul className="space-y-2.5 text-sm text-white/35">
              <li>Atendimento via chat</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-14 pt-6 border-t border-white/[0.04] text-center text-xs text-white/20">
          © {new Date().getFullYear()} VoidTok. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
