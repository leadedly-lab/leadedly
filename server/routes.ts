import type { Express } from "express";
import type { Server } from "http";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { generateOtp, sendOtpEmail, sendVerificationEmail } from "./email";
import { storage, sqlite } from "./storage";
import { getTerritoryPrice, getCityPopulation, getPricingTiers } from "./territory-pricing";
// NOTE: Plaid integration has been replaced by Stripe (ACH via Financial Connections).
// The Plaid helper module and DB columns remain in place for possible rollback,
// but none of the routes below call into it.
import { stripe, isStripeConfigured, STRIPE_WEBHOOK_SECRET } from "./stripe";
import type Stripe from "stripe";

const OOC_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OOC_FEE = 25;
const LOW_BALANCE_THRESHOLD = 400;
const OOC_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

// ─── Auto-Replenish Helper ──────────────────────────────────────────────────
// Called server-side whenever a fee is deducted from a territory balance.
// If the resulting balance is below $400 and the client has auto-replenish
// enabled, it silently initiates a Stripe ACH PaymentIntent.
async function checkAndAutoReplenish(territoryId: number, clientId: number) {
  if (!isStripeConfigured) return;
  const territory = storage.getTerritory(territoryId);
  if (!territory || territory.depositBalance >= LOW_BALANCE_THRESHOLD) return;
  const client = storage.getClient(clientId);
  if (!client || !client.stripeCustomerId || !client.stripePaymentMethodId) return;
  if (!client.autoReplenishEnabled) return;
  const amount = client.replenishAmount || 1000;
  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      customer: client.stripeCustomerId,
      payment_method: client.stripePaymentMethodId,
      payment_method_types: ["us_bank_account"],
      confirm: true,
      mandate_data: {
        customer_acceptance: {
          type: "online",
          online: {
            ip_address: "0.0.0.0",
            user_agent: "Leadedly-Server",
          },
        },
      },
      description: `Auto-replenish — ${territory.city}, ${territory.state}`,
      metadata: {
        clientId: String(clientId),
        territoryId: String(territoryId),
        isAutoReplenish: "true",
      },
    });
    storage.createStripeDeposit({
      clientId,
      territoryId,
      paymentIntentId: pi.id,
      amount,
      status: pi.status === "succeeded" ? "settled" : pi.status === "processing" ? "processing" : "pending",
      description: `Auto-replenish — ${territory.city}, ${territory.state}`,
      isAutoReplenish: true,
      settledAt: null,
    });
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

// ─── OOC Sweep ──────────────────────────────────────────────────────────────
// Scans ALL leads with status "new" that are older than 1 hour and charges $25
async function sweepOocLeads() {
  const now = Date.now();
  const allLeads = storage.getLeads();
  let charged = 0;
  for (const lead of allLeads) {
    if (
      lead.status === "new" &&
      !lead.oocFeeCharged &&
      now - lead.receivedAt > OOC_WINDOW_MS
    ) {
      storage.updateLead(lead.id, {
        oocFeeCharged: true,
        oocFeeAmount: OOC_FEE,
        status: "ooc",
      });
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
        checkAndAutoReplenish(territory.id, lead.clientId).catch(() => {});
      }
      charged++;
    }
  }
  if (charged > 0) {
    console.log(`[OOC Sweep] Charged $${OOC_FEE} OOC fee on ${charged} lead(s)`);
  }
}

// Start background OOC sweep every 5 minutes
setInterval(() => {
  sweepOocLeads().catch(e => console.error("[OOC Sweep] Error:", e.message));
}, OOC_CHECK_INTERVAL_MS);

