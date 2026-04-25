import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Star, ShieldCheck, LogOut, Menu, CreditCard, Truck, Tag,
  BarChart3, LayoutDashboard, ClipboardList, Store, PenTool, Radio,
  ChevronLeft, ExternalLink, ShoppingCart, Webhook, Bell, Zap, Crown,
  ChevronDown, Sun, Moon, Globe, User
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
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Live View", path: "/dashboard/live-view", icon: Radio },
      { label: "Análises", path: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Pedidos", path: "/dashboard/orders", icon: ClipboardList },
      { label: "Carrinhos Abandonados", path: "/dashboard/abandoned-carts", icon: ShoppingCart },
    ],
  },
  {
    title: "Construtor de Loja",
    items: [
      { label: "Produtos", path: "/dashboard/products", icon: Package },
      { label: "Editor de Produto", path: "/dashboard/product-builder", icon: PenTool },
      { label: "Avaliações", path: "/dashboard/reviews", icon: Star },
      { label: "Lojas", path: "/dashboard/stores", icon: Store },
    ],
  },
  {
    title: "Checkout",
    items: [
      { label: "Builder", path: "/dashboard/checkout-builder", icon: PenTool },
      { label: "Gateways", path: "/dashboard/gateways", icon: CreditCard },
      { label: "Fretes", path: "/dashboard/shipping", icon: Truck },
      { label: "Order Bumps", path: "/dashboard/order-bumps", icon: Tag },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Integrações", path: "/dashboard/pixels", icon: Zap },
      { label: "Webhooks", path: "/dashboard/webhooks", icon: Webhook },
    ],
  },
  {
    title: "Configurações",
    items: [
      { label: "Domínios", path: "/dashboard/domains", icon: Globe },
      { label: "Notificações", path: "/dashboard/notifications", icon: Bell },
      { label: "Plano & Limites", path: "/dashboard/plans", icon: Crown },
      { label: "Segurança", path: "/dashboard/security", icon: ShieldCheck },
      { label: "Meu Perfil", path: "/dashboard/profile", icon: User },
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
      if (!session) navigate("/login");
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Auto-expand section containing active route
  useEffect(() => {
    const idx = navSections.findIndex(s => s.items.some(i => {
      if (i.path === "/dashboard") return location.pathname === "/dashboard";
      return location.pathname.startsWith(i.path);
    }));
    if (idx >= 0) {
      setExpandedSections(prev => new Set(prev).add(idx));
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(240 10% 4%)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-[hsl(199,89%,48%)]" />
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "border-b border-border/60 flex items-center",
        sidebarOpen ? "h-14 px-4 justify-between" : "relative h-[76px] px-2 justify-center"
      )}>
        <Link
          to="/dashboard"
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className="font-bold text-[15px] tracking-tight text-foreground">
                  Void<span className="text-accent">Tok</span>
                </span>
              </>
            )
          ) : (
            logoClosed ? (
              <img src={logoClosed} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            )
          )}
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "hidden md:flex text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted",
            sidebarOpen ? "" : "absolute right-1 top-2"
          )}
        >
          <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-hidden px-3 py-3">
        <ScrollArea className="h-full" type="auto">
          <nav className="space-y-1 pr-2">
            {navSections.map((section, sIdx) => {
              const isExpanded = expandedSections.has(sIdx);
              const hasActive = section.items.some(i => isActive(i.path));

              return (
                <Collapsible key={section.title} open={isExpanded} onOpenChange={() => toggleSection(sIdx)}>
                  {sidebarOpen ? (
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors group">
                      <span className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.12em]",
                        hasActive ? "text-primary" : "text-muted-foreground/60"
                      )}>
                        {section.title}
                      </span>
                      <ChevronDown className={cn(
                        "w-3 h-3 text-muted-foreground/50 transition-transform duration-200",
                        !isExpanded && "-rotate-90"
                      )} />
                    </CollapsibleTrigger>
                  ) : null}

                  <CollapsibleContent className="space-y-0.5 mt-0.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[14px] font-medium transition-all duration-150",
                          isActive(item.path)
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-5 h-5",
                          isActive(item.path) && "text-primary"
                        )}>
                          <item.icon className={cn(
                            "w-[15px] h-[15px] shrink-0 transition-colors duration-150",
                            isActive(item.path) ? "text-primary" : "group-hover:text-foreground"
                          )} />
                        </div>
                        {sidebarOpen && <span>{item.label}</span>}
                        {item.label === "Live View" && sidebarOpen && (
                          <span className="ml-auto flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-void-success opacity-60" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-void-success" />
                          </span>
                        )}
                      </Link>
                    ))}
                  </CollapsibleContent>

                  {/* When sidebar collapsed, show items without section headers */}
                  {!sidebarOpen && section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      title={item.label}
                      className={cn(
                        "group flex items-center justify-center h-11 rounded-xl transition-all duration-150",
                        isActive(item.path)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon className="w-[22px] h-[22px]" />
                    </Link>
                  ))}
                </Collapsible>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
        >
          <ExternalLink className={cn("shrink-0", sidebarOpen ? "w-[15px] h-[15px]" : "w-5 h-5")} />
          {sidebarOpen && <span>Ver Loja</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
        >
          <LogOut className={cn("shrink-0", sidebarOpen ? "w-[15px] h-[15px]" : "w-5 h-5")} />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen flex", theme === "dark" ? "void-gradient-bg" : "bg-background")}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-border/60 z-50 transition-all duration-200",
          sidebarOpen ? "w-[220px]" : "w-[84px]"
        )}
        style={{
          background: theme === "dark" ? 'hsl(240 6% 7% / 0.95)' : 'hsl(0 0% 100% / 0.95)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <SidebarNav />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[220px] bg-card border-r border-border/60 z-50 transition-transform duration-200 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarNav />
      </aside>

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-200", sidebarOpen ? "md:ml-[220px]" : "md:ml-[84px]")}>
        <header className="sticky top-0 z-30 h-14 border-b border-border/60 flex items-center px-5 gap-3" style={{ background: theme === "dark" ? 'hsl(240 6% 7% / 0.8)' : 'hsl(0 0% 100% / 0.8)', backdropFilter: 'blur(20px)' }}>
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <PushNotificationToggle />
            <Link
              to="/dashboard/profile"
              className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
            >
              <span className="text-white text-[10px] font-bold">VT</span>
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
