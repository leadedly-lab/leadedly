import Sendblue from "sendblue";

// ─── Config ───────────────────────────────────────────────────────────────────
const SENDBLUE_API_KEY    = process.env.SENDBLUE_API_KEY    || "";
const SENDBLUE_API_SECRET = process.env.SENDBLUE_API_SECRET || "";
const SENDBLUE_FROM_NUMBER = process.env.SENDBLUE_FROM_NUMBER || ""; // E.164 e.g. +18005551234

export const isSendBlueConfigured =
  SENDBLUE_API_KEY    !== "" &&
  SENDBLUE_API_KEY    !== "your_sendblue_api_key" &&
  SENDBLUE_API_SECRET !== "" &&
  SENDBLUE_FROM_NUMBER !== "";

const client = isSendBlueConfigured
  ? new Sendblue(SENDBLUE_API_KEY, SENDBLUE_API_SECRET)
  : null;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function sendMessage(to: string, text: string): Promise<void> {
  if (!isSendBlueConfigured || !client) {
    console.log(`[SENDBLUE DEV] iMessage to ${to}: ${text}`);
    return;
  }
  const normalized = normalizePhone(to);
  await client.sendMessage(
    normalized,
    text,
    "invisible",       // send_style — invisible ink for a premium feel
    undefined,         // media_url
    undefined,         // status_callback — optional webhook
  );
}

// ─── Consumer iMessage — sent to the lead when they come in ──────────────────
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
    await sendMessage(consumerPhone, text);
    console.log(`[SENDBLUE] Welcome iMessage sent to consumer ${consumerPhone}`);
  } catch (err: any) {
    console.error(`[SENDBLUE] Failed to send welcome message to ${consumerPhone}:`, err?.message);
  }
}

// ─── Agent iMessage — sent to the agent the instant a new lead arrives ────────
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
    await sendMessage(agentPhone, text);
    console.log(`[SENDBLUE] Lead alert iMessage sent to agent ${agentPhone}`);
  } catch (err: any) {
    console.error(`[SENDBLUE] Failed to send lead alert to ${agentPhone}:`, err?.message);
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
    await sendMessage(agentPhone, text);
    console.log(`[SENDBLUE] Low balance iMessage sent to ${agentPhone}`);
  } catch (err: any) {
    console.error(`[SENDBLUE] Failed to send low balance alert:`, err?.message);
  }
}
