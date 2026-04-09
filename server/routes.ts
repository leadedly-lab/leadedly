import type { Express } from "express";
import type { Server } from "http";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { generateOtp, sendOtpEmail, sendVerificationEmail } from "./email";
import { storage, sqlite } from "./storage";
import {
  createLinkToken,
  exchangePublicToken,
  getAuthAccounts,
  initiateTransfer,
  getTransferStatus,
  isPlaidConfigured,
} from "./plaid";

const OOC_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OOC_FEE = 40;
const LOW_BALANCE_THRESHOLD = 400;

// ─── Auto-Replenish Helper ──────────────────────────────────────────────────
// Called server-side whenever a fee is deducted from a territory balance.
// If the resulting balance is below $400 and the client has auto-replenish
// enabled, it silently initiates an ACH pull.
async function checkAndAutoReplenish(territoryId: number, clientId: number) {
  if (!isPlaidConfigured) return;
  const territory = storage.getTerritory(territoryId);
  if (!territory || territory.depositBalance >= LOW_BALANCE_THRESHOLD) return;
  const plaidItem = storage.getPlaidItem(clientId);
  if (!plaidItem || !plaidItem.autoReplenishEnabled) return;
  try {
    const transfer = await initiateTransfer({
      accessToken: plaidItem.accessToken,
      accountId: plaidItem.accountId,
      amount: plaidItem.replenishAmount,
      description: "Leadedly Replenish",
      clientId,
    });
    storage.createPlaidTransfer({
      clientId,
      territoryId,
      transferId: transfer.id,
      amount: plaidItem.replenishAmount,
      status: transfer.status,
      type: "debit",
      description: `Auto-replenish — ${territory.city}, ${territory.state}`,
      isAutoReplenish: true,
    });
    const isSandbox = process.env.PLAID_ENV === "sandbox";
    if (isSandbox || transfer.status === "settled") {
      const refreshed = storage.getTerritory(territoryId)!;
      const newBalance = refreshed.depositBalance + plaidItem.replenishAmount;
      storage.updateTerritory(territoryId, { depositBalance: newBalance });
      storage.createDepositTransaction({
        territoryId,
        clientId,
        type: "deposit",
        amount: plaidItem.replenishAmount,
        description: `Auto-replenish via Plaid ACH — ${territory.city}, ${territory.state}`,
        confirmedBy: "Plaid Auto-Replenish",
      });
      storage.updatePlaidTransferStatus(transfer.id, "settled", Date.now());
    }
  } catch (e: any) {
    console.error(`[AutoReplenish] Territory ${territoryId}:`, e.message);
  }
}


