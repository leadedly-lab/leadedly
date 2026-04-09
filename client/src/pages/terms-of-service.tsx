import { LeadedlyLogo } from "@/components/logo";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

const EFFECTIVE_DATE = "April 9, 2026";
const COMPANY = "Leadedly LLC";
const EMAIL = "legal@leadedly.com";

export default function TermsOfService() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <LeadedlyLogo size={26} />
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10 pb-8 border-b border-border">
          <h1 className="text-3xl font-bold font-display text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mt-2">Effective Date: {EFFECTIVE_DATE}</p>
          <p className="text-muted-foreground text-sm">Last Updated: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-sm prose-invert max-w-none space-y-10">

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account on {COMPANY}'s platform ("Leadedly"), you ("Client") agree to be bound by these Terms of Service ("Agreement"). If you do not agree with any part of these terms, you must not create an account or use our services. This Agreement constitutes a legally binding contract between you and {COMPANY}.
            </p>
          </section>

          {/* 2. Service Description */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              Leadedly is a performance-based lead generation platform. We run digital advertising campaigns to generate qualified prospect leads and deliver them to clients through the Leadedly dashboard. Each client is assigned exclusive territories defined by geographic location and industry vertical. Leadedly does not guarantee any specific volume of leads, conversion rates, or business outcomes.
            </p>
          </section>

          {/* 3. Territory Deposits */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">3. Territory Deposits</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To activate a territory, the Client must fund a deposit account ("Deposit Balance") via ACH bank transfer through our payment processor (Plaid). Standard deposit amounts are:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>First territory: <span className="text-foreground font-medium">$2,000</span></li>
              <li>Each additional territory: <span className="text-foreground font-medium">$1,250</span></li>
              <li>Statewide territories and custom arrangements may have different deposit amounts as agreed in writing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Deposits are <span className="text-foreground font-medium">not payments for services</span> — they are working balances held on account. Fees are deducted from the Deposit Balance only when specific billable events occur as described in Section 5. Deposits are held by {COMPANY} and are not placed in escrow or interest-bearing accounts.
            </p>
          </section>

          {/* 4. Auto-Replenish */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">4. Auto-Replenish</h2>
            <p className="text-muted-foreground leading-relaxed">
              When a territory's Deposit Balance falls below <span className="text-foreground font-medium">$400</span>, Leadedly will automatically initiate an ACH transfer from the Client's linked bank account to replenish the balance. The replenish amount is configurable by the Client through the dashboard. Lead delivery will be <span className="text-foreground font-medium">paused</span> for any territory whose balance falls below $400 until the balance is replenished. By linking a bank account and enabling auto-replenish, the Client authorizes {COMPANY} to initiate ACH debits as described herein.
            </p>
          </section>

          {/* 5. Fees and Billing */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">5. Fees and Billing</h2>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5.1 Success Fee</h3>
            <p className="text-muted-foreground leading-relaxed">
              When a Client marks a lead as "Closed" in the dashboard, a success fee is automatically deducted from the territory's Deposit Balance. The success fee amount varies by industry and is displayed on the Client's dashboard at the time of territory activation. The default success fee is <span className="text-foreground font-medium">$250 per closed lead</span>, unless otherwise specified for the Client's industry vertical.
            </p>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5.2 Out-of-Compliance (OOC) Fee — 1-Hour Contact Requirement</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Client agrees to make first contact with each lead within <span className="text-foreground font-medium">sixty (60) minutes</span> of receipt. Contact must be logged in the dashboard by updating the lead's status (e.g., "Contacted," "No Answer," "Interested," or "Not Interested"). If a lead's status is not updated within 60 minutes of delivery, an out-of-compliance fee of <span className="text-foreground font-medium">$25 per lead</span> will be automatically deducted from the territory's Deposit Balance. This fee compensates {COMPANY} for the cost of acquiring the lead and the degradation in lead quality caused by delayed contact. Leads contacted within 1 hour are statistically 7x more likely to convert; delays harm the effectiveness of the entire platform.
            </p>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">5.3 Fee Deduction</h3>
            <p className="text-muted-foreground leading-relaxed">
              All fees are deducted directly from the Client's territory Deposit Balance. If the balance is insufficient to cover a fee, the fee will be deducted when the balance is next replenished. {COMPANY} reserves the right to pause lead delivery to territories with negative or insufficient balances.
            </p>
          </section>

          {/* 6. Refund Policy */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">6. Refund Policy</h2>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">6.1 Deposit Refunds</h3>
            <p className="text-muted-foreground leading-relaxed">
              Clients may request a refund of their remaining Deposit Balance at any time by contacting {EMAIL}. Upon receiving a refund request, {COMPANY} will:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mt-2">
              <li>Deduct any outstanding fees (success fees, OOC fees, or other amounts owed)</li>
              <li>Process the refund of the remaining balance via ACH within <span className="text-foreground font-medium">10 business days</span></li>
              <li>Deactivate the associated territory(ies)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Fees that have already been charged (success fees and OOC fees) are <span className="text-foreground font-medium">non-refundable</span>.
            </p>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">6.2 Lead Quality Refunds</h3>
            <p className="text-muted-foreground leading-relaxed">
              {COMPANY} does not guarantee lead quality or conversion outcomes. However, if a Client believes a lead was delivered in error (e.g., incorrect contact information, duplicate, outside territory, or clearly fraudulent), the Client may submit a dispute within <span className="text-foreground font-medium">7 calendar days</span> of lead delivery. See Section 7 for dispute procedures.
            </p>
          </section>

          {/* 7. Disputes */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">7. Dispute Resolution</h2>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">7.1 Lead Disputes</h3>
            <p className="text-muted-foreground leading-relaxed">
              To dispute a lead or fee, the Client must email {EMAIL} within <span className="text-foreground font-medium">7 calendar days</span> of the charge, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mt-2">
              <li>The lead name and date received</li>
              <li>A clear description of the issue</li>
              <li>Any supporting evidence (e.g., screenshots, call logs, bounce-back emails)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              {COMPANY} will review the dispute and respond within <span className="text-foreground font-medium">5 business days</span>. At its sole discretion, {COMPANY} may issue a credit to the Client's Deposit Balance. Credits are applied to the territory balance and are not refundable as cash.
            </p>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">7.2 OOC Fee Disputes</h3>
            <p className="text-muted-foreground leading-relaxed">
              If a Client believes an OOC fee was incorrectly applied (e.g., due to system error or extenuating circumstances), they may submit a dispute following the same process above. {COMPANY} may waive the fee at its sole discretion. Disputes filed more than 7 days after the charge are not eligible for review.
            </p>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">7.3 Binding Arbitration</h3>
            <p className="text-muted-foreground leading-relaxed">
              Any dispute not resolved through the process above shall be settled by binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the state of {COMPANY}'s principal place of business. Each party shall bear its own costs. The Client waives the right to participate in a class action lawsuit or class-wide arbitration.
            </p>
          </section>

          {/* 8. ACH Authorization */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">8. ACH Debit Authorization</h2>
            <p className="text-muted-foreground leading-relaxed">
              By linking a bank account through Plaid and funding a territory deposit, the Client authorizes {COMPANY} and its payment processor to initiate ACH debit entries from the linked account for the purposes of: (a) initial territory deposits, (b) auto-replenish transactions, and (c) any manually initiated deposits. This authorization remains in effect until the Client unlinks their bank account through the dashboard or provides written notice of revocation to {EMAIL}. ACH transactions typically settle within 1–3 business days.
            </p>
          </section>

          {/* 9. Account Suspension & Termination */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">9. Account Suspension and Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              {COMPANY} reserves the right to suspend or terminate a Client's account for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Repeated failure to contact leads within the 1-hour window</li>
              <li>Insufficient Deposit Balance for an extended period</li>
              <li>Violation of these Terms of Service</li>
              <li>Abusive, fraudulent, or dishonest conduct</li>
              <li>Chargebacks or ACH reversals initiated without first following the dispute process</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              The Client may terminate their account at any time by contacting {EMAIL}. Upon termination, any remaining Deposit Balance will be refunded per Section 6.1. Territories are non-transferable.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO THE USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF REVENUE, LOST PROFITS, LOSS OF BUSINESS, OR DATA LOSS. {COMPANY}'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT OF THE CLIENT'S CURRENT DEPOSIT BALANCE AT THE TIME OF THE CLAIM. THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
          </section>

          {/* 11. Intellectual Property */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">11. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, branding, software, and data on the Leadedly platform are the property of {COMPANY}. Leads delivered through the platform are licensed for the Client's business use only and may not be resold, redistributed, or shared with third parties. The Client retains ownership of their own business data and client relationships developed from leads.
            </p>
          </section>

          {/* 12. Confidentiality */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">12. Confidentiality</h2>
            <p className="text-muted-foreground leading-relaxed">
              Both parties agree to keep confidential any proprietary information shared during the course of this Agreement, including but not limited to pricing terms, business strategies, lead data, and platform features. This obligation survives termination of the Agreement.
            </p>
          </section>

          {/* 13. Modifications */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">13. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              {COMPANY} reserves the right to modify these Terms at any time. Clients will be notified of material changes via email. Continued use of the platform after notification constitutes acceptance of the revised terms. If the Client does not agree with the changes, they may terminate their account per Section 9.
            </p>
          </section>

          {/* 14. Governing Law */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">14. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Agreement shall be governed by and construed in accordance with the laws of the State in which {COMPANY} is incorporated, without regard to conflict of law principles.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, disputes, or refund requests, contact us at:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium">{COMPANY}</p>
              <p className="text-sm text-muted-foreground">Email: {EMAIL}</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
