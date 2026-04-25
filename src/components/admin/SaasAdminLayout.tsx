import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, LogOut, Shield, ChevronLeft, Menu, ClipboardList, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { label: "Métricas", path: "/admin", icon: BarChart3 },
  { label: "Análises", path: "/admin/analytics", icon: TrendingUp },
  { label: "Pedidos", path: "/admin/orders", icon: ClipboardList },
  { label: "Usuários", path: "/admin/users", icon: Users },
  { label: "Plataforma", path: "/admin/platform", icon: Settings },
];

const SaasAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("platform_settings").select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value || ""; });
      return map;
    },
  });

  const logoClosed = platformSettings?.sidebar_logo_collapsed || platformSettings?.sidebar_logo_collapsed_light;

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => { document.documentElement.classList.remove("dark"); };
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!data) { navigate("/dashboard"); return; }
      setLoading(false);
    };

    check();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(240 10% 4%)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-destructive" />
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen void-gradient-bg flex">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-border/60 z-50 transition-all duration-200",
        sidebarOpen ? "w-[220px]" : "w-16"
      )} style={{ background: 'hsl(240 6% 7% / 0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
          <Link to="/admin" className="flex items-center gap-2.5 group">
            {logoClosed ? (
              <img src={logoClosed} alt="Logo" className="w-14 h-14 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-void-warning flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
            {sidebarOpen && (
              <span className="font-bold text-[15px] tracking-tight text-foreground">
                Void <span className="text-destructive">Admin</span>
              </span>
            )}
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
            <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive(item.path)
                  ? "bg-destructive/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn("w-[15px] h-[15px] shrink-0", isActive(item.path) ? "text-destructive" : "group-hover:text-foreground")} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border/60 space-y-0.5">
          <Link to="/dashboard" className="flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group">
            <BarChart3 className="w-[15px] h-[15px] shrink-0" />
            {sidebarOpen && <span>Voltar ao Dashboard</span>}
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors">
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className={cn("flex-1 transition-all duration-200", sidebarOpen ? "md:ml-[220px]" : "md:ml-16")}>
        <header className="sticky top-0 z-30 h-14 border-b border-border/60 flex items-center px-5 gap-3" style={{ background: 'hsl(240 6% 7% / 0.8)', backdropFilter: 'blur(20px)' }}>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-medium text-muted-foreground">Painel Admin Void</span>
          </div>
          <div className="flex-1" />
        </header>

        <main className="p-5 md:p-8 max-w-[1280px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SaasAdminLayout;