// ─── Backup code generator ───────────────────────────────────────────────────
function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ─── Auth ───────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    // Check admin
    const admin = storage.getAdminByEmail(email);
    if (admin && admin.passwordHash === password) {
      if (admin.totpEnabled) {
        return res.json({ mfaRequired: true, adminId: admin.id });
      }
      return res.json({ role: "admin", user: admin });
    }
    // Check client — always require email OTP before granting access
    const client = storage.getClientByEmail(email);
    if (client && client.passwordHash === password) {
      // Block login if email not verified yet — re-send verification code
      if (!client.emailVerified) {
        const code = generateOtp();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        storage.setClientOtp(client.id, code, expiresAt);
        try {
          await sendVerificationEmail(client.email, client.firstName, code);
        } catch (e: any) {
          console.error('[VERIFY] Resend failed:', e?.message);
        }
        return res.json({ verificationRequired: true, clientId: client.id, email: client.email });
      }
      // Email verified — send login OTP
      const otp = generateOtp();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      storage.setClientOtp(client.id, otp, otpExpires);
      storage.updateClient(client.id, { otpVerified: false });
      try {
        await sendOtpEmail(client.email, client.firstName, otp);
      } catch (e: any) {
        console.error('[LOGIN OTP] Resend failed:', e?.message);
      }
      return res.json({ otpRequired: true, clientId: client.id, email: client.email });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  });


  // Login — step 2: TOTP verification
  app.post('/api/auth/mfa-verify', (req, res) => {
    const { adminId, token, backupCode } = req.body;
    const admin = storage.getAdminById(Number(adminId));
    if (!admin || !admin.totpEnabled || !admin.totpSecret) {
      return res.status(400).json({ error: 'MFA not configured' });
    }
    if (backupCode) {
      const codes: string[] = admin.backupCodes ? JSON.parse(admin.backupCodes) : [];
      const idx = codes.indexOf(backupCode.toUpperCase().trim());
      if (idx === -1) return res.status(401).json({ error: 'Invalid backup code' });
      codes.splice(idx, 1);
      storage.updateAdminMfa(admin.id, { backupCodes: JSON.stringify(codes) });
      return res.json({ role: 'admin', user: storage.getAdminById(admin.id) });
    }
    const valid = (speakeasy as any).totp.verify({
      secret: admin.totpSecret, encoding: 'base32', token: String(token), window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid authentication code' });
    return res.json({ role: 'admin', user: storage.getAdminById(admin.id) });
  });

  // MFA Setup — generate secret + QR code
  app.post('/api/auth/mfa-setup', async (req, res) => {
    const { adminId } = req.body;
    const admin = storage.getAdminById(Number(adminId));
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    const secret = (speakeasy as any).generateSecret({
      name: 'Leadedly (' + admin.email + ')', issuer: 'Leadedly', length: 20,
    });
    storage.updateAdminMfa(admin.id, { totpSecret: secret.base32, totpEnabled: false });
    const qrDataUrl = await (QRCode as any).toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrDataUrl });
  });

  // MFA Enable — verify first code, activate MFA, return backup codes
  app.post('/api/auth/mfa-enable', (req, res) => {
    const { adminId, token } = req.body;
    const admin = storage.getAdminById(Number(adminId));
    if (!admin || !admin.totpSecret) return res.status(400).json({ error: 'Run MFA setup first' });
    const valid = (speakeasy as any).totp.verify({
      secret: admin.totpSecret, encoding: 'base32', token: String(token), window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid code — check your authenticator app and try again' });
    const backupCodes = generateBackupCodes();
    storage.updateAdminMfa(admin.id, { totpEnabled: true, backupCodes: JSON.stringify(backupCodes) });
    res.json({ ok: true, backupCodes });
  });

  // MFA Disable — must supply current TOTP
  app.post('/api/auth/mfa-disable', (req, res) => {
    const { adminId, token } = req.body;
    const admin = storage.getAdminById(Number(adminId));
    if (!admin || !admin.totpEnabled || !admin.totpSecret) return res.status(400).json({ error: 'MFA not enabled' });
    const valid = (speakeasy as any).totp.verify({
      secret: admin.totpSecret, encoding: 'base32', token: String(token), window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid code' });
    storage.updateAdminMfa(admin.id, { totpEnabled: false, totpSecret: null, backupCodes: null });
    res.json({ ok: true });
  });

  // MFA Status
  app.get('/api/auth/mfa-status/:adminId', (req, res) => {
    const admin = storage.getAdminById(Number(req.params.adminId));
    if (!admin) return res.status(404).json({ error: 'Not found' });
    const codes: string[] = admin.backupCodes ? JSON.parse(admin.backupCodes) : [];
    res.json({ mfaEnabled: !!admin.totpEnabled, backupCodesRemaining: codes.length });
  });


  // ─── Client Email OTP ────────────────────────────────────────────────────────

  // POST /api/auth/otp-verify — verify the 6-digit code sent to client's email
  app.post('/api/auth/otp-verify', (req, res) => {
    const { clientId, code } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Lockout after 5 failed attempts
    if (client.otpAttempts >= 5) {
      storage.clearClientOtp(client.id);
      return res.status(429).json({ error: 'Too many attempts. Please sign in again to get a new code.' });
    }
    if (!client.otpCode || !client.otpExpiresAt) {
      return res.status(400).json({ error: 'No active verification code. Please sign in again.' });
    }
    if (Date.now() > client.otpExpiresAt) {
      storage.clearClientOtp(client.id);
      return res.status(400).json({ error: 'Verification code expired. Please sign in again.' });
    }
    if (client.otpCode !== code.trim()) {
      const attempts = storage.incrementOtpAttempts(client.id);
      const remaining = 5 - attempts;
      return res.status(401).json({ error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
    }
    // Success — mark session as OTP-verified, clear the one-time code
    storage.setClientOtpVerified(client.id, true);
    // Clear just the code fields, preserving otpVerified=true
    sqlite.prepare("UPDATE clients SET otp_code=NULL, otp_expires_at=NULL, otp_attempts=0 WHERE id=?").run(client.id);
    return res.json({ role: 'client', user: storage.getClient(client.id) });
  });

  // POST /api/auth/otp-resend — resend a fresh OTP code
  app.post('/api/auth/otp-resend', async (req, res) => {
    const { clientId } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    storage.setClientOtp(client.id, otp, expiresAt);
    try {
      await sendOtpEmail(client.email, client.firstName, otp);
    } catch (e: any) {
      console.error('[OTP] Resend failed:', e?.message);
    }
    res.json({ ok: true });
  });


  // POST /api/auth/verify-email — verify 6-digit code sent after signup
  app.post('/api/auth/verify-email', (req, res) => {
    const { clientId, code } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (client.emailVerified) return res.json({ role: 'client', user: client });
    if (client.otpAttempts >= 5) {
      storage.clearClientOtp(client.id);
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }
    if (!client.otpCode || !client.otpExpiresAt) {
      return res.status(400).json({ error: 'No active verification code. Please request a new one.' });
    }
    if (Date.now() > client.otpExpiresAt) {
      storage.clearClientOtp(client.id);
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }
    if (client.otpCode !== code.trim()) {
      const attempts = storage.incrementOtpAttempts(client.id);
      const remaining = 5 - attempts;
      return res.status(401).json({ error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
    }
    storage.setClientEmailVerified(client.id);
    storage.setClientOtpVerified(client.id, true);
    sqlite.prepare('UPDATE clients SET otp_code=NULL, otp_expires_at=NULL, otp_attempts=0 WHERE id=?').run(client.id);
    return res.json({ role: 'client', user: storage.getClient(client.id) });
  });

  // POST /api/auth/verify-email-resend — resend verification code
  app.post('/api/auth/verify-email-resend', async (req, res) => {
    const { clientId } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (client.emailVerified) return res.json({ ok: true, alreadyVerified: true });
    const code = generateOtp();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    storage.setClientOtp(client.id, code, expiresAt);
    try {
      await sendVerificationEmail(client.email, client.firstName, code);
    } catch (e: any) {
      console.error('[VERIFY] Resend failed:', e?.message);
    }
    res.json({ ok: true });
  });

  // ─── Industries ─────────────────────────────────────────────────────────────
  app.get("/api/industries", (_req, res) => {
    res.json(storage.getIndustries());
  });
  app.post("/api/industries", (req, res) => {
    try {
      const ind = storage.createIndustry(req.body);
      res.json(ind);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });
  app.patch("/api/industries/:id", (req, res) => {
    const ind = storage.updateIndustry(Number(req.params.id), req.body);
    if (!ind) return res.status(404).json({ error: "Not found" });
    res.json(ind);
  });
  app.delete("/api/industries/:id", (req, res) => {
    storage.deleteIndustry(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Clients ────────────────────────────────────────────────────────────────
  app.get("/api/clients", (_req, res) => {
    res.json(storage.getClients());
  });
  app.get("/api/clients/:id", (req, res) => {
    const c = storage.getClient(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.post("/api/clients", async (req, res) => {
    try {
      // Check if email already exists
      const existing = storage.getClientByEmail(req.body.email);
      if (existing) return res.status(409).json({ error: "Email already registered" });
      const client = storage.createClient({ ...req.body, passwordHash: req.body.password || "demo123" });
      // Send email verification code immediately after account creation
      const code = generateOtp();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      storage.setClientOtp(client.id, code, expiresAt);
      try {
        await sendVerificationEmail(client.email, client.firstName, code);
      } catch (e: any) {
        console.error('[VERIFY] Send failed on signup:', e?.message);
      }
      res.json({ ...client, verificationSent: true });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });
  app.patch("/api/clients/:id", (req, res) => {
    const c = storage.updateClient(Number(req.params.id), req.body);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });

  // ─── Territories ────────────────────────────────────────────────────────────
  app.get("/api/territories", (_req, res) => {
    res.json(storage.getTerritories());
  });
  app.get("/api/territories/client/:clientId", (req, res) => {
    res.json(storage.getTerritoriesByClient(Number(req.params.clientId)));
  });
  app.post("/api/territories", (req, res) => {
    try {
      const t = storage.createTerritory(req.body);
      res.json(t);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });
  app.patch("/api/territories/:id", (req, res) => {
    const t = storage.updateTerritory(Number(req.params.id), req.body);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  });
  // Admin: add deposit to territory
  app.post("/api/territories/:id/deposit", (req, res) => {
    const { amount, confirmedBy } = req.body;
    const territory = storage.getTerritory(Number(req.params.id));
    if (!territory) return res.status(404).json({ error: "Not found" });
    const newBalance = territory.depositBalance + Number(amount);
    storage.updateTerritory(territory.id, { depositBalance: newBalance });
    storage.createDepositTransaction({
      territoryId: territory.id,
      clientId: territory.clientId,
      type: "deposit",
      amount: Number(amount),
      description: `Deposit received — wired funds`,
      confirmedBy: confirmedBy || "Admin",
    });
    res.json({ balance: newBalance });
  });
  // Admin: update territory stats
  app.post("/api/territories/:id/stats", (req, res) => {
    const { monthlyAdSpend, monthlyLeadsGenerated, monthlyLeadRevenue } = req.body;
    const t = storage.updateTerritory(Number(req.params.id), {
      monthlyAdSpend: Number(monthlyAdSpend),
      monthlyLeadsGenerated: Number(monthlyLeadsGenerated),
      monthlyLeadRevenue: Number(monthlyLeadRevenue),
    });
    res.json(t);
  });

  // ─── Leads ──────────────────────────────────────────────────────────────────
  app.get("/api/leads", (_req, res) => {
    res.json(storage.getLeads());
  });
  app.get("/api/leads/client/:clientId", (req, res) => {
    const clientLeads = storage.getLeadsByClient(Number(req.params.clientId));
    // Auto-check OOC for any unprocessed leads
    const now = Date.now();
    for (const lead of clientLeads) {
      if (
        !lead.oocFeeCharged &&
        lead.status === "new" &&
        now - lead.receivedAt > OOC_WINDOW_MS
      ) {
        // Mark OOC
        storage.updateLead(lead.id, {
          oocFeeCharged: true,
          oocFeeAmount: OOC_FEE,
          status: "ooc",
        });
        // Deduct from territory
        const territory = storage.getTerritory(lead.territoryId);
        if (territory) {
          const newBalance = territory.depositBalance - OOC_FEE;
          storage.updateTerritory(territory.id, { depositBalance: newBalance });
          storage.createDepositTransaction({
            territoryId: territory.id,
            clientId: lead.clientId,
            type: "ooc_fee",
            amount: -OOC_FEE,
            description: `OOC Fee — ${lead.firstName} ${lead.lastName} not contacted within 1 hour`,
            leadId: lead.id,
          });
          // Trigger auto-replenish if balance dipped below $400
          checkAndAutoReplenish(territory.id, lead.clientId).catch(() => {});
        }
      }
    }
    res.json(storage.getLeadsByClient(Number(req.params.clientId)));
  });
  app.post("/api/leads", (req, res) => {
    try {
      const lead = storage.createLead(req.body);
      res.json(lead);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });
  app.patch("/api/leads/:id", (req, res) => {
    const lead = storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Not found" });

    const updates: any = { ...req.body };
    const now = Date.now();

    // If status changes to contacted/no_answer/interested/not_interested for first time
    if (!lead.firstContactAt && ["contacted", "no_answer", "not_interested", "interested"].includes(req.body.status)) {
      updates.firstContactAt = now;
    }

    // If closing a lead — charge success fee
    if (req.body.status === "closed" && lead.status !== "closed") {
      const territory = storage.getTerritory(lead.territoryId);
      const industryData = territory ? storage.getIndustry(territory.industryId) : null;
      const successFee = industryData?.successFee ?? 250;

      updates.closedAt = now;
      updates.successFeeCharged = successFee;

      if (territory) {
        const newBalance = territory.depositBalance - successFee;
        storage.updateTerritory(territory.id, {
          depositBalance: newBalance,
          monthlyLeadRevenue: territory.monthlyLeadRevenue + successFee,
        });
        storage.createDepositTransaction({
          territoryId: territory.id,
          clientId: lead.clientId,
          type: "success_fee",
          amount: -successFee,
          description: `Success Fee — ${lead.firstName} ${lead.lastName} closed`,
          leadId: lead.id,
        });
        // Trigger auto-replenish if balance dipped below $400
        checkAndAutoReplenish(territory.id, lead.clientId).catch(() => {});
      }
    }

    const updated = storage.updateLead(lead.id, updates);
    res.json(updated);
  });

  // ─── Deposit Transactions ───────────────────────────────────────────────────
  app.get("/api/transactions", (_req, res) => {
    res.json(storage.getDepositTransactions());
  });
  app.get("/api/transactions/client/:clientId", (req, res) => {
    res.json(storage.getDepositTransactionsByClient(Number(req.params.clientId)));
  });
  app.get("/api/transactions/territory/:territoryId", (req, res) => {
    res.json(storage.getDepositTransactionsByTerritory(Number(req.params.territoryId)));
  });

  // ─── Dashboard Stats ────────────────────────────────────────────────────────
  app.get("/api/stats/client/:clientId", (req, res) => {
    const clientId = Number(req.params.clientId);
    const clientTerritories = storage.getTerritoriesByClient(clientId);
    const clientLeads = storage.getLeadsByClient(clientId);
    const totalBalance = clientTerritories.reduce((sum, t) => sum + t.depositBalance, 0);
    const totalLeads = clientLeads.length;
    const closedLeads = clientLeads.filter(l => l.status === "closed").length;
    const oocLeads = clientLeads.filter(l => l.status === "ooc").length;
    const newLeads = clientLeads.filter(l => l.status === "new").length;
    const lowBalance = clientTerritories.some(t => t.depositBalance < LOW_BALANCE_THRESHOLD);
    res.json({ totalBalance, totalLeads, closedLeads, oocLeads, newLeads, lowBalance, territoriesCount: clientTerritories.length });
  });

  // ─── Plaid ──────────────────────────────────────────────────────────────────

  // GET /api/plaid/status — returns whether Plaid is configured + client's linked bank
  app.get("/api/plaid/status/:clientId", (req, res) => {
    const clientId = Number(req.params.clientId);
    const item = storage.getPlaidItem(clientId);
    const client = storage.getClient(clientId);
    res.json({
      configured: isPlaidConfigured,
      linked: !!item,
      otpVerified: !!(client?.otpVerified), // session must be OTP-verified to use Plaid Link
      item: item
        ? {
            accountName: item.accountName,
            accountMask: item.accountMask,
            institutionName: item.institutionName,
            autoReplenishEnabled: item.autoReplenishEnabled,
            replenishAmount: item.replenishAmount,
          }
        : null,
    });
  });

  // POST /api/plaid/create-link-token — frontend calls this to open Plaid Link
  app.post("/api/plaid/create-link-token", async (req, res) => {
    if (!isPlaidConfigured) {
      return res.status(503).json({ error: "Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env" });
    }
    const { clientId } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });
    try {
      const linkToken = await createLinkToken(clientId, `${client.firstName} ${client.lastName}`);
      res.json({ link_token: linkToken });
    } catch (e: any) {
      console.error("Plaid createLinkToken error:", e?.response?.data || e.message);
      res.status(500).json({ error: "Failed to create Plaid link token", detail: e?.response?.data || e.message });
    }
  });

  // POST /api/plaid/exchange-token — called after user completes Plaid Link
  app.post("/api/plaid/exchange-token", async (req, res) => {
    if (!isPlaidConfigured) {
      return res.status(503).json({ error: "Plaid not configured" });
    }
    const { clientId, publicToken, accountId, institutionName } = req.body;
    try {
      const { accessToken, itemId } = await exchangePublicToken(publicToken);
      // Get account details
      const authData = await getAuthAccounts(accessToken);
      const account = authData.accounts.find((a: any) => a.account_id === accountId) || authData.accounts[0];
      const item = storage.upsertPlaidItem({
        clientId: Number(clientId),
        accessToken,
        itemId,
        accountId: account.account_id,
        accountName: account.name || "Checking",
        accountMask: account.mask || "",
        institutionName: institutionName || "",
        autoReplenishEnabled: true,
        replenishAmount: 1000,
      });
      res.json({ ok: true, item: { accountName: item.accountName, accountMask: item.accountMask, institutionName: item.institutionName } });
    } catch (e: any) {
      console.error("Plaid exchange error:", e?.response?.data || e.message);
      res.status(500).json({ error: "Failed to link bank account", detail: e?.response?.data || e.message });
    }
  });

  // DELETE /api/plaid/unlink/:clientId — remove linked bank
  app.delete("/api/plaid/unlink/:clientId", (req, res) => {
    storage.deletePlaidItem(Number(req.params.clientId));
    res.json({ ok: true });
  });

  // PATCH /api/plaid/replenish-settings/:clientId — update auto-replenish toggle + amount
  app.patch("/api/plaid/replenish-settings/:clientId", (req, res) => {
    const { autoReplenishEnabled, replenishAmount } = req.body;
    const item = storage.updatePlaidItem(Number(req.params.clientId), {
      autoReplenishEnabled: !!autoReplenishEnabled,
      replenishAmount: Number(replenishAmount),
    });
    if (!item) return res.status(404).json({ error: "No linked bank account found" });
    res.json({ ok: true, item });
  });

  // POST /api/plaid/deposit — initiate ACH pull for a specific territory
  app.post("/api/plaid/deposit", async (req, res) => {
    if (!isPlaidConfigured) {
      return res.status(503).json({ error: "Plaid not configured" });
    }
    const { clientId, territoryId, amount, isAutoReplenish } = req.body;
    const territory = storage.getTerritory(Number(territoryId));
    if (!territory) return res.status(404).json({ error: "Territory not found" });
    const plaidItem = storage.getPlaidItem(Number(clientId));
    if (!plaidItem) return res.status(400).json({ error: "No linked bank account. Please link a bank account first." });
    try {
      const transfer = await initiateTransfer({
        accessToken: plaidItem.accessToken,
        accountId: plaidItem.accountId,
        amount: Number(amount),
        description: `Leadedly Deposit`,
        clientId: Number(clientId),
      });
      // Record the pending transfer
      storage.createPlaidTransfer({
        clientId: Number(clientId),
        territoryId: Number(territoryId),
        transferId: transfer.id,
        amount: Number(amount),
        status: transfer.status,
        type: "debit",
        description: `ACH deposit — ${territory.city}, ${territory.state}`,
        isAutoReplenish: !!isAutoReplenish,
      });
      // In sandbox mode, Plaid immediately settles — credit the balance
      // In production, balance is credited on webhook settlement
      const isSandbox = process.env.PLAID_ENV === "sandbox";
      if (isSandbox || transfer.status === "settled") {
        const newBalance = territory.depositBalance + Number(amount);
        storage.updateTerritory(territory.id, { depositBalance: newBalance });
        storage.createDepositTransaction({
          territoryId: territory.id,
          clientId: Number(clientId),
          type: "deposit",
          amount: Number(amount),
          description: `ACH deposit via Plaid${isAutoReplenish ? " (auto-replenish)" : ""} — ${territory.city}, ${territory.state}`,
          confirmedBy: "Plaid ACH",
        });
        storage.updatePlaidTransferStatus(transfer.id, "settled", Date.now());
      }
      res.json({ ok: true, transferId: transfer.id, status: transfer.status });
    } catch (e: any) {
      console.error("Plaid transfer error:", e?.response?.data || e.message);
      res.status(500).json({ error: e.message || "Transfer failed", detail: e?.response?.data });
    }
  });

  // POST /api/plaid/check-replenish — check all territories for a client and auto-replenish if below $400
  app.post("/api/plaid/check-replenish/:clientId", async (req, res) => {
    if (!isPlaidConfigured) {
      return res.json({ triggered: 0, skipped: "Plaid not configured" });
    }
    const clientId = Number(req.params.clientId);
    const plaidItem = storage.getPlaidItem(clientId);
    if (!plaidItem || !plaidItem.autoReplenishEnabled) {
      return res.json({ triggered: 0, reason: plaidItem ? "auto-replenish disabled" : "no linked bank" });
    }
    const territories = storage.getTerritoriesByClient(clientId);
    let triggered = 0;
    const errors: string[] = [];
    for (const territory of territories) {
      if (!territory.active) continue;
      if (territory.depositBalance < LOW_BALANCE_THRESHOLD) {
        try {
          const transfer = await initiateTransfer({
            accessToken: plaidItem.accessToken,
            accountId: plaidItem.accountId,
            amount: plaidItem.replenishAmount,
            description: `Leadedly Replenish`,
            clientId,
          });
          storage.createPlaidTransfer({
            clientId,
            territoryId: territory.id,
            transferId: transfer.id,
            amount: plaidItem.replenishAmount,
            status: transfer.status,
            type: "debit",
            description: `Auto-replenish — ${territory.city}, ${territory.state}`,
            isAutoReplenish: true,
          });
          const isSandbox = process.env.PLAID_ENV === "sandbox";
          if (isSandbox || transfer.status === "settled") {
            const newBalance = territory.depositBalance + plaidItem.replenishAmount;
            storage.updateTerritory(territory.id, { depositBalance: newBalance });
            storage.createDepositTransaction({
              territoryId: territory.id,
              clientId,
              type: "deposit",
              amount: plaidItem.replenishAmount,
              description: `Auto-replenish via Plaid ACH — ${territory.city}, ${territory.state}`,
              confirmedBy: "Plaid Auto-Replenish",
            });
            storage.updatePlaidTransferStatus(transfer.id, "settled", Date.now());
          }
          triggered++;
        } catch (e: any) {
          errors.push(`${territory.city}: ${e.message}`);
        }
      }
    }
    res.json({ triggered, errors });
  });

  // GET /api/plaid/transfers/:clientId — list ACH transfer history
  app.get("/api/plaid/transfers/:clientId", (req, res) => {
    res.json(storage.getPlaidTransfers(Number(req.params.clientId)));
  });

  // GET /api/admin/plaid-overview — all clients with their Plaid link status
  app.get("/api/admin/plaid-overview", (req, res) => {
    const allClients = storage.getClients();
    const result = allClients.map(c => {
      const item = storage.getPlaidItem(c.id);
      const transfers = storage.getPlaidTransfers(c.id);
      const totalAch = transfers.filter(t => t.status === "settled").reduce((sum, t) => sum + t.amount, 0);
      return {
        clientId: c.id,
        clientName: `${c.firstName} ${c.lastName}`,
        companyName: c.companyName,
        linked: !!item,
        institutionName: item?.institutionName || "",
        accountMask: item?.accountMask || "",
        autoReplenishEnabled: item?.autoReplenishEnabled ?? false,
        replenishAmount: item?.replenishAmount ?? 0,
        totalAchDeposited: totalAch,
        pendingTransfers: transfers.filter(t => t.status === "pending").length,
      };
    });
    res.json(result);
  });

  // POST /api/admin/plaid-replenish/:clientId — admin manually triggers replenish for a client
  app.post("/api/admin/plaid-replenish/:clientId", async (req, res) => {
    const clientId = Number(req.params.clientId);
    const plaidItem = storage.getPlaidItem(clientId);
    if (!plaidItem) return res.status(400).json({ error: "No linked bank account" });
    if (!isPlaidConfigured) return res.status(503).json({ error: "Plaid not configured" });
    const clientTerritories = storage.getTerritoriesByClient(clientId);
    let triggered = 0;
    for (const territory of clientTerritories) {
      if (!territory.active) continue;
      try {
        const transfer = await initiateTransfer({
          accessToken: plaidItem.accessToken,
          accountId: plaidItem.accountId,
          amount: plaidItem.replenishAmount,
          description: "Leadedly Replenish",
          clientId,
        });
        storage.createPlaidTransfer({
          clientId, territoryId: territory.id, transferId: transfer.id,
          amount: plaidItem.replenishAmount, status: transfer.status,
          type: "debit", description: `Admin replenish — ${territory.city}, ${territory.state}`,
          isAutoReplenish: false,
        });
        const isSandbox = process.env.PLAID_ENV === "sandbox";
        if (isSandbox || transfer.status === "settled") {
          const newBalance = territory.depositBalance + plaidItem.replenishAmount;
          storage.updateTerritory(territory.id, { depositBalance: newBalance });
          storage.createDepositTransaction({
            territoryId: territory.id, clientId,
            type: "deposit", amount: plaidItem.replenishAmount,
            description: `Admin ACH replenish — ${territory.city}, ${territory.state}`,
            confirmedBy: "Admin",
          });
          storage.updatePlaidTransferStatus(transfer.id, "settled", Date.now());
        }
        triggered++;
      } catch (e: any) {
        console.error("Admin replenish error:", e.message);
      }
    }
    res.json({ triggered });
  });

  // POST /api/plaid/webhook — Plaid sends transfer status updates here
  app.post("/api/plaid/webhook", async (req, res) => {
    const { webhook_type, webhook_code, transfer_id, new_transfer_status } = req.body;
    if (webhook_type === "TRANSFER" && transfer_id) {
      const existing = storage.getPlaidTransfer(transfer_id);
      if (existing && new_transfer_status === "settled") {
        storage.updatePlaidTransferStatus(transfer_id, "settled", Date.now());
        // Credit the territory balance on settlement
        const territory = storage.getTerritory(existing.territoryId);
        if (territory) {
          const newBalance = territory.depositBalance + existing.amount;
          storage.updateTerritory(territory.id, { depositBalance: newBalance });
          storage.createDepositTransaction({
            territoryId: territory.id,
            clientId: existing.clientId,
            type: "deposit",
            amount: existing.amount,
            description: `ACH settled via Plaid${existing.isAutoReplenish ? " (auto-replenish)" : ""} — ${territory.city}, ${territory.state}`,
            confirmedBy: "Plaid Webhook",
          });
        }
      } else if (existing && ["failed", "cancelled", "returned"].includes(new_transfer_status)) {
        storage.updatePlaidTransferStatus(transfer_id, new_transfer_status);
      }
    }
    res.json({ ok: true });
  });

  // ─── Dashboard Stats ────────────────────────────────────────────────────────
  app.get("/api/stats/admin", (_req, res) => {
    const allClients = storage.getClients();
    const allTerritories = storage.getTerritories();
    const allLeads = storage.getLeads();
    const allTransactions = storage.getDepositTransactions();
    const totalRevenue = allTransactions.filter(t => t.type !== "deposit").reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDeposits = allTransactions.filter(t => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0);
    const closedLeads = allLeads.filter(l => l.status === "closed").length;
    res.json({
      totalClients: allClients.length,
      totalTerritories: allTerritories.length,
      totalLeads: allLeads.length,
      closedLeads,
      totalRevenue,
      totalDeposits,
    });
  });
}
