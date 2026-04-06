import { Switch, Route } from "wouter";
import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadedlyLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, MapPin, Users, Wallet, Settings, LogOut,
  Sun, Moon, Bell, ChevronDown, TrendingUp,
} from "lucide-react";
import DashboardHome from "@/pages/dashboard-home";
import TerritoryManager from "@/pages/territory-manager";
import LeadManager from "@/pages/lead-manager";
import DepositManager from "@/pages/deposit-manager";
import BankAccount from "@/pages/bank-account";
import { Landmark } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Territory Manager", href: "/territories", icon: MapPin },
  { label: "Lead Manager", href: "/leads", icon: Users },
  { label: "Deposit Manager", href: "/deposits", icon: Wallet },
  { label: "Bank Account", href: "/bank", icon: Landmark },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

export default function DashboardLayout() {
  const { auth, setAuth } = useAuth();
  const [location] = useLocation();
  const clientId = auth?.user?.id;

  const { data: stats } = useQuery<any>({
    queryKey: [`/api/stats/client/${clientId}`],
    enabled: !!clientId,
    refetchInterval: 30000,
  });

  return (
    <>
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <LeadedlyLogo size={26} />
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(item => {
                  const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild data-active={active}>
                        <Link href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Balance card */}
          {stats && (
            <div className="mx-2 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary/80 font-medium mb-1">Total Deposit Balance</p>
              <p className="text-xl font-bold text-primary tabular">${stats.totalBalance?.toFixed(2) ?? "0.00"}</p>
              {stats.lowBalance && (
                <Badge variant="destructive" className="mt-1.5 text-xs">Low Balance</Badge>
              )}
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {auth?.user?.firstName?.[0] ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{auth?.user?.firstName} {auth?.user?.lastName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{auth?.user?.companyName}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setAuth(null)} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <Switch>
            <Route path="/" component={() => <DashboardHome clientId={clientId} />} />
            <Route path="/territories" component={() => <TerritoryManager clientId={clientId} />} />
            <Route path="/leads" component={() => <LeadManager clientId={clientId} />} />
            <Route path="/deposits" component={() => <DepositManager clientId={clientId} />} />
            <Route path="/bank" component={() => <BankAccount clientId={clientId} />} />
          </Switch>
        </main>
      </div>
    </>
  );
}
