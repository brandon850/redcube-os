// Branded, email-safe HTML templates. Pure functions (subject + html) so they
// can render in the in-app preview now and be sent via Resend (serverless) later.

export interface EmailBrand {
  name: string
  color?: string | null
  from_email?: string | null
}

export interface EmailProps {
  contactName?: string
  repName?: string
  repEmail?: string
  calendarUrl?: string
  proposalUrl?: string
  amount?: string
  [key: string]: string | undefined
}

const FALLBACK_BRAND: EmailBrand = { name: 'RedCube Creative', color: '#E8172B', from_email: 'hello@redcube.co' }

function layout(brand: EmailBrand, preview: string, body: string): string {
  const color = brand.color || '#E8172B'
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${brand.name}</title></head>
<body style="margin:0;background:#f5f4f0;font-family:Inter,Arial,Helvetica,sans-serif;color:#1a1a1a">
<span style="display:none;opacity:0;color:transparent">${preview}</span>
<div style="max-width:560px;margin:0 auto;padding:24px 12px">
  <div style="background:${color};border-radius:10px 10px 0 0;padding:18px 24px;color:#fff;font-weight:700;font-size:18px">${brand.name}</div>
  <div style="background:#fff;border-radius:0 0 10px 10px;padding:24px">${body}</div>
  <div style="text-align:center;color:#8a8a8a;font-size:12px;padding:16px 8px">
    ${brand.name}${brand.from_email ? ` · ${brand.from_email}` : ''}<br>
    <a href="{{{unsubscribe_url}}}" style="color:#8a8a8a">Unsubscribe</a>
  </div>
</div></body></html>`
}

function btn(color: string, href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">${label}</a>`
}

export interface EmailTemplate {
  id: string
  label: string
  subject: (b: EmailBrand, p: EmailProps) => string
  body: (b: EmailBrand, p: EmailProps) => string
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    id: 'welcome',
    label: 'Welcome',
    subject: (b) => `Welcome — here's what working with ${b.name} looks like`,
    body: (b, p) => `
      <p>Hi ${p.contactName || 'there'},</p>
      <p>Thanks for reaching out to ${b.name}. We're glad you're here. Over the next little while we'll share how we work and how we can help.</p>
      <p>Want to talk sooner? Grab a time below.</p>
      <p>${btn(b.color || '#E8172B', p.calendarUrl || '#', 'Book a call')}</p>
      <p>— ${p.repName || 'The team'}</p>`,
  },
  nurture_value: {
    id: 'nurture_value',
    label: 'Nurture — how we work',
    subject: () => `How we typically work with companies like yours`,
    body: (b, p) => `
      <p>Hi ${p.contactName || 'there'},</p>
      <p>A quick look at how engagements with ${b.name} usually go:</p>
      <ul>
        <li><strong>Week 1</strong> — discovery + a clear plan</li>
        <li><strong>Weeks 2–4</strong> — first results live</li>
        <li><strong>Month 2+</strong> — steady improvement and reporting</li>
      </ul>
      <p>${btn(b.color || '#E8172B', p.calendarUrl || '#', 'Schedule a chat')}</p>`,
  },
  nurture_breakup: {
    id: 'nurture_breakup',
    label: 'Nurture — break-up',
    subject: () => `Should I close your file?`,
    body: (_b, p) => `
      <p>Hi ${p.contactName || 'there'},</p>
      <p>I haven't heard back, which is totally fine — you're busy. If now isn't the right time, no worries at all and I'll close your file.</p>
      <p>If you'd like to pick things back up, just reply to this email and we'll take it from there.</p>
      <p>— ${p.repName || 'The team'}</p>`,
  },
  proposal_sent: {
    id: 'proposal_sent',
    label: 'Proposal sent',
    subject: (b) => `Your proposal from ${b.name} is ready`,
    body: (b, p) => `
      <p>Hi ${p.contactName || 'there'},</p>
      <p>Your proposal is ready to review. You can choose your packages and accept right on the page.</p>
      <p>${btn(b.color || '#E8172B', p.proposalUrl || '#', 'View your proposal')}</p>`,
  },
  onboarding_welcome: {
    id: 'onboarding_welcome',
    label: 'Onboarding welcome',
    subject: () => `Your project is live — here's how to get started`,
    body: (b, p) => `
      <p>Hi ${p.contactName || 'there'},</p>
      <p>You're all set — welcome aboard! Here's what just happened:</p>
      <ul>
        <li>✓ Your project is set up</li>
        <li>✓ Your first invoice${p.amount ? ` (${p.amount})` : ''} is on its way</li>
        <li>✓ Your kickoff is being scheduled</li>
      </ul>
      <p>— ${p.repName || `The ${b.name} team`}</p>`,
  },
}

export const TEMPLATE_LIST = Object.values(EMAIL_TEMPLATES)

/** Render a template to { subject, html } for preview or sending. */
export function buildEmail(templateId: string, brand: EmailBrand | null, props: EmailProps = {}) {
  const t = EMAIL_TEMPLATES[templateId]
  const b = brand ?? FALLBACK_BRAND
  if (!t) return { subject: '(unknown template)', html: '' }
  return { subject: t.subject(b, props), html: layout(b, t.subject(b, props), t.body(b, props)) }
}

export const SAMPLE_PROPS: EmailProps = {
  contactName: 'Sarah Nguyen',
  repName: 'Alex',
  repEmail: 'alex@redcube.co',
  calendarUrl: 'https://cal.com/redcube',
  proposalUrl: 'https://app.redcube.co/proposals/view/demo',
  amount: '$2,500',
}
