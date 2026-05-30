'use client';

import Link from 'next/link';
import { Radio, Shield, Lock, Eye, Database, Globe, Cookie, UserCheck, Mail, AlertCircle, RefreshCw, FileText, MessageSquare,Scale } from 'lucide-react';
import { PageShell } from '@/components/ui';

const EFFECTIVE_DATE = 'May 2025';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: 'introduction',
    icon: <Shield size={18} />,
    title: '1. Introduction',
    content: (
      <>
        <p>Switch6 Broadcast Studio (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our sports broadcast management platform (&ldquo;the Service&rdquo;).</p>
        <p className="mt-3">Please read this policy carefully. By creating an account or using the Service, you consent to the data practices described herein. If you do not agree, please discontinue use immediately.</p>
        <p className="mt-3 font-semibold text-[color:var(--text)]">This policy applies to all users: Broadcasters, Advertisers, and Administrators.</p>
      </>
    ),
  },
  {
    id: 'collection',
    icon: <Database size={18} />,
    title: '2. Information We Collect',
    content: (
      <>
        <p>We collect information you provide directly, information gathered automatically, and information from third parties:</p>
        
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
            <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1.5 flex items-center gap-2">
              <UserCheck size={14} className="text-[color:var(--green)]" />
              Information You Provide
            </div>
            <ul className="mt-2 space-y-1.5 list-none">
              {[
                'Account details: name, email, phone number, organisation name, and role selection.',
                'Profile information: profile picture, bio, preferences, and notification settings.',
                'Content uploads: advertisement creatives, team logos, match data, and broadcast overlays.',
                'Payment information: M-Pesa phone number and transaction references (we do not store card details).',
                'Communications: support requests, feedback, and correspondence with our team.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-[color:var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[6px]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
            <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1.5 flex items-center gap-2">
              <Eye size={14} className="text-[color:var(--blue)]" />
              Information Collected Automatically
            </div>
            <ul className="mt-2 space-y-1.5 list-none">
              {[
                'Usage data: feature interactions, match creation activity, ad campaign performance, and session duration.',
                'Device information: IP address, browser type, operating system, and device identifiers.',
                'Log data: timestamps, error reports, and audit trails for security and compliance.',
                'Location data: approximate location derived from IP for regional content and compliance.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-[color:var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--blue)] shrink-0 mt-[6px]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'usage',
    icon: <Globe size={18} />,
    title: '3. How We Use Your Information',
    content: (
      <>
        <p>We use your information to operate, improve, and secure the Service:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Provide and personalise the Service: enable role-based features, remember preferences, and deliver relevant content.',
            'Process transactions: manage subscriptions, advertisement purchases, and M-Pesa payment verification.',
            'Communicate with you: send service updates, security alerts, support responses, and marketing (with consent).',
            'Ensure security and compliance: detect fraud, enforce Terms, maintain audit logs, and meet legal obligations.',
            'Analyse and improve: understand usage patterns, test new features, and optimise platform performance.',
            'Support advertising: deliver and measure ad campaigns, provide analytics to Advertisers, and prevent ad fraud.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'legal-basis',
    icon: <Scale size={18} />,
    title: '4. Legal Basis for Processing (GDPR)',
    content: (
      <>
        <p>For users in jurisdictions with data protection laws (including GDPR), we process personal data based on:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              basis: 'Contractual necessity',
              desc: 'To fulfil our obligations under the Terms and provide the Service you requested.',
            },
            {
              basis: 'Legitimate interests',
              desc: 'For security, fraud prevention, platform improvement, and business operations.',
            },
            {
              basis: 'Consent',
              desc: 'For marketing communications and optional features; withdrawable at any time.',
            },
            {
              basis: 'Legal obligation',
              desc: 'To comply with Kenyan law, tax requirements, or regulatory requests.',
            },
          ].map(({ basis, desc }) => (
            <div key={basis} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
              <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1">{basis}</div>
              <p className="text-[12px] text-[color:var(--muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'sharing',
    icon: <Mail size={18} />,
    title: '5. Data Sharing and Disclosure',
    content: (
      <>
        <p>We do not sell your personal data. We may share information only in these circumstances:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Service providers: trusted third parties who assist with hosting, analytics, payment processing (M-Pesa), and customer support under strict confidentiality agreements.',
            'Business partners: Advertisers receive aggregated, anonymised campaign analytics; no personally identifiable information is shared without consent.',
            'Legal requirements: if required by law, court order, or government request in Kenya or applicable jurisdictions.',
            'Business transfers: in connection with a merger, acquisition, or sale of assets, with notice and continued protection of your data.',
            'With your consent: for any other purpose disclosed at the time of collection.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    icon: <FileText size={18} />,
    title: '6. Data Retention',
    content: (
      <>
        <p>We retain personal data only as long as necessary:</p>
        <div className="mt-4 space-y-3">
          {[
            {
              category: 'Account data',
              period: 'Until account deletion + 90 days (for recovery and legal compliance)',
            },
            {
              category: 'Transaction records',
              period: '7 years (to comply with Kenyan tax and financial regulations)',
            },
            {
              category: 'Audit logs',
              period: '24 months (for security monitoring and dispute resolution)',
            },
            {
              category: 'Advertisement creatives',
              period: 'Duration of campaign + 180 days (for performance reporting and reuse)',
            },
            {
              category: 'Usage analytics',
              period: 'Aggregated and anonymised indefinitely; raw logs deleted after 12 months',
            },
          ].map(({ category, period }) => (
            <div key={category} className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
              <span className="w-2 h-2 rounded-full bg-[color:var(--green)] shrink-0 mt-[6px]" />
              <div>
                <span className="text-[13px] font-medium text-[color:var(--text)]">{category}:</span>
                <span className="text-[13px] text-[color:var(--muted)] ml-1">{period}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-[color:var(--muted)]">You may request earlier deletion of non-essential data by contacting <a href="mailto:privacy@switch6.io" className="text-[color:var(--green)] no-underline hover:underline">privacy@switch6.io</a>.</p>
      </>
    ),
  },
  {
    id: 'rights',
    icon: <UserCheck size={18} />,
    title: '7. Your Rights and Choices',
    content: (
      <>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Access: request a copy of the personal data we hold about you.',
            'Correction: update inaccurate or incomplete information via Settings or by contacting us.',
            'Deletion: request erasure of your data, subject to legal retention obligations.',
            'Portability: receive your data in a structured, machine-readable format.',
            'Objection: opt out of marketing communications or certain processing activities.',
            'Restriction: limit how we use your data while a dispute about accuracy or lawfulness is resolved.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--blue)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">To exercise these rights, contact <a href="mailto:privacy@switch6.io" className="text-[color:var(--green)] no-underline hover:underline">privacy@switch6.io</a>. We respond within 30 days and may verify your identity before fulfilling requests.</p>
      </>
    ),
  },
  {
    id: 'security',
    icon: <Lock size={18} />,
    title: '8. Data Security',
    content: (
      <>
        <p>We implement technical and organisational measures to protect your data:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Encryption: data in transit (TLS 1.3+) and at rest (AES-256).',
            'Access controls: role-based permissions, multi-factor authentication for Admins, and principle of least privilege.',
            'Secure payments: M-Pesa STK Push handled via licensed payment rails; Switch6 never stores raw credentials.',
            'Audit trails: immutable logs for sensitive actions including Admin impersonation.',
            'Regular testing: vulnerability scans, penetration tests, and security reviews.',
            'Staff training: confidentiality agreements and data protection training for all team members.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-[color:var(--muted)])">No system is 100% secure. If you suspect unauthorised access, notify us immediately at <a href="mailto:security@switch6.io" className="text-[color:var(--red)] no-underline hover:underline">security@switch6.io</a>.</p>
      </>
    ),
  },
  {
    id: 'international',
    icon: <Globe size={18} />,
    title: '9. International Data Transfers',
    content: (
      <>
        <p>Switch6 is headquartered in Kenya. Your information may be transferred to and processed in countries other than your own, including jurisdictions with different data protection standards.</p>
        <p className="mt-3">When we transfer data internationally, we ensure appropriate safeguards are in place, such as:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Standard contractual clauses approved by relevant data protection authorities.',
            'Reliance on adequacy decisions where applicable.',
            'Explicit consent for specific transfers where required.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    icon: <Cookie size={18} />,
    title: '10. Cookies and Tracking',
    content: (
      <>
        <p>We use cookies and similar technologies to enhance your experience:</p>
        <div className="mt-4 space-y-3">
          {[
            {
              type: 'Essential',
              purpose: 'Enable core functionality like authentication, security, and session management. Cannot be disabled.',
            },
            {
              type: 'Analytics',
              purpose: 'Understand how users interact with the Service to improve performance and features. Managed via cookie consent.',
            },
            {
              type: 'Functional',
              purpose: 'Remember preferences (language, theme, notifications) for a personalised experience.',
            },
            {
              type: 'Advertising',
              purpose: 'Measure ad campaign performance and prevent fraud. Used only for Advertiser accounts with consent.',
            },
          ].map(({ type, purpose }) => (
            <div key={type} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
              <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1">{type} Cookies</div>
              <p className="text-[12px] text-[color:var(--muted)]">{purpose}</p>
            </div>
          ))}
        </div>
        <p className="mt-3">Manage cookie preferences via the banner on first visit or in Settings → Privacy. Note: disabling essential cookies may limit Service functionality.</p>
      </>
    ),
  },
  {
    id: 'children',
    icon: <AlertCircle size={18} />,
    title: '11. Children\'s Privacy',
    content: (
      <>
        <p>The Service is intended for users aged 18 and over. We do not knowingly collect personal data from children under 18.</p>
        <p className="mt-3">If you believe a minor has provided us with personal data, please contact <a href="mailto:privacy@switch6.io" className="text-[color:var(--green)] no-underline hover:underline">privacy@switch6.io</a> immediately. We will take steps to delete such information promptly.</p>
      </>
    ),
  },
  {
    id: 'changes',
    icon: <RefreshCw size={18} />,
    title: '12. Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy to reflect changes in our practices or legal requirements. When we make material changes:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'We will notify you via email or in-app notification at least 14 days before the effective date.',
            'We will post the updated policy on this page with a revised &ldquo;Effective Date&rdquo;.',
            'We may request explicit consent for significant changes affecting your rights.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--blue)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">Your continued use of the Service after the effective date constitutes acceptance of the updated policy. If you disagree, please discontinue use and delete your account.</p>
      </>
    ),
  },
  {
    id: 'contact',
    icon: <MessageSquare size={18} />,
    title: '13. Contact Us',
    content: (
      <>
        <p>For questions, requests, or concerns about this Privacy Policy or our data practices:</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: 'General Privacy', email: 'privacy@switch6.io', desc: 'Data rights, policy questions, consent management' },
            { label: 'Security Issues',  email: 'security@switch6.io', desc: 'Suspected breaches, vulnerability reports' },
            { label: 'Legal Compliance', email: 'legal@switch6.io', desc: 'GDPR, data processing agreements, legal requests' },
            { label: 'Data Deletion',   email: 'privacy@switch6.io', desc: 'Account deletion, data erasure requests' },
          ].map(({ label, email, desc }) => (
            <div key={label} className="flex flex-col gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{label}</span>
                <Shield size={12} className="text-[color:var(--green)]" />
              </div>
              <a href={`mailto:${email}`} className="text-[13px] font-medium text-[color:var(--green)] no-underline hover:underline">{email}</a>
              <span className="text-[11px] text-[color:var(--muted)]">{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
          <p className="text-[12px] text-[color:var(--muted)]">
            <strong className="text-[color:var(--text)]">Response times:</strong> General enquiries within 3 business days; urgent security matters within 24 hours.
            For users in the EU/UK, you also have the right to lodge a complaint with your local data protection authority.
          </p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PageShell title="Privacy Policy">
      <div className="fluid-pad pb-12">
        <div className="mx-auto max-w-[800px] flex flex-col gap-5">

          {/* Hero */}
          <div className="broadcast-card relative overflow-hidden rounded-lg p-5">
            <div className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(135deg,rgba(26,95,212,.06) 0%,transparent 55%),radial-gradient(circle at 80% 20%,rgba(10,143,82,.06) 0%,transparent 45%)' }} />
            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="grid place-items-center rounded-lg w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600">
                    <Radio size={16} color="#fff" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[.04em] text-[color:var(--muted)]">Switch6 Broadcast Studio</span>
                </div>
                <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[30px]">Privacy Policy</h1>
                <p className="mt-1 text-[13px] text-[color:var(--muted)]">Effective date: {EFFECTIVE_DATE}</p>
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-blue-500/30 bg-blue-500/10 text-[color:var(--blue)]">
                  <Lock size={12} /> Your data, protected
                </span>
                <span className="text-[11px] text-[color:var(--muted)]">{sections.length} sections</span>
              </div>
            </div>
          </div>

          {/* Summary box */}
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-[color:var(--text)] mb-2">Quick summary (not a substitute for reading the full policy):</p>
            <ul className="space-y-1.5">
              {[
                'We collect account, usage, and payment data to provide and improve the Service.',
                'Your data is used for service delivery, security, analytics, and communication—with your consent where required.',
                'We do not sell personal data. Sharing occurs only with service providers, for legal compliance, or with your permission.',
                'You have rights to access, correct, delete, or port your data. Contact privacy@switch6.io to exercise them.',
                'Data is encrypted, access-controlled, and retained only as long as necessary.',
                'This policy may change; we will notify you of material updates in advance.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-[color:var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[6px]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Table of contents */}
          <div className="hidden sm:block broadcast-card rounded-lg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)] mb-3">Contents</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 lg:grid-cols-3">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className="text-[12px] text-[color:var(--muted)] no-underline hover:text-[color:var(--green)] transition-colors truncate py-0.5">
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="broadcast-card rounded-lg p-4 sm:p-5 scroll-mt-20">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-[color:var(--blue)] shrink-0">
                    {s.icon}
                  </span>
                  <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[color:var(--text)] sm:text-[15px]">{s.title}</h2>
                </div>
                <div className="text-[13px] leading-relaxed text-[color:var(--muted)]">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] px-4 py-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[12px] text-[color:var(--muted)]">
              Switch6 Broadcast Studio · Privacy Policy effective {EFFECTIVE_DATE}
            </span>
            <div className="flex gap-3">
              <Link href="/terms" className="text-[12px] text-[color:var(--muted)] no-underline hover:text-[color:var(--text)]">Terms of Service</Link>
              <Link href="/register" className="text-[12px] text-[color:var(--green)] no-underline hover:underline font-medium">Create account</Link>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}