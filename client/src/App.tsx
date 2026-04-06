import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import DashboardLayout from "@/pages/dashboard-layout";
import AdminLayout from "@/pages/admin-layout";
import PrivacyPolicy from "@/pages/privacy-policy";
import EmailVerification from "@/pages/email-verification";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { auth } = useAuth();

  if (!auth) {
    return (
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/onboard" component={OnboardingPage} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route component={LoginPage} />
        </Switch>
      </Router>
    );
  }

  if (auth.role === "admin") {
    return (
      <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <Router hook={useHashLocation}>
            <Switch>
              <Route path="/privacy" component={PrivacyPolicy} />
              <Route component={AdminLayout} />
            </Switch>
          </Router>
        </div>
      </SidebarProvider>
    );
  }

  // Client — email not yet verified (just signed up)
  if (!auth.user.emailVerified) {
    return (
      <EmailVerification
        clientId={auth.user.id}
        email={auth.user.email}
        firstName={auth.user.firstName}
        mode="signup"
        onVerified={(data) => setAuth(data)}
      />
    );
  }

  // Client — onboarding incomplete
  if (!auth.user.onboardingCompleted) {
    return (
      <Router hook={useHashLocation}>
        <OnboardingPage existingClient={auth.user} />
      </Router>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route component={DashboardLayout} />
          </Switch>
        </Router>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