// Run once on startup (after a short delay to let the DB settle)
setTimeout(() => {
  sweepOocLeads().catch(e => console.error("[OOC Sweep] Startup error:", e.message));
}, 10_000);

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
      const { clientId, industryId, state, city } = req.body;

      // Enforce territory exclusivity within the same industry
      const allTerritories = storage.getTerritories();
      const sameIndustry = allTerritories.filter(t => t.industryId === Number(industryId) && t.clientId !== Number(clientId));

      const requestedCity = (city || "").trim();
      const isStatewide = requestedCity === "Statewide";

      // Get the industry name for error messages
      const industry = storage.getIndustries().find(i => i.id === Number(industryId));
      const industryName = industry?.name ?? "this industry";

      for (const existing of sameIndustry) {
        if (existing.state !== state) continue;

        // Block duplicate statewide territory for same state+industry
        if (isStatewide && existing.city === "Statewide") {
          return res.status(409).json({
            error: `${state} is already claimed as a statewide territory by another client in ${industryName}.`,
          });
        }

        // Rule 1: Block city purchases when a statewide territory exists
        if (!isStatewide && existing.city === "Statewide") {
          return res.status(409).json({
            error: `A statewide territory already exists for ${industryName} in ${state}. Individual city territories are not available.`,
          });
        }

        // If requesting a specific city, block if that exact city is taken
        if (!isStatewide && existing.city.toLowerCase() === requestedCity.toLowerCase()) {
          return res.status(409).json({
            error: `${requestedCity}, ${state} is already claimed by another client in this industry.`,
          });
        }
      }

      // Rule 2: For statewide purchases, find existing city territories to carve out
      let excludedCities: string[] = [];
      if (isStatewide) {
        excludedCities = sameIndustry
          .filter(t => t.state === state && t.city !== "Statewide")
          .map(t => t.city);
      }

      // Auto-calculate deposit price from population
      const pricing = getTerritoryPrice(requestedCity, state);
      const body = {
        ...req.body,
        depositAmount: req.body.depositAmount ?? pricing.price,
        population: pricing.population ?? 0,
        ...(isStatewide && excludedCities.length > 0 ? { excludedCities: JSON.stringify(excludedCities) } : {}),
      };

      const t = storage.createTerritory(body);
      res.json({ ...t, excludedCities, pricing });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // Territory pricing lookup
  app.get("/api/territory-pricing", (req, res) => {
    const { city, state } = req.query;
    if (!state) return res.status(400).json({ error: "state required" });
    const pricing = getTerritoryPrice(String(city || "Statewide"), String(state));
    res.json(pricing);
  });

  app.get("/api/territory-pricing/tiers", (_req, res) => {
    res.json(getPricingTiers());
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
  // ─── Import leads from Google Sheets (published CSV) ─────────────────────
  app.post("/api/leads/import/:clientId", async (req, res) => {
    const clientId = Number(req.params.clientId);
    const { territoryId } = req.body;
    const client = storage.getClient(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (!client.googleSheetUrl) return res.status(400).json({ error: "No Google Sheet URL configured for this client" });
    if (!territoryId) return res.status(400).json({ error: "Territory ID is required" });

    // Convert Google Sheets URL to published CSV export URL
    let csvUrl = client.googleSheetUrl;
    const sheetMatch = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch) {
      const sheetId = sheetMatch[1];
      // Extract gid if present, default to 0
      const gidMatch = csvUrl.match(/gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        return res.status(400).json({ error: `Failed to fetch sheet (${response.status}). Make sure the sheet is published to the web or shared as "Anyone with the link".` });
      }
      const csvText = await response.text();
      const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return res.status(400).json({ error: "Sheet is empty or has no data rows" });

      // Parse header row — normalize to lowercase and strip whitespace
      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, "_"));

      // Map common header variations to lead fields
      const findCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
      const colMap = {
        firstName: findCol(["first_name", "firstname", "first"]),
        lastName: findCol(["last_name", "lastname", "last", "surname"]),
        fullName: findCol(["full_name", "fullname", "name"]),
        email: findCol(["email", "e_mail", "email_address"]),
        phone: findCol(["phone", "phone_number", "telephone", "mobile", "cell"]),
        city: findCol(["city", "town"]),
        investableAssets: findCol(["investable", "assets", "net_worth", "aum"]),
      };

      if (colMap.email === -1) {
        return res.status(400).json({ error: "Could not find an 'email' column in the sheet. Make sure the header row contains an Email column." });
      }

      // Get existing lead emails for this client to skip duplicates
      const existingLeads = storage.getLeadsByClient(clientId);
      const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()));

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        const email = (cols[colMap.email] || "").replace(/^"|"$/g, "").trim().toLowerCase();
        if (!email || !email.includes("@")) { skipped++; continue; }
        if (existingEmails.has(email)) { skipped++; continue; }

        let firstName = colMap.firstName >= 0 ? cols[colMap.firstName] || "" : "";
        let lastName = colMap.lastName >= 0 ? cols[colMap.lastName] || "" : "";

        // Fall back to full_name column and split
        if (!firstName && colMap.fullName >= 0) {
          const full = (cols[colMap.fullName] || "").trim();
          const parts = full.split(/\s+/);
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
        }

        const phone = colMap.phone >= 0 ? (cols[colMap.phone] || "").trim() : "";
        const city = colMap.city >= 0 ? (cols[colMap.city] || "").trim() : "";
        const investableAssets = colMap.investableAssets >= 0 ? (cols[colMap.investableAssets] || "").trim() : "";

        try {
          storage.createLead({
            clientId,
            territoryId: Number(territoryId),
            firstName: firstName || "Unknown",
            lastName: lastName || "",
            email,
            phone,
            city,
            investableAssets,
            status: "new",
            notes: "Imported from Google Sheets",
          });
          existingEmails.add(email);
          imported++;
        } catch (e: any) {
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }

      res.json({ imported, skipped, total: lines.length - 1, errors: errors.slice(0, 5) });
    } catch (e: any) {
      res.status(500).json({ error: `Import failed: ${e.message}` });
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

  // ─── Stripe ─────────────────────────────────────────────────────────────────

  // GET /api/stripe/config — return the publishable key so the frontend can
  // initialize Stripe.js without a build-time env var.
  app.get("/api/stripe/config", (_req, res) => {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      configured: isStripeConfigured,
    });
  });

  // GET /api/stripe/status/:clientId — current link status + auto-replenish prefs
  app.get("/api/stripe/status/:clientId", (req, res) => {
    const clientId = Number(req.params.clientId);
    const client = storage.getClient(clientId);
    const linked = !!(client?.stripePaymentMethodId);
    res.json({
      configured: isStripeConfigured,
      linked,
      otpVerified: !!(client?.otpVerified),
      item: linked
        ? {
            institutionName: client?.stripeBankName || "Bank Account",
            accountMask: client?.stripeBankLast4 || "",
            accountName: "Checking",
            autoReplenishEnabled: !!client?.autoReplenishEnabled,
            replenishAmount: client?.replenishAmount ?? 1000,
          }
        : null,
    });
  });

  // POST /api/stripe/create-financial-connection-session
  // Creates a Stripe Customer if needed, then creates a Financial Connections Session.
  app.post("/api/stripe/create-financial-connection-session", async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY in environment." });
    }
    const { clientId } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });
    try {
      let customerId = client.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: client.email,
          name: `${client.firstName} ${client.lastName}`,
          phone: client.phone,
          metadata: {
            clientId: String(client.id),
            companyName: client.companyName,
          },
        });
        customerId = customer.id;
        storage.updateClient(client.id, { stripeCustomerId: customerId } as any);
      }

      const session = await stripe.financialConnections.sessions.create({
        account_holder: { type: "customer", customer: customerId },
        permissions: ["payment_method", "balances"],
        filters: { countries: ["US"] },
      });

      res.json({ client_secret: session.client_secret, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe FC session error:", e.message);
      res.status(500).json({ error: "Failed to create Financial Connections session", detail: e.message });
    }
  });

  // POST /api/stripe/save-bank-account
  // After the frontend completes the Financial Connections flow it sends us the
  // account id. We create a PaymentMethod from it, attach to customer, and save.
  app.post("/api/stripe/save-bank-account", async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const { clientId, financialConnectionAccountId } = req.body;
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (!client.stripeCustomerId) return res.status(400).json({ error: "No Stripe customer on file" });
    if (!financialConnectionAccountId) return res.status(400).json({ error: "financialConnectionAccountId required" });
    try {
      // Fetch the FC account to get bank name + last4
      const fcAccount = await stripe.financialConnections.accounts.retrieve(financialConnectionAccountId);

      const paymentMethod = await stripe.paymentMethods.create({
        type: "us_bank_account",
        us_bank_account: {
          financial_connections_account: financialConnectionAccountId,
        } as any,
      });

      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: client.stripeCustomerId,
      });

      const bankName = fcAccount.institution_name || "Bank";
      const last4 = fcAccount.last4 || "";

      storage.updateClient(client.id, {
        stripeFinancialConnectionId: financialConnectionAccountId,
        stripePaymentMethodId: paymentMethod.id,
        stripeBankName: bankName,
        stripeBankLast4: last4,
      } as any);

      res.json({
        ok: true,
        bank: {
          institutionName: bankName,
          accountMask: last4,
          accountName: "Checking",
        },
      });
    } catch (e: any) {
      console.error("Stripe save-bank-account error:", e.message);
      res.status(500).json({ error: "Failed to save bank account", detail: e.message });
    }
  });

  // DELETE /api/stripe/unlink/:clientId — clears saved Stripe bank on the client record
  app.delete("/api/stripe/unlink/:clientId", async (req, res) => {
    const clientId = Number(req.params.clientId);
    const client = storage.getClient(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (isStripeConfigured && client.stripePaymentMethodId) {
      try { await stripe.paymentMethods.detach(client.stripePaymentMethodId); } catch (_) { /* ignore */ }
    }
    storage.updateClient(clientId, {
      stripePaymentMethodId: null,
      stripeFinancialConnectionId: null,
      stripeBankName: null,
      stripeBankLast4: null,
    } as any);
    res.json({ ok: true });
  });

  // PATCH /api/stripe/replenish-settings/:clientId — toggle + amount
  app.patch("/api/stripe/replenish-settings/:clientId", (req, res) => {
    const clientId = Number(req.params.clientId);
    const { autoReplenishEnabled, replenishAmount } = req.body;
    const updated = storage.updateClient(clientId, {
      autoReplenishEnabled: !!autoReplenishEnabled,
      replenishAmount: Number(replenishAmount),
    } as any);
    if (!updated) return res.status(404).json({ error: "Client not found" });
    res.json({
      ok: true,
      item: {
        autoReplenishEnabled: !!updated.autoReplenishEnabled,
        replenishAmount: updated.replenishAmount,
      },
    });
  });

  // POST /api/stripe/deposit — initiate an ACH PaymentIntent for a territory
  app.post("/api/stripe/deposit", async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const { clientId, territoryId, amount, isAutoReplenish } = req.body;
    const territory = storage.getTerritory(Number(territoryId));
    if (!territory) return res.status(404).json({ error: "Territory not found" });
    const client = storage.getClient(Number(clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (!client.stripeCustomerId || !client.stripePaymentMethodId) {
      return res.status(400).json({ error: "No linked bank account. Please link a bank account first." });
    }
    try {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(Number(amount) * 100),
        currency: "usd",
        customer: client.stripeCustomerId,
        payment_method: client.stripePaymentMethodId,
        payment_method_types: ["us_bank_account"],
        confirm: true,
        mandate_data: {
          customer_acceptance: {
            type: "online",
            online: {
              ip_address: req.ip || "0.0.0.0",
              user_agent: req.get("user-agent") || "Leadedly",
            },
          },
        },
        description: `Leadedly deposit — ${territory.city}, ${territory.state}`,
        metadata: {
          clientId: String(clientId),
          territoryId: String(territoryId),
          isAutoReplenish: isAutoReplenish ? "true" : "false",
        },
      });

      storage.createStripeDeposit({
        clientId: Number(clientId),
        territoryId: Number(territoryId),
        paymentIntentId: pi.id,
        amount: Number(amount),
        status: pi.status === "succeeded" ? "settled" : pi.status === "processing" ? "processing" : "pending",
        description: `ACH deposit — ${territory.city}, ${territory.state}`,
        isAutoReplenish: !!isAutoReplenish,
        settledAt: null,
      });

      res.json({ ok: true, paymentIntentId: pi.id, status: pi.status });
    } catch (e: any) {
      console.error("Stripe deposit error:", e.message);
      res.status(500).json({ error: e.message || "Deposit failed" });
    }
  });

  // POST /api/stripe/check-replenish/:clientId — scan territories and auto-pull
  app.post("/api/stripe/check-replenish/:clientId", async (req, res) => {
    if (!isStripeConfigured) {
      return res.json({ triggered: 0, skipped: "Stripe not configured" });
    }
    const clientId = Number(req.params.clientId);
    const client = storage.getClient(clientId);
    if (!client || !client.stripePaymentMethodId) {
      return res.json({ triggered: 0, reason: "no linked bank" });
    }
    if (!client.autoReplenishEnabled) {
      return res.json({ triggered: 0, reason: "auto-replenish disabled" });
    }
    const territories = storage.getTerritoriesByClient(clientId);
    let triggered = 0;
    const errors: string[] = [];
    for (const territory of territories) {
      if (!territory.active) continue;
      if (territory.depositBalance < LOW_BALANCE_THRESHOLD) {
        try {
          await checkAndAutoReplenish(territory.id, clientId);
          triggered++;
        } catch (e: any) {
          errors.push(`${territory.city}: ${e.message}`);
        }
      }
    }
    res.json({ triggered, errors });
  });

  // GET /api/stripe/deposits?clientId=N or /api/stripe/deposits/:clientId
  app.get("/api/stripe/deposits/:clientId", (req, res) => {
    res.json(storage.getStripeDeposits(Number(req.params.clientId)));
  });
  app.get("/api/stripe/deposits", (req, res) => {
    const clientId = Number(req.query.clientId);
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    res.json(storage.getStripeDeposits(clientId));
  });

  // GET /api/admin/stripe-overview — all clients with their Stripe link status
  app.get("/api/admin/stripe-overview", (_req, res) => {
    const allClients = storage.getClients();
    const result = allClients.map(c => {
      const deposits = storage.getStripeDeposits(c.id);
      const totalAch = deposits.filter(d => d.status === "settled").reduce((sum, d) => sum + d.amount, 0);
      return {
        clientId: c.id,
        clientName: `${c.firstName} ${c.lastName}`,
        companyName: c.companyName,
        linked: !!c.stripePaymentMethodId,
        institutionName: c.stripeBankName || "",
        accountMask: c.stripeBankLast4 || "",
        autoReplenishEnabled: !!c.autoReplenishEnabled,
        replenishAmount: c.replenishAmount ?? 0,
        totalAchDeposited: totalAch,
        pendingTransfers: deposits.filter(d => d.status === "pending" || d.status === "processing").length,
      };
    });
    res.json(result);
  });

  // POST /api/admin/stripe-replenish/:clientId — admin manually triggers replenish
  app.post("/api/admin/stripe-replenish/:clientId", async (req, res) => {
    if (!isStripeConfigured) return res.status(503).json({ error: "Stripe not configured" });
    const clientId = Number(req.params.clientId);
    const client = storage.getClient(clientId);
    if (!client || !client.stripePaymentMethodId) {
      return res.status(400).json({ error: "No linked bank account" });
    }
    const clientTerritories = storage.getTerritoriesByClient(clientId);
    let triggered = 0;
    for (const territory of clientTerritories) {
      if (!territory.active) continue;
      try {
        const amount = client.replenishAmount || 1000;
        const pi = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "usd",
          customer: client.stripeCustomerId!,
          payment_method: client.stripePaymentMethodId,
          payment_method_types: ["us_bank_account"],
          confirm: true,
          mandate_data: {
            customer_acceptance: {
              type: "online",
              online: { ip_address: "0.0.0.0", user_agent: "Leadedly-Admin" },
            },
          },
          description: `Admin replenish — ${territory.city}, ${territory.state}`,
          metadata: {
            clientId: String(clientId),
            territoryId: String(territory.id),
            isAutoReplenish: "false",
            source: "admin",
          },
        });
        storage.createStripeDeposit({
          clientId,
          territoryId: territory.id,
          paymentIntentId: pi.id,
          amount,
          status: pi.status === "succeeded" ? "settled" : pi.status === "processing" ? "processing" : "pending",
          description: `Admin replenish — ${territory.city}, ${territory.state}`,
          isAutoReplenish: false,
          settledAt: null,
        });
        triggered++;
      } catch (e: any) {
        console.error("Admin replenish error:", e.message);
      }
    }
    res.json({ triggered });
  });

  // POST /api/stripe/webhook — payment status updates. Raw body is set up in server/index.ts.
  app.post("/api/stripe/webhook", (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!STRIPE_WEBHOOK_SECRET) {
      console.warn("STRIPE_WEBHOOK_SECRET not set — rejecting webhook");
      return res.status(500).send("Webhook secret not configured");
    }
    if (!sig) return res.status(400).send("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Stripe.PaymentIntent;
        const existing = storage.getStripeDeposit(pi.id);
        if (existing && existing.status !== "settled") {
          storage.updateStripeDepositStatus(pi.id, "settled", Date.now());
          const territory = storage.getTerritory(existing.territoryId);
          if (territory) {
            const newBalance = territory.depositBalance + existing.amount;
            storage.updateTerritory(territory.id, { depositBalance: newBalance });
            storage.createDepositTransaction({
              territoryId: territory.id,
              clientId: existing.clientId,
              type: "deposit",
              amount: existing.amount,
              description: `ACH settled via Stripe${existing.isAutoReplenish ? " (auto-replenish)" : ""} — ${territory.city}, ${territory.state}`,
              confirmedBy: "Stripe Webhook",
            });
          }
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Stripe.PaymentIntent;
        storage.updateStripeDepositStatus(pi.id, "failed");
      } else if (event.type === "payment_intent.processing") {
        const pi = event.data.object as Stripe.PaymentIntent;
        storage.updateStripeDepositStatus(pi.id, "processing");
      }
    } catch (e: any) {
      console.error("Stripe webhook handler error:", e.message);
    }

    res.json({ received: true });
  });

  // ─── Plaid (legacy) ─────────────────────────────────────────────────────────
  // The old /api/plaid/* endpoints have been removed. Bank linking, deposits,
  // and auto-replenish now flow through /api/stripe/*. The plaid_items and
  // plaid_transfers tables, plus server/plaid.ts, are left in the repo for
  // rollback but are no longer referenced at runtime.

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

  // ─── Delete Territory (Admin) ───────────────────────────────────────────────
  app.delete("/api/admin/territories/:id", (req, res) => {
    const id = Number(req.params.id);
    const territory = storage.getTerritory(id);
    if (!territory) return res.status(404).json({ error: "Territory not found" });
    storage.deleteTerritory(id);
    res.json({ ok: true });
  });

  // ─── Delete Client (Admin) ─────────────────────────────────────────────────
  app.delete("/api/admin/clients/:id", (req, res) => {
    const id = Number(req.params.id);
    const client = storage.getClient(id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    storage.deleteClient(id);
    res.json({ ok: true });
  });

  // ─── Data Products (Admin) ──────────────────────────────────────────────────
  app.get("/api/admin/data-products", (_req, res) => {
    res.json(storage.getDataProducts());
  });

  app.post("/api/admin/data-products", (req, res) => {
    const { name, description, recordCount, oneTimePrice, monthlyPrice, active } = req.body;
    if (!name || recordCount == null || oneTimePrice == null || monthlyPrice == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const product = storage.createDataProduct({
      name,
      description: description || "",
      recordCount: Number(recordCount),
      oneTimePrice: Number(oneTimePrice),
      monthlyPrice: Number(monthlyPrice),
      active: active !== false,
    });
    res.json(product);
  });

  app.put("/api/admin/data-products/:id", (req, res) => {
    const id = Number(req.params.id);
    const updated = storage.updateDataProduct(id, req.body);
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  });

  app.delete("/api/admin/data-products/:id", (_req, res) => {
    storage.deleteDataProduct(Number(_req.params.id));
    res.json({ ok: true });
  });

  // ─── Data Products (Client) ─────────────────────────────────────────────────
  app.get("/api/data-products", (_req, res) => {
    const products = storage.getDataProducts().filter(p => p.active);
    res.json(products);
  });

  app.get("/api/data-subscriptions", (req, res) => {
    const clientId = Number(req.query.clientId);
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const subs = storage.getDataSubscriptionsByClient(clientId);
    // Attach product name to each subscription
    const enriched = subs.map(s => {
      const product = storage.getDataProduct(s.productId);
      return { ...s, productName: product?.name ?? "Unknown" };
    });
    res.json(enriched);
  });

  app.post("/api/data-subscriptions", (req, res) => {
    const { productId, type, clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    if (!productId || !type || !["one_time", "monthly"].includes(type)) {
      return res.status(400).json({ error: "Invalid productId or type" });
    }
    const product = storage.getDataProduct(Number(productId));
    if (!product || !product.active) return res.status(404).json({ error: "Product not found" });
    const amount = type === "one_time" ? product.oneTimePrice : product.monthlyPrice;
    const nextBillingAt = type === "monthly" ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null;
    const sub = storage.createDataSubscription({
      clientId,
      productId: product.id,
      type,
      status: "active",
      amount,
      nextBillingAt,
      cancelledAt: null,
    });
    res.json(sub);
  });
}
