import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, CheckCircle2, XCircle, Send, Info, Zap } from "lucide-react";

export default function AdminSMS() {
  const { toast } = useToast();
  const [testPhone, setTestPhone] = useState("");

  const { data: status } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/admin/telnyx-status"],
    refetchInterval: 30000,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/telnyx-test", { phone: testPhone });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast({ title: "Test SMS sent!", description: `Message delivered to ${testPhone}` }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">SMS Notifications</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Telnyx SMS integration — automatically texts agents and consumers when a new lead arrives.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status?.configured ? "bg-green-500/10" : "bg-muted"}`}>
                {status?.configured
                  ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                  : <XCircle className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {status?.configured ? "Telnyx Connected" : "Telnyx Not Configured"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status?.configured
                    ? "SMS messages will fire automatically when leads come in"
                    : "Add TELNYX_API_KEY and TELNYX_FROM_NUMBER to your environment variables"}
                </p>
              </div>
            </div>
            <Badge variant={status?.configured ? "default" : "secondary"}>
              {status?.configured ? "Active" : "Inactive"}
            </Badge>
          </div>

          {!status?.configured && (
            <Alert className="mt-4 border-yellow-500/30 bg-yellow-500/5">
              <Info className="w-4 h-4 text-yellow-400" />
              <AlertDescription className="text-sm text-yellow-300">
                Add these to your Render environment variables:
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  <li><code className="bg-muted px-1 rounded">TELNYX_API_KEY</code> — from telnyx.com/account/keys</li>
                  <li><code className="bg-muted px-1 rounded">TELNYX_FROM_NUMBER</code> — your Telnyx phone number (E.164 format: +1XXXXXXXXXX)</li>
                  <li><code className="bg-muted px-1 rounded">TELNYX_MESSAGING_PROFILE_ID</code> — from your Telnyx messaging profile</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* What gets sent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Automatic SMS Triggers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              trigger: "New lead created",
              recipient: "Consumer (the lead)",
              message: `"Hi [Name]! You recently requested information about [Industry]. [Agent Name], a licensed specialist in your area, will be reaching out to you shortly."`,
            },
            {
              trigger: "New lead created",
              recipient: "Agent",
              message: `"🔔 NEW LEAD — Leadedly\n[Agent], you have a new [Industry] lead!\nName: [Lead Name] | Phone: [Number] | City: [City]\nYou have 60 minutes to make first contact."`,
            },
            {
              trigger: "Deposit balance < $400",
              recipient: "Agent",
              message: `"⚠️ Leadedly: Low balance alert! [Agent], your deposit for [City] is down to $[Amount]. Top up your account to keep your leads flowing."`,
            },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">{item.trigger}</span>
                <Badge variant="outline" className="text-xs">{item.recipient}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-muted/40 p-2 rounded-lg whitespace-pre-line">
                {item.message}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Send Test SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send a sample lead alert to verify your Telnyx number is working correctly.
          </p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm">Phone number</Label>
              <Input
                type="tel"
                placeholder="+1 (555) 555-5555"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                data-testid="input-test-phone"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => testMutation.mutate()}
                disabled={!testPhone || !status?.configured || testMutation.isPending}
                data-testid="button-send-test-sms"
              >
                <Send className="w-4 h-4 mr-2" />
                {testMutation.isPending ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </div>
          {!status?.configured && (
            <p className="text-xs text-muted-foreground">Configure Telnyx credentials above before sending a test.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
