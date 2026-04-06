import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Loader2 } from "lucide-react";

interface PlaidLinkButtonProps {
  clientId: number;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  children?: React.ReactNode;
}

export function PlaidLinkButton({ clientId, onSuccess, variant = "default", className, children }: PlaidLinkButtonProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const fetchLinkToken = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/plaid/create-link-token", { clientId });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLinkToken(data.link_token);
    } catch (e: any) {
      toast({ title: "Bank Link Error", description: e.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      setExchanging(true);
      try {
        const accountId = metadata?.accounts?.[0]?.id || "";
        const institutionName = metadata?.institution?.name || "";
        const res = await apiRequest("POST", "/api/plaid/exchange-token", {
          clientId,
          publicToken,
          accountId,
          institutionName,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        queryClient.invalidateQueries({ queryKey: [`/api/plaid/status/${clientId}`] });
        toast({
          title: "Bank account linked",
          description: `${data.item?.institutionName || "Your bank"} — ${data.item?.accountName} ••••${data.item?.accountMask}`,
        });
        onSuccess?.();
      } catch (e: any) {
        toast({ title: "Link failed", description: e.message, variant: "destructive" });
      } finally {
        setExchanging(false);
        setLinkToken(null);
        setLoading(false);
      }
    },
    [clientId, onSuccess, toast]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess: handleSuccess,
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  // Once we have the token + Plaid is ready, auto-open the Link UI
  if (linkToken && ready) {
    open();
  }

  const isLoading = loading || exchanging;

  return (
    <Button
      variant={variant}
      className={className}
      onClick={fetchLinkToken}
      disabled={isLoading}
      data-testid="button-link-bank"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Landmark className="w-4 h-4 mr-2" />
      )}
      {children || (isLoading ? "Connecting..." : "Link Bank Account")}
    </Button>
  );
}
