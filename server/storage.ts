import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import {
  industries, clients, territories, leads, depositTransactions, adminUsers,
  plaidItems, plaidTransfers, stripeDeposits, dataProducts, dataSubscriptions,
  type Industry, type InsertIndustry,
  type Client, type InsertClient,
  type Territory, type InsertTerritory,
  type Lead, type InsertLead,
  type DepositTransaction, type InsertDepositTransaction,
  type AdminUser, type InsertAdminUser,
  type PlaidItem, type InsertPlaidItem,
  type PlaidTransfer, type InsertPlaidTransfer,
  type StripeDeposit, type InsertStripeDeposit,
  type DataProduct, type InsertDataProduct,
  type DataSubscription, type InsertDataSubscription,
} from "@shared/schema";

// In production on Render, DATABASE_PATH points to the persistent disk.
// In dev it falls back to the local leadedly.db file.
const DB_PATH = process.env.DATABASE_PATH || "leadedly.db";
export const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS industries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    success_fee REAL NOT NULL DEFAULT 250,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    industry_id INTEGER NOT NULL,
    team_size TEXT NOT NULL,
    cities_served INTEGER NOT NULL DEFAULT 1,
    monthly_lead_spend TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    password_hash TEXT NOT NULL DEFAULT 'demo123',
    role TEXT NOT NULL DEFAULT 'client',
    email_verified INTEGER NOT NULL DEFAULT 0,
    otp_code TEXT,
    otp_expires_at INTEGER,
    otp_verified INTEGER NOT NULL DEFAULT 0,
    otp_attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS territories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    industry_id INTEGER NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    excluded_cities TEXT,
    deposit_amount REAL NOT NULL DEFAULT 2000,
    deposit_balance REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    monthly_ad_spend REAL NOT NULL DEFAULT 0,
    monthly_leads_generated INTEGER NOT NULL DEFAULT 0,
    monthly_lead_revenue REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    territory_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    investable_assets TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT NOT NULL DEFAULT '',
    received_at INTEGER NOT NULL,
    first_contact_at INTEGER,
    ooc_fee_charged INTEGER NOT NULL DEFAULT 0,
    ooc_fee_amount REAL NOT NULL DEFAULT 0,
    closed_at INTEGER,
    success_fee_charged REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS deposit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    territory_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    lead_id INTEGER,
    created_at INTEGER NOT NULL,
    confirmed_by TEXT
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT 'admin123',
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    backup_codes TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plaid_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL DEFAULT 'Checking',
    account_mask TEXT NOT NULL DEFAULT '',
    institution_name TEXT NOT NULL DEFAULT '',
    auto_replenish_enabled INTEGER NOT NULL DEFAULT 1,
    replenish_amount REAL NOT NULL DEFAULT 1000,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plaid_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    territory_id INTEGER NOT NULL,
    transfer_id TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    type TEXT NOT NULL DEFAULT 'debit',
    description TEXT NOT NULL DEFAULT '',
    is_auto_replenish INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS stripe_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    territory_id INTEGER NOT NULL,
    payment_intent_id TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT NOT NULL DEFAULT '',
    is_auto_replenish INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS data_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    record_count INTEGER NOT NULL,
    one_time_price REAL NOT NULL,
    monthly_price REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS data_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    amount REAL NOT NULL,
    next_billing_at INTEGER,
    cancelled_at INTEGER,
    created_at INTEGER NOT NULL
  );
