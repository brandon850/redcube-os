// Shared types for the SEO audit engine (server-side only — uses cheerio + fetch).

export interface PageMetrics {
  title: string
  titleLength: number
  metaDescription: string
  metaDescLen: number
  h1Count: number
  h1Text: string
  h2Count: number
  canonical: string
  robotsMeta: string
  ogTitle: string
  ogDesc: string
  ogImage: string
  viewport: string
  lang: string
  imageCount: number
  imagesWithAlt: number
  imagesWithoutAlt: number
  internalLinks: number
  externalLinks: number
  wordCount: number
  hasSchemaOrg: boolean
  hasStructuredData: boolean
  hasGoogleAnalytics: boolean
  isMobileOptimized: boolean
  htmlSize: number
  hasNavElement: boolean
  hasFooter: boolean
  isHttps: boolean
  hasNoindex: boolean
}

export interface CrawledPage {
  url: string
  finalUrl: string
  status: number
  ok: boolean
  error: string | null
  metrics: PageMetrics | null
}

export interface AuxFiles {
  hasRobotsTxt: boolean
  hasSitemap: boolean
}

export type FindingType = 'pass' | 'warn' | 'fail'
export interface Finding {
  type: FindingType
  text: string
}

export interface CategoryResult {
  name: string
  icon: string
  score: number
  status: string
  findings: Finding[]
}

export interface AuditResult {
  overallScore: number
  grade: string
  gradeSummary: string
  domain: string
  pagesScanned: number
  pageUrls: string[]
  categories: CategoryResult[]
}
