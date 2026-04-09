import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Industries ────────────────────────────────────────────────────────────────
export const industries = sqliteTable("industries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // lucide icon name
  successFee: real("success_fee").notNull().default(250),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const insertIndustrySchema = createInsertSchema(industries).omit({ id: true });
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type Industry = typeof industries.$inferSelect;

// ─── Clients ───────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  companyName: text("company_name").notNull(),
  jobTitle: text("job_title").notNull(),
  industryId: integer("industry_id").notNull(),
  teamSize: text("team_size").notNull(), // "Just Me", "2-4", "5-8", "9+"
  citiesServed: integer("cities_served").notNull().default(1),
  monthlyLeadSpend: text("monthly_lead_spend").notNull(),
  status: text("status").notNull().default("active"), // active, suspended, inactive
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  // Auth
  passwordHash: text("password_hash").notNull().default("demo123"),
  role: text("role").notNull().default("client"), // client | admin
  // Email verification on signup
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  // Email OTP MFA
  otpCode: text("otp_code"),           // 6-digit code (hashed)
  otpExpiresAt: integer("otp_expires_at"), // unix ms expiry
  otpVerified: integer("otp_verified", { mode: "boolean" }).notNull().default(false), // session verified flag
  otpAttempts: integer("otp_attempts").notNull().default(0), // failed attempt counter
  // Google Sheets integration
  googleSheetUrl: text("google_sheet_url"),
  // TOS
  tosAgreedAt: integer("tos_agreed_at"),
});
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── Territories ───────────────────────────────────────────────────────────────
export const territories = sqliteTable("territories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  industryId: integer("industry_id").notNull(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  depositAmount: real("deposit_amount").notNull().default(2000),
  depositBalance: real("deposit_balance").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // Admin tracking
  monthlyAdSpend: real("monthly_ad_spend").notNull().default(0),
  monthlyLeadsGenerated: integer("monthly_leads_generated").notNull().default(0),
  monthlyLeadRevenue: real("monthly_lead_revenue").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertTerritorySchema = createInsertSchema(territories).omit({ id: true, createdAt: true });
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;
export type Territory = typeof territories.$inferSelect;

// ─── Leads ─────────────────────────────────────────────────────────────────────
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  territoryId: integer("territory_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  investableAssets: text("investable_assets").notNull().default(""),
  status: text("status").notNull().default("new"), // new | contacted | no_answer | not_interested | interested | closed | ooc
  notes: text("notes").notNull().default(""),
  // OOC tracking
  receivedAt: integer("received_at").notNull().$defaultFn(() => Date.now()),
  firstContactAt: integer("first_contact_at"),
  oocFeeCharged: integer("ooc_fee_charged", { mode: "boolean" }).notNull().default(false),
  oocFeeAmount: real("ooc_fee_amount").notNull().default(0),
  // Success fee
  closedAt: integer("closed_at"),
  successFeeCharged: real("success_fee_charged").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, receivedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ─── Deposit Transactions ───────────────────────────────────────────────────────
export const depositTransactions = sqliteTable("deposit_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  territoryId: integer("territory_id").notNull(),
  clientId: integer("client_id").notNull(),
  type: text("type").notNull(), // deposit | success_fee | ooc_fee
  amount: real("amount").notNull(), // positive = deposit, negative = deduction
  description: text("description").notNull(),
  leadId: integer("lead_id"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  // Admin: manual deposit confirmation
  confirmedBy: text("confirmed_by"),
});
export const insertDepositTransactionSchema = createInsertSchema(depositTransactions).omit({ id: true, createdAt: true });
export type InsertDepositTransaction = z.infer<typeof insertDepositTransactionSchema>;
export type DepositTransaction = typeof depositTransactions.$inferSelect;

// ─── Plaid Items ──────────────────────────────────────────────────────────────
// One per client — stores their linked bank account (Plaid access token)
export const plaidItems = sqliteTable("plaid_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  itemId: text("item_id").notNull(),
  accountId: text("account_id").notNull(), // the ACH-capable checking account
  accountName: text("account_name").notNull().default("Checking"),
  accountMask: text("account_mask").notNull().default(""), // last 4 digits
  institutionName: text("institution_name").notNull().default(""),
  // Auto-replenish settings per client
  autoReplenishEnabled: integer("auto_replenish_enabled", { mode: "boolean" }).notNull().default(true),
  replenishAmount: real("replenish_amount").notNull().default(1000), // how much to pull when balance dips below threshold
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertPlaidItemSchema = createInsertSchema(plaidItems).omit({ id: true, createdAt: true });
export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;
export type PlaidItem = typeof plaidItems.$inferSelect;

// ─── Plaid Transfers ───────────────────────────────────────────────────────────
// Tracks every ACH transfer initiated via Plaid Transfer API
export const plaidTransfers = sqliteTable("plaid_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  territoryId: integer("territory_id").notNull(),
  transferId: text("transfer_id").notNull().unique(), // Plaid transfer ID
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | posted | settled | failed | cancelled
  type: text("type").notNull().default("debit"), // debit (pull from client) | credit (push to client)
  description: text("description").notNull().default(""),
  isAutoReplenish: integer("is_auto_replenish", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  settledAt: integer("settled_at"),
});
export const insertPlaidTransferSchema = createInsertSchema(plaidTransfers).omit({ id: true, createdAt: true });
export type InsertPlaidTransfer = z.infer<typeof insertPlaidTransferSchema>;
export type PlaidTransfer = typeof plaidTransfers.$inferSelect;

// ─── Data Products ─────────────────────────────────────────────────────────────
export const dataProducts = sqliteTable("data_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  recordCount: integer("record_count").notNull(), // number of records included
  oneTimePrice: real("one_time_price").notNull(), // price for one-time purchase
  monthlyPrice: real("monthly_price").notNull(), // price for monthly subscription
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertDataProductSchema = createInsertSchema(dataProducts).omit({ id: true, createdAt: true });
export type InsertDataProduct = z.infer<typeof insertDataProductSchema>;
export type DataProduct = typeof dataProducts.$inferSelect;

// ─── Data Subscriptions ────────────────────────────────────────────────────────
export const dataSubscriptions = sqliteTable("data_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  productId: integer("product_id").notNull(),
  type: text("type").notNull(), // one_time | monthly
  status: text("status").notNull().default("active"), // active | cancelled | expired
  amount: real("amount").notNull(), // price paid
  nextBillingAt: integer("next_billing_at"), // for monthly subs — next charge date (unix ms)
  cancelledAt: integer("cancelled_at"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertDataSubscriptionSchema = createInsertSchema(dataSubscriptions).omit({ id: true, createdAt: true });
export type InsertDataSubscription = z.infer<typeof insertDataSubscriptionSchema>;
export type DataSubscription = typeof dataSubscriptions.$inferSelect;

// ─── Admin Users ───────────────────────────────────────────────────────────────
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull().default("admin123"),
  // TOTP / MFA fields
  totpSecret: text("totp_secret"),          // base32 TOTP secret, null until MFA is set up
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  backupCodes: text("backup_codes"),        // JSON array of hashed single-use backup codes
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
