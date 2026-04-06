import { Switch, Route, Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LeadedlyLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, Users, MapPin, Wallet, Building2,
  Settings, LogOut, Sun, Moon, Star, TrendingUp,
} from "lucide-react";
import AdminHome from "@/pages/admin-home";
import AdminClients from "@/pages/admin-clients";
import AdminTerritories from "@/pages/admin-territories";
import AdminDeposits from "@/pages/admin-deposits";
import AdminIndustries from "@/pages/admin-industries";
import AdminPlaid from "@/pages/admin-plaid";
import AdminMfa from "@/pages/admin-mfa";
import { Landmark, ShieldCheck } from "lucide-react";

const NAV = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Territories", href: "/territories", icon: MapPin },
  { label: "Deposits", href: "/deposits", icon: Wallet },
  { label: "Industries & Fees", href: "/industries", icon: Star },
  { label: "ACH / Plaid", href: "/plaid", icon: Landmark },
  { label: "MFA Security", href: "/mfa", icon: ShieldCheck },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

export default function AdminLayout() {
  const { auth, setAuth } = useAuth();
  const [location] = useLocation();

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <LeadedlyLogo size={26} />
          <span className="ml-1 text-xs font-semibold text-primary bg-primary/15 rounded-full px-2 py-0.5 mt-1 inline-block">Admin</span>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(item => {
                  const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild>
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
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{auth?.user?.name ?? "Admin"}</p>
              <p className="text-xs text-sidebar-foreground/50">Administrator</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setAuth(null)} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <Switch>
            <Route path="/" component={AdminHome} />
            <Route path="/clients" component={AdminClients} />
            <Route path="/territories" component={AdminTerritories} />
            <Route path="/deposits" component={AdminDeposits} />
            <Route path="/industries" component={AdminIndustries} />
            <Route path="/plaid" component={AdminPlaid} />
            <Route path="/mfa" component={AdminMfa} />
          </Switch>
        </main>
      </div>
    </>
  );
}
