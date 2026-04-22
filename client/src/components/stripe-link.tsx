import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Loader2 } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

interface StripeLinkButtonProps {
  clientId: number;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  children?: React.ReactNode;
}

let stripePromise: Promise<Stripe | null> | null = null;
async function getStripe(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise;
  stripePromise = (async () => {
    try {
      const res = await fetch("/api/stripe/config");
      const { publishableKey } = await res.json();
      if (!publishableKey) return null;
      return await loadStripe(publishableKey);
    } catch {
      return null;
    }
  })();
  return stripePromise;
}

export function StripeLinkButton({ clientId, onSuccess, variant = "default", className, children }: StripeLinkButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe failed to load — check publishable key configuration");

      const res = await apiRequest("POST", "/api/stripe/create-financial-connection-session", { clientId });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.client_secret) throw new Error("No client_secret returned");

      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: data.client_secret,
      });

      if (result.error) throw new Error(result.error.message || "Financial Connections failed");

      const session = result.financialConnectionsSession;
      const accountId = session?.accounts?.[0]?.id;
      if (!accountId) throw new Error("No bank account selected");

      const saveRes = await apiRequest("POST", "/api/stripe/save-bank-account", {
        clientId,
        financialConnectionAccountId: accountId,
      });
      const saveData = await saveRes.json();
      if (saveData.error) throw new Error(saveData.error);

      queryClient.invalidateQueries({ queryKey: [`/api/stripe/status/${clientId}`] });
      toast({
        title: "Bank account linked",
        description: `${saveData.bank?.institutionName || "Your bank"} ••••${saveData.bank?.accountMask || ""}`,
      });
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Link failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={loading}
      data-testid="button-link-bank"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Landmark className="w-4 h-4 mr-2" />
      )}
      {children || (loading ? "Connecting..." : "Link Bank Account")}
    </Button>
  );
}
