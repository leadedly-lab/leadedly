import { google } from "googleapis";

// ─── Config ───────────────────────────────────────────────────────────────────
// Two auth methods supported:
// 1. Service Account JSON (recommended for production)
//    Set GOOGLE_SERVICE_ACCOUNT_JSON env var with the full JSON key file contents
// 2. API Key (read-only, not suitable for writes)
//
// To get a service account:
// 1. Go to console.cloud.google.com → IAM → Service Accounts → Create
// 2. Download the JSON key
// 3. Share the spreadsheet with the service account email (Editor access)
// 4. Paste the entire JSON as the GOOGLE_SERVICE_ACCOUNT_JSON env var

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_CALL_REQUEST_ID ||
  "1-nF4_X7r1kdyVZVr4pu_NDA-B9jwp3MxAg8jss8SdmY";

const SHEET_NAME = "Leads";

export const isGoogleSheetsConfigured =
  !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON &&
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON !== "your_service_account_json";

function getAuth() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

  const credentials = JSON.parse(json);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// ─── Append a call request row ────────────────────────────────────────────────
export async function appendCallRequest(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  page: string;
}): Promise<void> {
  if (!isGoogleSheetsConfigured) {
    // Dev mode — just log it
    console.log("[SHEETS DEV] Call request:", data);
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        now,
        data.page,
        "New", // Status — can be updated manually in the sheet
      ]],
    },
  });

  console.log(`[SHEETS] Call request logged: ${data.firstName} ${data.lastName} (${data.email})`);
}
