import Telnyx from "telnyx";

// ─── Config ───────────────────────────────────────────────────────────────────
const TELNYX_API_KEY        = process.env.TELNYX_API_KEY || "";
const TELNYX_FROM_NUMBER    = process.env.TELNYX_FROM_NUMBER || ""; // Your Telnyx phone number e.g. +18005551234
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

export const isTelnyxConfigured =
  TELNYX_API_KEY !== "" &&
  TELNYX_API_KEY !== "your_telnyx_api_key" &&
  TELNYX_FROM_NUMBER !== "";

const client = isTelnyxConfigured
  ? new Telnyx({ apiKey: TELNYX_API_KEY })
  : null;

// ─── Core send function ───────────────────────────────────────────────────────
async function sendSMS(to: string, text: string): Promise<void> {
  if (!isTelnyxConfigured) {
    console.log(`[TELNYX DEV] SMS to ${to}: ${text}`);
    return;
  }

  // Normalize to E.164 format
  const normalized = normalizePhone(to);
  if (!normalized) {
    console.error(`[TELNYX] Invalid phone number: ${to}`);
    return;
  }

  const params: any = {
    from: TELNYX_FROM_NUMBER,
    to: normalized,
    text,
  };

  if (TELNYX_MESSAGING_PROFILE_ID) {
    params.messaging_profile_id = TELNYX_MESSAGING_PROFILE_ID;
  }

  await client!.messages.create(params);
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return null;
}

// ─── Consumer SMS — sent to the insurance lead when they come in ──────────────
export async function sendLeadWelcomeSMS(
  consumerPhone: string,
  consumerFirstName: string,
  agentName: string,
  industry: string
): Promise<void> {
  const text =
    `Hi ${consumerFirstName}! You recently requested information about ${industry}. ` +
    `${agentName}, a licensed specialist in your area, will be reaching out to you shortly. ` +
    `Reply STOP to opt out.`;

  try {
    await sendSMS(consumerPhone, text);
    console.log(`[TELNYX] Welcome SMS sent to consumer ${consumerPhone}`);
  } catch (err: any) {
    console.error(`[TELNYX] Failed to send welcome SMS to ${consumerPhone}:`, err?.message);
  }
}

// ─── Agent SMS — sent to the agent the instant a new lead arrives ─────────────
export async function sendAgentLeadAlertSMS(
  agentPhone: string,
  agentFirstName: string,
  leadFirstName: string,
  leadLastName: string,
  leadPhone: string,
  leadCity: string,
  industry: string
): Promise<void> {
  const text =
    `🔔 NEW LEAD — Leadedly\n` +
    `${agentFirstName}, you have a new ${industry} lead!\n\n` +
    `Name: ${leadFirstName} ${leadLastName}\n` +
    `Phone: ${leadPhone}\n` +
    `City: ${leadCity}\n\n` +
    `You have 60 minutes to make first contact. Log in at app.leadedly.com`;

  try {
    await sendSMS(agentPhone, text);
    console.log(`[TELNYX] Lead alert SMS sent to agent ${agentPhone}`);
  } catch (err: any) {
    console.error(`[TELNYX] Failed to send lead alert to agent ${agentPhone}:`, err?.message);
  }
}

// ─── Low balance alert — sent to agent when deposit dips below threshold ──────
export async function sendLowBalanceSMS(
  agentPhone: string,
  agentFirstName: string,
  balance: number,
  city: string
): Promise<void> {
  const text =
    `⚠️ Leadedly: Low balance alert!\n` +
    `${agentFirstName}, your deposit for ${city} is down to $${balance.toFixed(2)}. ` +
    `Top up your account to keep your leads flowing: app.leadedly.com`;

  try {
    await sendSMS(agentPhone, text);
    console.log(`[TELNYX] Low balance SMS sent to ${agentPhone}`);
  } catch (err: any) {
    console.error(`[TELNYX] Failed to send low balance SMS:`, err?.message);
  }
}
