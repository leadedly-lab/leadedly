import { LeadedlyLogo } from "@/components/logo";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

const EFFECTIVE_DATE = "April 6, 2026";
const COMPANY = "Leadedly LLC";
const EMAIL = "privacy@leadedly.com";
const WEBSITE = "https://leadedly.com";

export default function PrivacyPolicy() {
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
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Legal</p>
          <h1 className="text-3xl font-bold font-display text-foreground mb-3">Privacy Policy</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span><strong className="text-foreground">Effective Date:</strong> {EFFECTIVE_DATE}</span>
            <span><strong className="text-foreground">Last Updated:</strong> {EFFECTIVE_DATE}</span>
            <span><strong className="text-foreground">Company:</strong> {COMPANY}</span>
          </div>
        </div>

        <div className="prose-leadedly space-y-10 text-sm leading-relaxed text-foreground">

          {/* Intro */}
          <Section title="1. Introduction">
            <p>
              {COMPANY} ("Leadedly," "we," "us," or "our") operates a performance-based lead generation
              platform at <a href={WEBSITE} className="text-primary hover:underline">{WEBSITE}</a> (the "Platform").
              This Privacy Policy explains how we collect, use, disclose, and protect information about you
              when you use our Platform, including when you connect your bank account through our integration
              with Plaid Technologies, Inc. ("Plaid").
            </p>
            <p>
              By accessing or using the Platform, you agree to this Privacy Policy. If you do not agree,
              please do not use the Platform.
            </p>
          </Section>

          {/* Who we are */}
          <Section title="2. Who We Are">
            <p>
              Leadedly LLC is the data controller for information collected through the Platform. We provide
              lead generation services to licensed financial professionals, insurance agents, real estate
              professionals, and other service providers. Our clients ("Clients") pay performance-based fees
              and maintain deposit accounts to fund those fees.
            </p>
          </Section>

          {/* Information we collect */}
          <Section title="3. Information We Collect">
            <SubSection title="3.1 Information You Provide Directly">
              <ul>
                <li><strong>Account Registration:</strong> First and last name, email address, phone number, company name, job title, and industry.</li>
                <li><strong>Business Information:</strong> Team size, cities served, and estimated monthly lead spend.</li>
                <li><strong>Authentication Credentials:</strong> Password (stored as a hash) and multi-factor authentication data.</li>
                <li><strong>Communications:</strong> Any messages or support requests you send to us.</li>
              </ul>
            </SubSection>
            <SubSection title="3.2 Financial Information Collected via Plaid">
              <p>
                To fund your territory deposit account via ACH bank transfer, we use Plaid to securely
                connect to your bank account. When you authorize the Plaid Link connection:
              </p>
              <ul>
                <li>Plaid authenticates you directly with your financial institution. <strong>We never see, receive, or store your bank login credentials.</strong></li>
                <li>We receive and store a Plaid <em>access token</em> — a secure reference that allows us to initiate authorized ACH transfers on your behalf.</li>
                <li>We receive and display limited account metadata: institution name, account type (checking), and the last four digits of your account number ("account mask").</li>
                <li>We do <strong>not</strong> receive or store your full account number, routing number, or any transaction history beyond what is necessary to process your deposits.</li>
              </ul>
              <p>
                Your use of Plaid is also governed by{" "}
                <a href="https://plaid.com/legal/end-user-privacy-policy/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Plaid's End User Privacy Policy
                </a>.
              </p>
            </SubSection>
            <SubSection title="3.3 Transaction Data">
              <p>
                We maintain a record of all ACH deposit transactions, success fees, and out-of-contact (OOC)
                fees associated with your account. This includes amounts, dates, territory identifiers, and
                transaction descriptions.
              </p>
            </SubSection>
            <SubSection title="3.4 Lead Data">
              <p>
                As part of our service, we provide Clients with consumer lead information (names, contact
                details, and qualifying financial information about prospective customers). Clients are
                responsible for handling lead data in compliance with applicable law, including the
                Gramm-Leach-Bliley Act (GLBA) and relevant state privacy laws.
              </p>
            </SubSection>
            <SubSection title="3.5 Usage and Technical Data">
              <ul>
                <li>IP address, browser type, operating system, and device identifiers.</li>
                <li>Pages visited, features used, and timestamps of activity within the Platform.</li>
                <li>Authentication events (login attempts, MFA completions, session activity).</li>
              </ul>
            </SubSection>
          </Section>

          {/* How we use information */}
          <Section title="4. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Create and manage your account and authenticate your identity (including email OTP and TOTP-based MFA).</li>
              <li>Process ACH bank transfers to fund and maintain your territory deposit account.</li>
              <li>Calculate, deduct, and record success fees and OOC fees.</li>
              <li>Trigger automatic deposit replenishment when your balance falls below the required threshold.</li>
              <li>Deliver leads to your dashboard and track lead status.</li>
              <li>Send transactional communications: email OTP codes, deposit confirmations, low-balance alerts, and account notices.</li>
              <li>Detect and prevent fraud, unauthorized access, and security incidents.</li>
              <li>Comply with applicable law, including NACHA operating rules and financial services regulations.</li>
              <li>Improve the Platform's functionality and user experience.</li>
            </ul>
          </Section>

          {/* Legal basis */}
          <Section title="5. Legal Basis for Processing">
            <p>We process your personal information on the following legal bases:</p>
            <ul>
              <li><strong>Contract:</strong> Processing necessary to perform our services under the Client Agreement.</li>
              <li><strong>Legitimate Interests:</strong> Security monitoring, fraud prevention, and platform improvement.</li>
              <li><strong>Legal Obligation:</strong> Compliance with NACHA, GLBA, applicable tax law, and financial regulations.</li>
              <li><strong>Consent:</strong> Where we request your explicit consent (e.g., Plaid bank account authorization). You may withdraw consent at any time, which will disable ACH functionality.</li>
            </ul>
          </Section>

          {/* Sharing */}
          <Section title="6. How We Share Your Information">
            <p>We do not sell your personal information. We share information only in the following circumstances:</p>
            <SubSection title="6.1 Service Providers">
              <p>We share information with trusted third-party service providers who assist us in operating the Platform:</p>
              <ul>
                <li><strong>Plaid Technologies, Inc.:</strong> Bank account linking and ACH transfer initiation. Plaid is a NACHA preferred partner and maintains SOC 2 Type II certification. See <a href="https://plaid.com/legal/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Plaid's Legal &amp; Privacy</a>.</li>
                <li><strong>SendGrid (Twilio):</strong> Transactional email delivery (OTP codes, notifications).</li>
                <li><strong>Cloud Infrastructure Provider:</strong> Secure hosting of the Platform and its database.</li>
              </ul>
              <p>All service providers are contractually required to protect your information and use it only for the purpose of providing services to us.</p>
            </SubSection>
            <SubSection title="6.2 Legal Requirements">
              <p>
                We may disclose your information if required by law, court order, regulatory authority, or
                to protect the rights, property, or safety of Leadedly, our Clients, or others.
              </p>
            </SubSection>
            <SubSection title="6.3 Business Transfers">
              <p>
                In the event of a merger, acquisition, or sale of all or a portion of our assets, your
                information may be transferred as part of that transaction. We will notify you before your
                information becomes subject to a materially different privacy policy.
              </p>
            </SubSection>
          </Section>

          {/* Data retention */}
          <Section title="7. Data Retention">
            <p>
              We retain your personal information for as long as your account is active or as necessary to
              provide services, comply with legal obligations, resolve disputes, and enforce agreements.
            </p>
            <ul>
              <li><strong>Account data:</strong> Retained for the duration of the Client relationship and for 7 years thereafter (NACHA / financial recordkeeping requirements).</li>
              <li><strong>Transaction records:</strong> Retained for 7 years per financial recordkeeping regulations.</li>
              <li><strong>Authentication logs:</strong> Retained for 12 months for security monitoring.</li>
              <li><strong>Plaid access tokens:</strong> Deleted upon account closure or explicit revocation.</li>
              <li><strong>OTP codes:</strong> Automatically cleared after use or expiry (10-minute window).</li>
            </ul>
          </Section>

          {/* Security */}
          <Section title="8. Security">
            <p>
              We implement industry-standard technical and organizational measures to protect your information:
            </p>
            <ul>
              <li>All data transmitted between your browser and our Platform uses TLS 1.2 or higher (HTTPS). HTTP connections are automatically redirected to HTTPS.</li>
              <li>Sensitive data including Plaid access tokens are encrypted at rest using AES-256.</li>
              <li>All admin accounts are protected by TOTP-based multi-factor authentication (MFA).</li>
              <li>All client accounts are required to complete email OTP verification each session before accessing bank account functionality or Plaid Link.</li>
              <li>Access to production systems is restricted to authorized personnel with MFA-enabled accounts.</li>
              <li>We conduct regular security reviews and patch management.</li>
            </ul>
            <p>
              While we take significant steps to protect your information, no method of transmission or
              storage is 100% secure. In the event of a security breach affecting your information, we will
              notify you and applicable regulators as required by law.
            </p>
          </Section>

          {/* Consumer rights */}
          <Section title="9. Your Rights and Choices">
            <SubSection title="9.1 Access and Correction">
              <p>
                You may access and update your account information at any time by logging into the Platform.
                To request a copy of all personal information we hold about you, contact us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
              </p>
            </SubSection>
            <SubSection title="9.2 Deletion">
              <p>
                You may request deletion of your account and personal information by contacting us. Note
                that we may retain certain information as required by law or for legitimate business purposes
                (e.g., transaction records required by financial regulations).
              </p>
            </SubSection>
            <SubSection title="9.3 Bank Account Authorization (Plaid)">
              <p>
                You may revoke Plaid bank account authorization at any time from the Bank Account page in
                your dashboard (click "Unlink"). Revoking authorization will disable ACH deposits and
                auto-replenishment. Existing transaction records will be retained per our retention policy.
              </p>
            </SubSection>
            <SubSection title="9.4 California Residents (CCPA)">
              <p>
                California residents have the right to know what personal information we collect and how
                it is used, request deletion of personal information, opt out of the sale of personal
                information (we do not sell personal information), and not be discriminated against for
                exercising these rights. To submit a CCPA request, contact{" "}
                <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
              </p>
            </SubSection>
            <SubSection title="9.5 Marketing Communications">
              <p>
                We do not send marketing emails. All emails sent by Leadedly are transactional in nature
                (OTP codes, account notifications, deposit confirmations).
              </p>
            </SubSection>
          </Section>

          {/* Plaid specific */}
          <Section title="10. Plaid-Specific Disclosures">
            <p>
              In connection with our use of Plaid to process ACH transactions, we specifically disclose:
            </p>
            <ul>
              <li>Plaid acts as our service provider for bank account linking and payment initiation. Plaid is not a data broker and does not sell your financial information.</li>
              <li>Your bank credentials (username and password) are entered directly into Plaid's secure interface and are never transmitted to or stored by Leadedly.</li>
              <li>ACH debits initiated through Plaid are governed by NACHA operating rules and will appear on your bank statement as debits from Leadedly LLC.</li>
              <li>Pre-authorized auto-replenishment debits will only occur if you have enabled that feature in your account settings and only up to the amount you have configured.</li>
              <li>You may revoke Plaid authorization and disable all ACH debits at any time through your account settings.</li>
            </ul>
          </Section>

          {/* Children */}
          <Section title="11. Children's Privacy">
            <p>
              The Platform is not intended for individuals under the age of 18. We do not knowingly collect
              personal information from minors. If we learn that we have collected personal information from
              a child under 18, we will delete it promptly.
            </p>
          </Section>

          {/* Changes */}
          <Section title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we will
              notify you by email or by displaying a prominent notice on the Platform before the changes
              take effect. Your continued use of the Platform after the effective date of any changes
              constitutes your acceptance of the updated policy.
            </p>
          </Section>

          {/* Contact */}
          <Section title="13. Contact Us">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <div className="mt-4 p-5 rounded-xl bg-muted/30 border border-border space-y-1">
              <p className="font-semibold text-foreground">{COMPANY}</p>
              <p>Privacy inquiries: <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a></p>
              <p>Website: <a href={WEBSITE} className="text-primary hover:underline">{WEBSITE}</a></p>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          <p>© 2026 {COMPANY}. All rights reserved.</p>
          <p className="mt-1">Effective {EFFECTIVE_DATE}</p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a:hover]:underline [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 [&_strong]:text-foreground [&_a]:text-primary [&_a:hover]:underline [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_p]:leading-relaxed">
        {children}
      </div>
    </div>
  );
}