`);

// Migrate existing DB: add columns if they don't exist yet
for (const col of [
  "ALTER TABLE admin_users ADD COLUMN totp_secret TEXT",
  "ALTER TABLE admin_users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE admin_users ADD COLUMN backup_codes TEXT",
  "ALTER TABLE clients ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE clients ADD COLUMN otp_code TEXT",
  "ALTER TABLE clients ADD COLUMN otp_expires_at INTEGER",
  "ALTER TABLE clients ADD COLUMN otp_verified INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE clients ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE clients ADD COLUMN google_sheet_url TEXT",
  "ALTER TABLE clients ADD COLUMN tos_agreed_at INTEGER",
  "ALTER TABLE territories ADD COLUMN population INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE territories ADD COLUMN excluded_cities TEXT",
  "ALTER TABLE clients ADD COLUMN stripe_customer_id TEXT",
  "ALTER TABLE clients ADD COLUMN stripe_financial_connection_id TEXT",
  "ALTER TABLE clients ADD COLUMN stripe_payment_method_id TEXT",
  "ALTER TABLE clients ADD COLUMN stripe_bank_name TEXT",
  "ALTER TABLE clients ADD COLUMN stripe_bank_last4 TEXT",
  "ALTER TABLE clients ADD COLUMN auto_replenish_enabled INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE clients ADD COLUMN replenish_amount REAL NOT NULL DEFAULT 1000",
]) {
  try { sqlite.exec(col); } catch (_) { /* column already exists */ }
}

// Update admin password
sqlite.prepare("UPDATE admin_users SET password_hash = ? WHERE email = ?").run("Thomarv45$!", "admin@leadedly.com");

// Seed default industries if empty
const existingIndustries = sqlite.prepare("SELECT COUNT(*) as cnt FROM industries").get() as { cnt: number };
if (existingIndustries.cnt === 0) {
  const defaults = [
    { name: "Wealth Management", icon: "TrendingUp", success_fee: 250 },
    { name: "Financial Planning", icon: "BarChart2", success_fee: 250 },
    { name: "Life Insurance", icon: "Shield", success_fee: 200 },
    { name: "Real Estate", icon: "Home", success_fee: 300 },
    { name: "Mortgage", icon: "Building2", success_fee: 275 },
    { name: "Accounting / CPA", icon: "Calculator", success_fee: 200 },
    { name: "Legal Services", icon: "Scale", success_fee: 300 },
    { name: "Health Insurance", icon: "Heart", success_fee: 200 },
    { name: "Solar Energy", icon: "Sun", success_fee: 350 },
    { name: "Home Services", icon: "Wrench", success_fee: 150 },
  ];
  for (const ind of defaults) {
    sqlite.prepare("INSERT INTO industries (name, icon, success_fee, active) VALUES (?, ?, ?, 1)").run(ind.name, ind.icon, ind.success_fee);
  }
}

// Seed admin user if empty
const existingAdmins = sqlite.prepare("SELECT COUNT(*) as cnt FROM admin_users").get() as { cnt: number };
if (existingAdmins.cnt === 0) {
  sqlite.prepare("INSERT INTO admin_users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)").run("admin@leadedly.com", "Admin", "Thomarv45$!", Date.now());
}

export interface IStorage {
  // Industries
  getIndustries(): Industry[];
  getIndustry(id: number): Industry | undefined;
  createIndustry(data: InsertIndustry): Industry;
  updateIndustry(id: number, data: Partial<InsertIndustry>): Industry | undefined;
  deleteIndustry(id: number): void;

  // Clients
  getClients(): Client[];
  getClient(id: number): Client | undefined;
  getClientByEmail(email: string): Client | undefined;
  createClient(data: InsertClient): Client;
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined;
  deleteClient(id: number): void;

  // Territories
  getTerritories(): Territory[];
  getTerritoriesByClient(clientId: number): Territory[];
  getTerritory(id: number): Territory | undefined;
  createTerritory(data: InsertTerritory): Territory;
  updateTerritory(id: number, data: Partial<InsertTerritory>): Territory | undefined;
  deleteTerritory(id: number): void;

  // Leads
  getLeads(): Lead[];
  getLeadsByClient(clientId: number): Lead[];
  getLead(id: number): Lead | undefined;
  createLead(data: InsertLead): Lead;
  updateLead(id: number, data: Partial<InsertLead>): Lead | undefined;

  // Deposit Transactions
  getDepositTransactions(): DepositTransaction[];
  getDepositTransactionsByClient(clientId: number): DepositTransaction[];
  getDepositTransactionsByTerritory(territoryId: number): DepositTransaction[];
  createDepositTransaction(data: InsertDepositTransaction): DepositTransaction;

  // Client email verification
  setClientEmailVerified(clientId: number): void;

  // Client OTP
  setClientOtp(clientId: number, otpCode: string, expiresAt: number): void;
  clearClientOtp(clientId: number): void;
  setClientOtpVerified(clientId: number, verified: boolean): void;
  incrementOtpAttempts(clientId: number): number;

  // Admin
  getAdminByEmail(email: string): AdminUser | undefined;
  getAdminById(id: number): AdminUser | undefined;
  updateAdminMfa(id: number, data: { totpSecret?: string | null; totpEnabled?: boolean; backupCodes?: string | null }): AdminUser | undefined;

  // Plaid Items
  getPlaidItem(clientId: number): PlaidItem | undefined;
  upsertPlaidItem(data: InsertPlaidItem): PlaidItem;
  updatePlaidItem(clientId: number, data: Partial<InsertPlaidItem>): PlaidItem | undefined;
  deletePlaidItem(clientId: number): void;

  // Plaid Transfers
  getPlaidTransfers(clientId: number): PlaidTransfer[];
  getPlaidTransfer(transferId: string): PlaidTransfer | undefined;
  createPlaidTransfer(data: InsertPlaidTransfer): PlaidTransfer;
  updatePlaidTransferStatus(transferId: string, status: string, settledAt?: number): PlaidTransfer | undefined;
  getAllPendingTransfers(): PlaidTransfer[];

  // Stripe Deposits
  getStripeDeposits(clientId: number): StripeDeposit[];
  getStripeDeposit(paymentIntentId: string): StripeDeposit | undefined;
  createStripeDeposit(data: InsertStripeDeposit): StripeDeposit;
  updateStripeDepositStatus(paymentIntentId: string, status: string, settledAt?: number): StripeDeposit | undefined;
  getAllStripeDeposits(): StripeDeposit[];

  // Data Products
  getDataProducts(): DataProduct[];
  getDataProduct(id: number): DataProduct | undefined;
  createDataProduct(data: InsertDataProduct): DataProduct;
  updateDataProduct(id: number, data: Partial<InsertDataProduct>): DataProduct | undefined;
  deleteDataProduct(id: number): void;

  // Data Subscriptions
  getDataSubscriptions(): DataSubscription[];
  getDataSubscriptionsByClient(clientId: number): DataSubscription[];
  createDataSubscription(data: InsertDataSubscription): DataSubscription;
  updateDataSubscription(id: number, data: Partial<InsertDataSubscription>): DataSubscription | undefined;
}

export class SQLiteStorage implements IStorage {
  getIndustries() {
    return db.select().from(industries).all();
  }
  getIndustry(id: number) {
    return db.select().from(industries).where(eq(industries.id, id)).get();
  }
  createIndustry(data: InsertIndustry) {
    return db.insert(industries).values(data).returning().get();
  }
  updateIndustry(id: number, data: Partial<InsertIndustry>) {
    return db.update(industries).set(data).where(eq(industries.id, id)).returning().get();
  }
  deleteIndustry(id: number) {
    db.delete(industries).where(eq(industries.id, id)).run();
  }

  getClients() {
    return db.select().from(clients).all();
  }
  getClient(id: number) {
    return db.select().from(clients).where(eq(clients.id, id)).get();
  }
  getClientByEmail(email: string) {
    return db.select().from(clients).where(eq(clients.email, email)).get();
  }
  createClient(data: InsertClient) {
    const now = Date.now();
    return db.insert(clients).values({ ...data, createdAt: now }).returning().get();
  }
  updateClient(id: number, data: Partial<InsertClient>) {
    return db.update(clients).set(data).where(eq(clients.id, id)).returning().get();
  }
  deleteClient(id: number) {
    db.delete(dataSubscriptions).where(eq(dataSubscriptions.clientId, id)).run();
    db.delete(stripeDeposits).where(eq(stripeDeposits.clientId, id)).run();
    db.delete(plaidTransfers).where(eq(plaidTransfers.clientId, id)).run();
    db.delete(plaidItems).where(eq(plaidItems.clientId, id)).run();
    db.delete(leads).where(eq(leads.clientId, id)).run();
    db.delete(depositTransactions).where(eq(depositTransactions.clientId, id)).run();
    db.delete(territories).where(eq(territories.clientId, id)).run();
    db.delete(clients).where(eq(clients.id, id)).run();
  }

  getTerritories() {
    return db.select().from(territories).all();
  }
  getTerritoriesByClient(clientId: number) {
    return db.select().from(territories).where(eq(territories.clientId, clientId)).all();
  }
  getTerritory(id: number) {
    return db.select().from(territories).where(eq(territories.id, id)).get();
  }
  createTerritory(data: InsertTerritory) {
    const now = Date.now();
    return db.insert(territories).values({ ...data, createdAt: now }).returning().get();
  }
  updateTerritory(id: number, data: Partial<InsertTerritory>) {
    return db.update(territories).set(data).where(eq(territories.id, id)).returning().get();
  }
  deleteTerritory(id: number) {
    db.delete(leads).where(eq(leads.territoryId, id)).run();
    db.delete(depositTransactions).where(eq(depositTransactions.territoryId, id)).run();
    db.delete(territories).where(eq(territories.id, id)).run();
  }

  getLeads() {
    return db.select().from(leads).orderBy(desc(leads.createdAt)).all();
  }
  getLeadsByClient(clientId: number) {
    return db.select().from(leads).where(eq(leads.clientId, clientId)).orderBy(desc(leads.receivedAt)).all();
  }
  getLead(id: number) {
    return db.select().from(leads).where(eq(leads.id, id)).get();
  }
  createLead(data: InsertLead) {
    const now = Date.now();
    return db.insert(leads).values({ ...data, receivedAt: now, createdAt: now }).returning().get();
  }
  updateLead(id: number, data: Partial<InsertLead>) {
    return db.update(leads).set(data).where(eq(leads.id, id)).returning().get();
  }

  getDepositTransactions() {
    return db.select().from(depositTransactions).orderBy(desc(depositTransactions.createdAt)).all();
  }
  getDepositTransactionsByClient(clientId: number) {
    return db.select().from(depositTransactions).where(eq(depositTransactions.clientId, clientId)).orderBy(desc(depositTransactions.createdAt)).all();
  }
  getDepositTransactionsByTerritory(territoryId: number) {
    return db.select().from(depositTransactions).where(eq(depositTransactions.territoryId, territoryId)).orderBy(desc(depositTransactions.createdAt)).all();
  }
  createDepositTransaction(data: InsertDepositTransaction) {
    const now = Date.now();
    return db.insert(depositTransactions).values({ ...data, createdAt: now }).returning().get();
  }

  setClientEmailVerified(clientId: number) {
    sqlite.prepare("UPDATE clients SET email_verified=1 WHERE id=?").run(clientId);
  }

  setClientOtp(clientId: number, otpCode: string, expiresAt: number) {
    sqlite.prepare(
      "UPDATE clients SET otp_code=?, otp_expires_at=?, otp_verified=0, otp_attempts=0 WHERE id=?"
    ).run(otpCode, expiresAt, clientId);
  }
  clearClientOtp(clientId: number) {
    sqlite.prepare(
      "UPDATE clients SET otp_code=NULL, otp_expires_at=NULL, otp_verified=0, otp_attempts=0 WHERE id=?"
    ).run(clientId);
  }
  setClientOtpVerified(clientId: number, verified: boolean) {
    sqlite.prepare("UPDATE clients SET otp_verified=? WHERE id=?").run(verified ? 1 : 0, clientId);
  }
  incrementOtpAttempts(clientId: number): number {
    const row = sqlite.prepare("SELECT otp_attempts FROM clients WHERE id=?").get(clientId) as any;
    const attempts = ((row?.otp_attempts ?? 0) as number) + 1;
    sqlite.prepare("UPDATE clients SET otp_attempts=? WHERE id=?").run(attempts, clientId);
    return attempts;
  }

  getAdminByEmail(email: string) {
    return db.select().from(adminUsers).where(eq(adminUsers.email, email)).get();
  }
  getAdminById(id: number) {
    return db.select().from(adminUsers).where(eq(adminUsers.id, id)).get();
  }
  updateAdminMfa(id: number, data: { totpSecret?: string | null; totpEnabled?: boolean; backupCodes?: string | null }) {
    return db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning().get();
  }

  getPlaidItem(clientId: number) {
    return db.select().from(plaidItems).where(eq(plaidItems.clientId, clientId)).get();
  }
  upsertPlaidItem(data: InsertPlaidItem) {
    // Delete existing if present, then insert fresh
    db.delete(plaidItems).where(eq(plaidItems.clientId, data.clientId)).run();
    const now = Date.now();
    return db.insert(plaidItems).values({ ...data, createdAt: now }).returning().get();
  }
  updatePlaidItem(clientId: number, data: Partial<InsertPlaidItem>) {
    return db.update(plaidItems).set(data).where(eq(plaidItems.clientId, clientId)).returning().get();
  }
  deletePlaidItem(clientId: number) {
    db.delete(plaidItems).where(eq(plaidItems.clientId, clientId)).run();
  }

  getPlaidTransfers(clientId: number) {
    return db.select().from(plaidTransfers).where(eq(plaidTransfers.clientId, clientId)).orderBy(desc(plaidTransfers.createdAt)).all();
  }
  getPlaidTransfer(transferId: string) {
    return db.select().from(plaidTransfers).where(eq(plaidTransfers.transferId, transferId)).get();
  }
  createPlaidTransfer(data: InsertPlaidTransfer) {
    const now = Date.now();
    return db.insert(plaidTransfers).values({ ...data, createdAt: now }).returning().get();
  }
  updatePlaidTransferStatus(transferId: string, status: string, settledAt?: number) {
    const updates: any = { status };
    if (settledAt) updates.settledAt = settledAt;
    return db.update(plaidTransfers).set(updates).where(eq(plaidTransfers.transferId, transferId)).returning().get();
  }
  getAllPendingTransfers() {
    return db.select().from(plaidTransfers).where(eq(plaidTransfers.status, "pending")).all();
  }

  // Stripe Deposits
  getStripeDeposits(clientId: number) {
    return db.select().from(stripeDeposits).where(eq(stripeDeposits.clientId, clientId)).orderBy(desc(stripeDeposits.createdAt)).all();
  }
  getStripeDeposit(paymentIntentId: string) {
    return db.select().from(stripeDeposits).where(eq(stripeDeposits.paymentIntentId, paymentIntentId)).get();
  }
  createStripeDeposit(data: InsertStripeDeposit) {
    const now = Date.now();
    return db.insert(stripeDeposits).values({ ...data, createdAt: now }).returning().get();
  }
  updateStripeDepositStatus(paymentIntentId: string, status: string, settledAt?: number) {
    const updates: any = { status };
    if (settledAt) updates.settledAt = settledAt;
    return db.update(stripeDeposits).set(updates).where(eq(stripeDeposits.paymentIntentId, paymentIntentId)).returning().get();
  }
  getAllStripeDeposits() {
    return db.select().from(stripeDeposits).orderBy(desc(stripeDeposits.createdAt)).all();
  }

  // Data Products
  getDataProducts() {
    return db.select().from(dataProducts).orderBy(desc(dataProducts.createdAt)).all();
  }
  getDataProduct(id: number) {
    return db.select().from(dataProducts).where(eq(dataProducts.id, id)).get();
  }
  createDataProduct(data: InsertDataProduct) {
    return db.insert(dataProducts).values({ ...data, createdAt: Date.now() }).returning().get();
  }
  updateDataProduct(id: number, data: Partial<InsertDataProduct>) {
    return db.update(dataProducts).set(data).where(eq(dataProducts.id, id)).returning().get();
  }
  deleteDataProduct(id: number) {
    db.delete(dataProducts).where(eq(dataProducts.id, id)).run();
  }

  // Data Subscriptions
  getDataSubscriptions() {
    return db.select().from(dataSubscriptions).orderBy(desc(dataSubscriptions.createdAt)).all();
  }
  getDataSubscriptionsByClient(clientId: number) {
    return db.select().from(dataSubscriptions).where(eq(dataSubscriptions.clientId, clientId)).orderBy(desc(dataSubscriptions.createdAt)).all();
  }
  createDataSubscription(data: InsertDataSubscription) {
    return db.insert(dataSubscriptions).values({ ...data, createdAt: Date.now() }).returning().get();
  }
  updateDataSubscription(id: number, data: Partial<InsertDataSubscription>) {
    return db.update(dataSubscriptions).set(data).where(eq(dataSubscriptions.id, id)).returning().get();
  }
}

export const storage = new SQLiteStorage();
