import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";
import type { LinkTokenCreateRequest, TransferAuthorizationCreateRequest, TransferCreateRequest } from "plaid";

// ─── Plaid Client Setup ──────────────────────────────────────────────────────
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || "";
const PLAID_SECRET = process.env.PLAID_SECRET || "";
const PLAID_ENV = (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments;
const PLAID_TRANSFER_ORIGINATION_ACCOUNT_ID = process.env.PLAID_TRANSFER_ORIGINATION_ACCOUNT_ID || "";

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
      "PLAID-SECRET": PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const isPlaidConfigured =
  PLAID_CLIENT_ID !== "" &&
  PLAID_CLIENT_ID !== "your_plaid_client_id" &&
  PLAID_SECRET !== "" &&
  PLAID_SECRET !== "your_plaid_sandbox_secret";

// ─── Create Link Token ───────────────────────────────────────────────────────
// Generates a short-lived token that Plaid Link uses to open the bank auth UI
export async function createLinkToken(clientId: number, clientName: string) {
  const request: LinkTokenCreateRequest = {
    user: { client_user_id: String(clientId) },
    client_name: "Leadedly",
    products: [Products.Auth],
    country_codes: [CountryCode.Us],
    language: "en",
    // Pre-configure for ACH bank accounts only
    account_filters: {
      depository: {
        account_subtypes: ["checking" as any],
      },
    },
  };
  const response = await plaidClient.linkTokenCreate(request);
  return response.data.link_token;
}

// ─── Exchange Public Token ───────────────────────────────────────────────────
// After the user completes Plaid Link, exchange the one-time public_token for
// a permanent access_token + grab their account details
export async function exchangePublicToken(publicToken: string) {
  const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = tokenResponse.data;
  return { accessToken: access_token, itemId: item_id };
}

// ─── Get Auth (account + routing numbers) ────────────────────────────────────
export async function getAuthAccounts(accessToken: string) {
  const response = await plaidClient.authGet({ access_token: accessToken });
  return response.data;
}

// ─── Initiate ACH Transfer (debit = pull from client) ────────────────────────
export async function initiateTransfer({
  accessToken,
  accountId,
  amount,
  description,
  clientId,
}: {
  accessToken: string;
  accountId: string;
  amount: number; // in dollars
  description: string;
  clientId: number;
}) {
  // Step 1: Create transfer authorization
  const authRequest: TransferAuthorizationCreateRequest = {
    access_token: accessToken,
    account_id: accountId,
    type: "debit" as any,
    network: "ach",
    amount: amount.toFixed(2),
    ach_class: "ppd", // Prearranged Payment or Deposit — standard for consumer ACH
    user: {
      legal_name: `Client ${clientId}`,
      client_user_id: String(clientId),
    },
  };

  const authResponse = await plaidClient.transferAuthorizationCreate(authRequest);
  const authorization = authResponse.data.authorization;

  if (authorization.decision !== "approved") {
    throw new Error(
      `ACH authorization declined: ${authorization.decision_rationale?.description || "Unknown reason"}`
    );
  }

  // Step 2: Create the actual transfer
  const transferRequest: TransferCreateRequest = {
    access_token: accessToken,
    account_id: accountId,
    authorization_id: authorization.id,
    description: description.substring(0, 15), // Plaid description max 15 chars
    amount: amount.toFixed(2),
    network: "ach" as any,
    type: "debit" as any,
    ach_class: "ppd",
    user: {
      legal_name: `Client ${clientId}`,
      client_user_id: String(clientId),
    },
    ...(PLAID_TRANSFER_ORIGINATION_ACCOUNT_ID
      ? { origination_account_id: PLAID_TRANSFER_ORIGINATION_ACCOUNT_ID }
      : {}),
  };

  const transferResponse = await plaidClient.transferCreate(transferRequest);
  return transferResponse.data.transfer;
}

// ─── Get Transfer Status ─────────────────────────────────────────────────────
export async function getTransferStatus(transferId: string) {
  const response = await plaidClient.transferGet({ transfer_id: transferId });
  return response.data.transfer;
}

// ─── Cancel Transfer ─────────────────────────────────────────────────────────
export async function cancelTransfer(transferId: string) {
  const response = await plaidClient.transferCancel({ transfer_id: transferId });
  return response.data;
}
