'use client';

import Link from 'next/link';
import { Radio, Scale, ShieldCheck, Lock, Eye,
   AlertTriangle, Ban, RefreshCw, CreditCard, 
   Globe, MessageSquare, FileText } from 'lucide-react';
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
    id: 'acceptance',
    icon: <Scale size={18} />,
    title: '1. Acceptance of Terms',
    content: (
      <>
        <p>By creating an account, accessing, or using the Switch6 Broadcast Studio platform (&ldquo;the Service&rdquo;), you confirm that you have read, understood, and agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).</p>
        <p className="mt-3">If you are using the Service on behalf of an organisation (a club, broadcaster, or media company), you represent that you have authority to bind that organisation to these Terms. In that case, &ldquo;you&rdquo; refers to both you individually and the organisation.</p>
        <p className="mt-3 font-semibold text-[color:var(--text)]">If you do not agree to these Terms, you must not register or use the Service.</p>
      </>
    ),
  },
  {
    id: 'service',
    icon: <Globe size={18} />,
    title: '2. Description of Service',
    content: (
      <>
        <p>Switch6 is a professional sports broadcast management platform that provides tools for:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            ['Broadcasters', 'Match creation, squad management, lineup building, live stream status monitoring, and overlay control.'],
            ['Advertisers', 'Upload and schedule video or image advertisement creatives, select broadcast slots, manage campaigns, and view analytics.'],
            ['Administrators', 'Full platform oversight including user management, subscription billing, revenue reporting, audit logs, and system health monitoring.'],
          ].map(([role, desc]) => (
            <li key={role} className="flex gap-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[7px]" />
              <span><strong className="text-[color:var(--text)]">{role}:</strong> {desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">The Service is provided as a Software-as-a-Service (SaaS) platform. We reserve the right to modify, enhance, or discontinue features at any time with reasonable notice where practicable.</p>
      </>
    ),
  },
  {
    id: 'accounts',
    icon: <ShieldCheck size={18} />,
    title: '3. Accounts and Eligibility',
    content: (
      <>
        <p>To use the Service you must:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Be at least 18 years of age, or the age of legal majority in your jurisdiction.',
            'Provide accurate, complete, and current registration information.',
            'Maintain the security of your password and immediately notify us of any unauthorised access.',
            'Not share login credentials with any other person.',
            'Not create more than one account without prior written consent from Switch6.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">You are solely responsible for all activity that occurs under your account. Switch6 is not liable for any loss arising from unauthorised account use.</p>
      </>
    ),
  },
  {
    id: 'roles',
    icon: <FileText size={18} />,
    title: '4. User Roles and Permissions',
    content: (
      <>
        <p>The Service operates a three-tier role model. Each role carries distinct capabilities and responsibilities:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              role: 'Broadcaster',
              color: 'var(--green)',
              items: ['Create and manage matches', 'Build squad lineups', 'Monitor stream status', 'Access advertisement support tools'],
            },
            {
              role: 'Advertiser',
              color: 'var(--gold)',
              items: ['Upload ad creatives (video/image)', 'Select match slots and positions', 'Make payments via M-Pesa', 'View campaign impressions and reach'],
            },
            {
              role: 'Admin',
              color: 'var(--blue)',
              items: ['Manage all users and subscriptions', 'Access revenue and audit data', 'Impersonate users for support', 'Configure system settings'],
            },
          ].map(({ role, color, items }) => (
            <div key={role} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
              <div className="text-[13px] font-bold mb-2" style={{ color }}>{role}</div>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item} className="flex gap-2 text-[12px]">
                    <span className="w-1 h-1 rounded-full shrink-0 mt-[6px]" style={{ background: color }} />
                    <span className="text-[color:var(--muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3">Attempting to access functionality beyond your assigned role is prohibited and may result in account suspension.</p>
      </>
    ),
  },
  {
    id: 'content',
    icon: <Eye size={18} />,
    title: '5. User Content and Uploads',
    content: (
      <>
        <p>You retain ownership of content you upload to the platform (&ldquo;User Content&rdquo;), including advertisement creatives, team logos, and match data. By uploading User Content, you grant Switch6 a non-exclusive, worldwide, royalty-free licence to store, process, and display that content solely to provide the Service.</p>
        <p className="mt-3">You represent and warrant that your User Content:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Does not infringe any third-party intellectual property, privacy, or publicity rights.',
            'Is not defamatory, obscene, hateful, or otherwise unlawful.',
            'Does not contain malicious code, viruses, or harmful components.',
            'Complies with all applicable advertising standards and regulations in your jurisdiction.',
            'For video advertisements: does not exceed the maximum duration specified at the time of purchase.',
            'For image advertisements: meets the minimum resolution requirements (720×480 px) stated in the platform.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">Switch6 reserves the right to remove User Content that violates these Terms without notice.</p>
      </>
    ),
  },
  {
    id: 'prohibited',
    icon: <Ban size={18} />,
    title: '6. Prohibited Conduct',
    content: (
      <>
        <p>You agree not to, and not to permit others to:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Reverse-engineer, decompile, or attempt to extract source code from the platform.',
            'Use automated tools, bots, scrapers, or crawlers to access or collect data from the Service.',
            'Attempt to gain unauthorised access to systems, servers, or other users&rsquo; data.',
            'Transmit unsolicited commercial communications (spam) through the platform.',
            'Misrepresent your identity, affiliation, or the nature of your advertisements.',
            'Resell, sublicense, or offer the Service to third parties without written consent.',
            'Interfere with or disrupt the integrity or performance of the platform.',
            'Use the Service to promote illegal activities, gambling (unless licensed), or adult content.',
            'Circumvent, disable, or otherwise interfere with security-related features.',
            'Post content that constitutes match-fixing, manipulation of results, or related corrupt activity.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--red)] shrink-0 mt-[7px]" />
              <span dangerouslySetInnerHTML={{ __html: item }} />
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    icon: <CreditCard size={18} />,
    title: '7. Payments and Billing',
    content: (
      <>
        <p>Certain features require paid subscriptions or one-time payments. All prices are displayed in Kenyan Shillings (KES) and are inclusive of applicable taxes unless stated otherwise.</p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
            <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1.5">Subscriptions (Broadcasters)</div>
            <p className="text-[13px]">Plans are billed per period as selected at time of purchase. Subscriptions auto-renew unless cancelled before the renewal date. Broadcasters without an active subscription retain read-only access to historical data.</p>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
            <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1.5">Advertisement payments (Advertisers)</div>
            <p className="text-[13px]">Advertisement campaigns are activated only upon successful payment. Pricing is calculated based on number of events, ad duration, and slot position (Pre-Match, Half Time, Post-Match, or Before Extra Time). All payments are processed via M-Pesa STK Push.</p>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-3.5">
            <div className="text-[13px] font-semibold text-[color:var(--text)] mb-1.5">Refund policy</div>
            <p className="text-[13px]">Payments are non-refundable once a campaign has been activated or a subscription period has commenced. Refunds may be considered at our sole discretion in cases of platform error. To request a refund, contact <a href="mailto:billing@switch6.io" className="text-[color:var(--green)] no-underline">billing@switch6.io</a> within 7 days.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'ip',
    icon: <Lock size={18} />,
    title: '8. Intellectual Property',
    content: (
      <>
        <p>All rights, title, and interest in the Switch6 platform — including but not limited to the software, design, brand marks, logos, APIs, documentation, and proprietary workflows — are and remain the exclusive property of Switch6 and its licensors.</p>
        <p className="mt-3">Nothing in these Terms transfers any intellectual property rights to you. You are granted only a limited, non-exclusive, non-transferable, revocable licence to use the Service in accordance with these Terms.</p>
        <p className="mt-3">You may not use the &ldquo;Switch6&rdquo; name, logo, or any similar marks in any manner likely to cause confusion, without prior written consent.</p>
      </>
    ),
  },
  {
    id: 'privacy',
    icon: <Eye size={18} />,
    title: '9. Data and Privacy',
    content: (
      <>
        <p>We collect and process personal data to operate the Service. This includes registration data (name, email, phone number), usage data (match activity, ad performance), and payment records. Full details are available in our Privacy Policy.</p>
        <p className="mt-3">Key commitments:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'We do not sell personal data to third parties.',
            'We use industry-standard encryption for data at rest and in transit.',
            'Payment processing is handled by licensed M-Pesa payment rails — Switch6 does not store raw payment credentials.',
            'Admin impersonation of user accounts is logged in an immutable audit trail.',
            'You may request deletion of your personal data by contacting privacy@switch6.io, subject to legal retention obligations.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--blue)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'uptime',
    icon: <RefreshCw size={18} />,
    title: '10. Service Availability',
    content: (
      <>
        <p>We aim to maintain high availability but do not guarantee uninterrupted access. Planned maintenance will be communicated via in-app notice where possible. We are not liable for disruptions caused by:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Third-party infrastructure outages (cloud providers, telecoms, payment rails).',
            'Force majeure events including natural disasters, government action, or civil unrest.',
            'Attacks on platform infrastructure (DDoS, intrusion attempts).',
            'Your own internet connectivity or device issues.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--muted)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'liability',
    icon: <AlertTriangle size={18} />,
    title: '11. Disclaimer and Limitation of Liability',
    content: (
      <>
        <p>The Service is provided <strong className="text-[color:var(--text)]">&ldquo;as is&rdquo;</strong> and <strong className="text-[color:var(--text)]">&ldquo;as available&rdquo;</strong> without warranty of any kind, either express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
        <p className="mt-3">To the maximum extent permitted by law, Switch6 and its directors, employees, and agents shall not be liable for:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'Indirect, incidental, special, consequential, or punitive damages.',
            'Loss of profits, revenue, data, or goodwill.',
            'Damages arising from advertisement content displayed during matches.',
            'Any disruption to live broadcast events caused by platform downtime.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">Our total aggregate liability for any claim shall not exceed the amount you paid to Switch6 in the 30 days preceding the claim.</p>
      </>
    ),
  },
  {
    id: 'termination',
    icon: <Ban size={18} />,
    title: '12. Suspension and Termination',
    content: (
      <>
        <p>Either party may terminate the relationship at any time. You may delete your account via the Settings page or by contacting us.</p>
        <p className="mt-3">We may suspend or terminate your account immediately and without prior notice if:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            'You violate any provision of these Terms.',
            'We reasonably suspect fraudulent, abusive, or illegal activity.',
            'Non-payment of outstanding amounts after a grace period.',
            'We are required to do so by law or regulatory authority.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--red)] shrink-0 mt-[7px]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">On termination, your right to use the Service ceases immediately. Data may be retained for up to 90 days before deletion, subject to legal obligations.</p>
      </>
    ),
  },
  {
    id: 'changes',
    icon: <RefreshCw size={18} />,
    title: '13. Changes to Terms',
    content: (
      <>
        <p>We may update these Terms from time to time. When we make material changes, we will notify you via email or in-app notification at least 14 days before the changes take effect.</p>
        <p className="mt-3">Your continued use of the Service after the effective date of updated Terms constitutes your acceptance of those changes. If you do not agree, you must stop using the Service and delete your account before the effective date.</p>
      </>
    ),
  },
  {
    id: 'governing',
    icon: <Scale size={18} />,
    title: '14. Governing Law',
    content: (
      <>
        <p>These Terms are governed by and construed in accordance with the laws of Kenya. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Nairobi, Kenya.</p>
        <p className="mt-3">If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
      </>
    ),
  },
  {
    id: 'contact',
    icon: <MessageSquare size={18} />,
    title: '15. Contact Information',
    content: (
      <>
        <p>If you have questions, concerns, or legal enquiries regarding these Terms, please contact us:</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: 'General',       email: 'hello@switch6.io' },
            { label: 'Legal',         email: 'legal@switch6.io' },
            { label: 'Billing',       email: 'billing@switch6.io' },
            { label: 'Privacy/GDPR',  email: 'privacy@switch6.io' },
          ].map(({ label, email }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] px-3.5 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[.05em] text-[color:var(--muted)]">{label}</div>
                <a href={`mailto:${email}`} className="text-[13px] font-medium text-[color:var(--green)] no-underline hover:underline">{email}</a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-[color:var(--muted)]">
          Response time: within 3 business days for general enquiries; within 24 hours for urgent security or legal matters.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service">
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
                <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[30px]">Terms of Service</h1>
                <p className="mt-1 text-[13px] text-[color:var(--muted)]">Effective date: {EFFECTIVE_DATE}</p>
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-green-500/30 bg-green-500/10 text-[color:var(--green)]">
                  <ShieldCheck size={12} /> Legally binding
                </span>
                <span className="text-[11px] text-[color:var(--muted)]">{sections.length} sections</span>
              </div>
            </div>
          </div>

          {/* Summary box */}
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-[color:var(--text)] mb-2">Summary (not a substitute for reading the full terms):</p>
            <ul className="space-y-1.5">
              {[
                'You must be 18+ and agree to these terms to use Switch6.',
                'Three roles exist: Broadcaster, Advertiser, Admin — each with defined permissions.',
                'Payments are in KES via M-Pesa; subscriptions auto-renew; ad payments are non-refundable once activated.',
                'You own your uploaded content but grant Switch6 licence to process it to provide the Service.',
                'Prohibited conduct includes hacking, impersonation, and match-fixing-related activity.',
                'Our liability is capped at 30 days of your payments. The Service is provided "as is".',
                'Governed by the laws of Kenya.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-[color:var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--green)] shrink-0 mt-[6px]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Table of contents — hidden on very small, visible on sm */}
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
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-green-500/30 bg-green-500/10 text-[color:var(--green)] shrink-0">
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
              Switch6 Broadcast Studio · Terms effective {EFFECTIVE_DATE}
            </span>
            <div className="flex gap-3">
              <Link href="/register" className="text-[12px] text-[color:var(--green)] no-underline hover:underline font-medium">Create account</Link>
              <Link href="/login" className="text-[12px] text-[color:var(--muted)] no-underline hover:text-[color:var(--text)]">Sign in</Link>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}
