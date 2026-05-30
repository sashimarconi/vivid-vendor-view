import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Star, ShieldCheck, LogOut, Menu, CreditCard, Truck, Tag,
  BarChart3, LayoutDashboard, ClipboardList, Store, PenTool, Radio,
  ChevronLeft, ExternalLink, ShoppingCart, Webhook, Bell, Zap, Crown,
  ChevronDown, Sun, Moon, Globe, User, Filter, Activity, Wallet, ShieldOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import SaleNotification from "@/components/admin/SaleNotification";
import PushNotificationToggle from "@/components/admin/PushNotificationToggle";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

const navSections = [
  {
    title: "Central de Comando",
    items: [
      { label: "Dashboard", path: "/daisakoikeda", icon: LayoutDashboard },
      { label: "Live View", path: "/daisakoikeda/live-view", icon: Radio },
      { label: "Análises", path: "/daisakoikeda/analytics", icon: BarChart3 },
      { label: "Funil", path: "/daisakoikeda/funnel", icon: Filter },
      { label: "Saúde do Pagamento", path: "/daisakoikeda/payment-health", icon: Activity },
      { label: "Financeiro", path: "/daisakoikeda/financial", icon: Wallet },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Pedidos", path: "/daisakoikeda/orders", icon: ClipboardList },
      { label: "Carrinhos Abandonados", path: "/daisakoikeda/abandoned-carts", icon: ShoppingCart },
    ],
  },
  {
    title: "Construtor de Loja",
    items: [
      { label: "Produtos", path: "/daisakoikeda/products", icon: Package },
      { label: "Editor de Produto", path: "/daisakoikeda/product-builder", icon: PenTool },
      { label: "Avaliações", path: "/daisakoikeda/reviews", icon: Star },
      { label: "Lojas", path: "/daisakoikeda/stores", icon: Store },
    ],
  },
  {
    title: "Checkout",
    items: [
      { label: "Builder", path: "/daisakoikeda/checkout-builder", icon: PenTool },
      { label: "Gateways", path: "/daisakoikeda/gateways", icon: CreditCard },
      { label: "Fretes", path: "/daisakoikeda/shipping", icon: Truck },
      { label: "Order Bumps", path: "/daisakoikeda/order-bumps", icon: Tag },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Integrações", path: "/daisakoikeda/pixels", icon: Zap },
      { label: "Webhooks", path: "/daisakoikeda/webhooks", icon: Webhook },
    ],
  },
  {
    title: "Configurações",
    items: [
      { label: "Domínios", path: "/daisakoikeda/domains", icon: Globe },
      { label: "Notificações", path: "/daisakoikeda/notifications", icon: Bell },
      { label: "Plano & Limites", path: "/daisakoikeda/plans", icon: Crown },
      { label: "Segurança", path: "/daisakoikeda/security", icon: ShieldCheck },
      { label: "IPs Bloqueados", path: "/daisakoikeda/blocked-ips", icon: ShieldOff },
      { label: "Meu Perfil", path: "/daisakoikeda/profile", icon: User },
    ],
  },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track which sections are expanded
  const getActiveSectionIndex = () => {
    const idx = navSections.findIndex(s => s.items.some(i => isActive(i.path)));
    return idx >= 0 ? idx : 0;
  };

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  // Fetch platform logos
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value || ""; });
      return map;
    },
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("admin-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("admin-theme", theme);
    return () => { root.classList.remove("dark"); };
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/lug");
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/lug");
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Auto-expand section containing active route
  useEffect(() => {
    const idx = navSections.findIndex(s => s.items.some(i => {
      if (i.path === "/daisakoikeda") return location.pathname === "/daisakoikeda";
      return location.pathname.startsWith(i.path);
    }));
    if (idx >= 0) {
      setExpandedSections(prev => new Set(prev).add(idx));
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/lug");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(240 10% 4%)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-[hsl(199,89%,48%)]" />
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/daisakoikeda") return location.pathname === "/daisakoikeda";
    return location.pathname.startsWith(path);
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const logoOpen = theme === "light" && platformSettings?.sidebar_logo_open_light
    ? platformSettings.sidebar_logo_open_light
    : platformSettings?.sidebar_logo_open;
  const logoClosed = theme === "light" && platformSettings?.sidebar_logo_collapsed_light
    ? platformSettings.sidebar_logo_collapsed_light
    : platformSettings?.sidebar_logo_collapsed;

  const SidebarNav = () => (
    <div className="flex flex-col h-full relative">
      {/* Subtle mint accent edge */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[hsl(165_65%_51%/0.25)] to-transparent" />

      {/* Logo */}
      <div className={cn(
        "border-b border-[hsl(165_30%_16%/0.7)] flex items-center",
        sidebarOpen ? "h-14 px-4 justify-between" : "relative h-[76px] px-2 justify-center"
      )}>
        <Link
          to="/daisakoikeda"
          className={cn(
            "group flex items-center",
            sidebarOpen ? "gap-2.5" : "w-full justify-center"
          )}
        >
          {sidebarOpen ? (
            logoOpen ? (
              <img src={logoOpen} alt="Logo" className="h-9 max-w-[160px] object-contain" />
            ) : (
              <>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(165 65% 51%), hsl(152 100% 73%))',
                    boxShadow: '0 0 16px hsl(165 65% 51% / 0.4)',
                  }}
                >
                  <span className="text-[hsl(200_45%_7%)] font-bold text-xs">V</span>
                </div>
                <span className="font-bold text-[15px] tracking-tight text-foreground">
                  Void<span className="text-[hsl(152_100%_73%)]">Tok</span>
                </span>
              </>
            )
          ) : (
            logoClosed ? (
              <img src={logoClosed} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(165 65% 51%), hsl(152 100% 73%))',
                  boxShadow: '0 0 20px hsl(165 65% 51% / 0.4)',
                }}
              >
                <span className="text-[hsl(200_45%_7%)] font-bold text-sm">V</span>
              </div>
            )
          )}
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "hidden md:flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-[hsl(152_100%_73%)] hover:bg-[hsl(165_65%_51%/0.10)] border border-transparent hover:border-[hsl(165_65%_51%/0.25)] transition-all",
            sidebarOpen ? "" : "absolute right-1 top-2"
          )}
        >
          <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-hidden px-3 py-4">
        <ScrollArea className="h-full" type="auto">
          <nav className={cn("pr-2", sidebarOpen ? "space-y-2" : "space-y-1")}>
            {navSections.map((section, sIdx) => {
              const isExpanded = expandedSections.has(sIdx);
              const hasActive = section.items.some(i => isActive(i.path));

              // Collapsed sidebar: render icons only, with a thin divider between groups
              if (!sidebarOpen) {
                return (
                  <div key={section.title} className="space-y-1">
                    {sIdx > 0 && (
                      <div className="mx-auto my-1 h-px w-8 bg-[hsl(165_30%_18%/0.6)]" />
                    )}
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          title={item.label}
                          className={cn(
                            "group relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-200",
                            active
                              ? "text-[hsl(152_100%_73%)] bg-[hsl(165_65%_51%/0.12)] border border-[hsl(165_65%_51%/0.30)]"
                              : "text-muted-foreground hover:text-[hsl(152_100%_73%)] hover:bg-[hsl(165_65%_51%/0.08)] border border-transparent"
                          )}
                          style={active ? { boxShadow: '0 0 14px -4px hsl(165 65% 51% / 0.4)' } : undefined}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                          {item.label === "Live View" && (
                            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(152_100%_73%)] opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(165_65%_51%)]" />
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              // Expanded sidebar: collapsible groups
              return (
                <Collapsible key={section.title} open={isExpanded} onOpenChange={() => toggleSection(sIdx)}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[hsl(165_65%_51%/0.06)] transition-colors group">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                      hasActive ? "text-[hsl(152_100%_73%)]" : "text-muted-foreground/50 group-hover:text-muted-foreground/80"
                    )}>
                      {section.title}
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-all duration-200",
                      hasActive ? "text-[hsl(152_100%_73%)]" : "text-muted-foreground/40",
                      !isExpanded && "-rotate-90"
                    )} />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-0.5 mt-1">
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200",
                            active
                              ? "text-foreground bg-[hsl(165_65%_51%/0.12)] border border-[hsl(165_65%_51%/0.25)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-[hsl(165_65%_51%/0.06)] border border-transparent"
                          )}
                          style={active ? {
                            boxShadow: '0 0 14px -4px hsl(165 65% 51% / 0.35), inset 0 1px 0 hsl(152 100% 73% / 0.06)',
                          } : undefined}
                        >
                          {active && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full"
                              style={{ background: 'linear-gradient(180deg, hsl(152 100% 73%), hsl(165 65% 51%))', boxShadow: '0 0 8px hsl(152 100% 73% / 0.6)' }}
                            />
                          )}
                          <div className={cn(
                            "flex items-center justify-center w-5 h-5 transition-colors",
                            active ? "text-[hsl(152_100%_73%)]" : "group-hover:text-[hsl(152_100%_73%)]"
                          )}>
                            <item.icon className="w-[15px] h-[15px] shrink-0" />
                          </div>
                          <span className="truncate">{item.label}</span>
                          {item.label === "Live View" && (
                            <span className="ml-auto flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152_100%_73%)] opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(165_65%_51%)]" style={{ boxShadow: '0 0 6px hsl(152 100% 73%)' }} />
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(165_30%_16%/0.7)] space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-[hsl(152_100%_73%)] hover:bg-[hsl(165_65%_51%/0.06)] transition-colors group"
        >
          <ExternalLink className={cn("shrink-0", sidebarOpen ? "w-[15px] h-[15px]" : "w-5 h-5 mx-auto")} />
          {sidebarOpen && <span>Ver Loja</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className={cn("shrink-0", sidebarOpen ? "w-[15px] h-[15px]" : "w-5 h-5 mx-auto")} />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen flex w-full", theme === "dark" ? "void-gradient-bg" : "bg-background")}>
      {/* Desktop sidebar — sticky, in-flow so no gap appears */}
      <aside
        className={cn(
          "hidden md:flex flex-col sticky top-0 h-screen z-50 shrink-0 transition-[width] duration-200",
          sidebarOpen ? "w-[230px]" : "w-[76px]"
        )}
        style={{
          background: theme === "dark"
            ? 'linear-gradient(180deg, hsl(200 45% 7% / 0.96) 0%, hsl(200 40% 6% / 0.96) 100%)'
            : 'hsl(0 0% 100% / 0.95)',
          backdropFilter: 'blur(24px)',
          borderRight: theme === "dark"
            ? '1px solid hsl(165 30% 16% / 0.8)'
            : '1px solid hsl(214 32% 91%)',
          boxShadow: theme === "dark"
            ? 'inset -1px 0 0 hsl(152 100% 73% / 0.04), 4px 0 24px -12px hsl(165 65% 51% / 0.15)'
            : undefined,
        }}
      >
        <SidebarNav />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar — kept fixed for slide-in */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[230px] z-50 transition-transform duration-200 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: theme === "dark" ? 'hsl(200 45% 7% / 0.98)' : 'hsl(0 0% 100%)',
          backdropFilter: 'blur(24px)',
          borderRight: theme === "dark" ? '1px solid hsl(165 30% 16%)' : '1px solid hsl(214 32% 91%)',
        }}
      >
        <SidebarNav />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">

        <header
          className="sticky top-0 z-30 h-14 flex items-center px-5 gap-3"
          style={{
            background: theme === "dark"
              ? 'linear-gradient(180deg, hsl(200 45% 7% / 0.92) 0%, hsl(200 45% 7% / 0.78) 100%)'
              : 'hsl(0 0% 100% / 0.85)',
            backdropFilter: 'blur(24px)',
            borderBottom: theme === "dark"
              ? '1px solid hsl(165 30% 16% / 0.7)'
              : '1px solid hsl(214 32% 91%)',
            boxShadow: theme === "dark"
              ? '0 1px 0 hsl(152 100% 73% / 0.04), 0 8px 24px -16px hsl(0 0% 0% / 0.5)'
              : undefined,
          }}
        >
          <button
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(165_65%_51%/0.08)] transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Live status pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[hsl(165_65%_51%/0.25)] bg-[hsl(165_65%_51%/0.08)] px-3 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(152_100%_73%)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(165_65%_51%)]" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(152_100%_73%)]">
              Sistema Online
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-[hsl(152_100%_73%)] hover:bg-[hsl(165_65%_51%/0.10)] border border-transparent hover:border-[hsl(165_65%_51%/0.25)] transition-all"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <PushNotificationToggle />

            <div className="mx-1 h-6 w-px bg-[hsl(165_30%_18%)]" />

            <Link
              to="/daisakoikeda/profile"
              className="relative h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, hsl(165 65% 51%), hsl(152 100% 73%))',
                boxShadow: '0 0 0 1px hsl(200 45% 7%), 0 0 12px hsl(165 65% 51% / 0.4)',
              }}
            >
              <span className="text-[10px] font-bold text-[hsl(200_45%_7%)]">VT</span>
            </Link>
          </div>
        </header>

        <main className="p-5 md:p-8 max-w-[1280px] mx-auto">
          <SaleNotification />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
