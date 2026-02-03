# SEO Optimization Tasks - Dillon Shearer Website

**Generated:** 2026-02-03
**Total Tasks:** 18
**Completed:** 16/18 (89%)
**Primary Goal:** Rank #1 for "Dillon Shearer" + secondary role-based keywords

## ✅ Implementation Progress

**COMPLETED (2026-02-03 - Initial Session):**
- ✅ Task #1: Fixed base URL (portfolio-blog-starter.vercel.app → datawithdillon.com)
- ✅ Task #2: Fixed OG image default text
- ✅ Task #3: Updated homepage title to include full name
- ✅ Task #4: Updated About page title and H1
- ✅ Task #5: Updated Blog page title and H1
- ✅ Task #6: Updated Contact page title
- ✅ Task #7: Updated Resumes page title
- ✅ Task #8: Updated Demos page title
- ✅ Task #9: Expanded sitemap to 28+ pages
- ✅ Task #10: Added enhanced Article schema to blog posts
- ✅ Task #11: Updated homepage meta description with keywords

**COMPLETED (2026-02-03 - Second Session):**
- ✅ Task #12: Added author byline and bio to blog posts
- ✅ Task #13: Created Data Engineer service page (/services/data-engineer)
- ✅ Task #14: Created Data Analyst service page (/services/data-analyst)
- ✅ Task #15: Created Healthcare Data service page (/services/healthcare-data)
- ✅ Task #16: Added breadcrumb schema to blog posts

**REMAINING (Ongoing):**
- Task #17: Create 3-5 SEO blog posts (ongoing content creation)
- Task #18: Optimize external profiles (LinkedIn, GitHub, Dev.to, Medium)

---

## 🚨 CRITICAL (Do Immediately)

### Task #1: Fix incorrect base URL in sitemap configuration

**Priority:** H0 - BLOCKING ALL OTHER SEO WORK

**Problem:** The base URL in `app/sitemap.ts` points to starter template domain instead of actual domain.

**Location:** `/app/sitemap.ts` line 3

**Current:**
```typescript
export const baseUrl = 'https://portfolio-blog-starter.vercel.app'
```

**Fix:**
```typescript
export const baseUrl = 'https://datawithdillon.com'
```

**Impact:** Without this fix, all sitemaps, OpenGraph URLs, and structured data point to wrong domain. Google cannot properly index the site.

**Verification:**
1. Run `npm run build`
2. Visit `/sitemap.xml` - verify URLs are datawithdillon.com
3. Check page source for OpenGraph tags
4. Check JSON-LD structured data

---

### Task #2: Fix generic OG image default text

**Priority:** CRITICAL

**Problem:** OG image generator defaults to "Next.js Portfolio" (template leftover)

**Location:** `/app/og/route.tsx` line 5

**Current:**
```typescript
let title = url.searchParams.get('title') || 'Next.js Portfolio'
```

**Fix:**
```typescript
let title = url.searchParams.get('title') || 'Dillon Shearer | Data Engineer & Analyst'
```

**Impact:** Social media shares show unprofessional template text.

**Verification:**
1. Visit `/og` in browser
2. Should show "Dillon Shearer | Data Engineer & Analyst"
3. Test with social media card validators

---

## ⚡ HIGH PRIORITY (This Week)

### Task #3: Update homepage title tag to include full name

**Location:** `/app/layout.tsx` lines 18-21

**Current:**
```typescript
title: {
  default: 'Home | DWD',
  template: '%s',
},
```

**Fix:**
```typescript
title: {
  default: 'Dillon Shearer | Data Engineer & Data Analyst | Healthcare Analytics',
  template: '%s | Dillon Shearer',
},
```

**Impact:** Major boost for personal name + role keywords on most important page.

---

### Task #4: Update About page title and H1 to include name

**Location:** `/app/about/page.tsx`

**Changes Needed:**

1. **Title (lines 3-11):**
```typescript
title: 'About Dillon Shearer | Data-Centric Software Engineer',
```

2. **H1 (line 31-33):**
```typescript
<h1 className="section-title">
  About Dillon Shearer
</h1>
```

3. **Move role to subtitle (lines 34-36):**
```typescript
<p className="section-subtitle max-w-2xl mx-auto">
  Data-Centric Software Engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.
</p>
```

---

### Task #5: Update Blog page title and H1 to include name

**Location:** `/app/blog/page.tsx`

**Changes:**

1. **Metadata (lines 5-8):**
```typescript
export const metadata = {
  title: 'Blog | Dillon Shearer',
  description: 'Thoughts, insights, and learnings from Dillon Shearer on data engineering, analytics, healthcare data, and AI implementation.',
}
```

2. **H1 (line 19-21):**
```typescript
<h1 className="section-title">
  Blog by Dillon Shearer
</h1>
```

---

### Task #6: Update Contact page title

**Location:** `/app/contact/page.tsx` lines 6-9

**Fix:**
```typescript
title: 'Contact Dillon Shearer | Data Engineer & Analyst',
description: 'Get in touch with Dillon Shearer for data engineering, analytics, or healthcare data projects. Based in Newnan, Georgia.',
```

---

### Task #7: Update Resumes page title

**Location:** `/app/resumes/page.tsx` lines 5-14

**Fix:**
```typescript
title: 'Resumes | Dillon Shearer',
description: 'View and download role-specific resumes for Dillon Shearer: Data Engineer, Data Analyst, and Full-Stack Python Developer. PDF versions available.',
```

---

### Task #8: Update Demos page title

**Location:** `/app/demos/page.tsx` lines 6-13

**Fix:**
```typescript
title: 'Work Demos | Dillon Shearer',
description: 'Interactive demonstrations by Dillon Shearer showcasing data engineering, analytics dashboards, AI implementation, and full-stack development skills.',
```

---

### Task #9: Expand sitemap to include all public pages

**Location:** `/app/sitemap.ts` lines 11-21

**Replace routes array with:**
```typescript
let routes = [
  // Core pages
  '',
  '/about',
  '/contact',
  '/blog',

  // Resumes
  '/resumes',
  '/resumes/comprehensive',
  '/resumes/data-engineer',
  '/resumes/data-analyst',
  '/resumes/python-developer',

  // Demos
  '/demos',
  '/demos/gym-dashboard',
  '/demos/gym-dashboard/form',
  '/demos/data-access-portal',
  '/demos/data-access-portal/request',
  '/demos/data-access-portal/admin',
  '/demos/data-access-portal/data-download',
  '/demos/dillons-data-cleaner',

  // Education/Resources
  '/certifications',
  '/jupyter',
].map((route) => ({
  url: `${baseUrl}${route}`,
  lastModified: new Date().toISOString().split('T')[0],
}))
```

**Impact:** Increases indexed pages from ~6 to ~25+

---

### Task #10: Add Article schema to blog post template

**Location:** `/app/blog/[slug]/page.tsx`

**Add this code to blog post component:**
```typescript
const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.metadata.title,
  datePublished: post.metadata.publishedAt,
  dateModified: post.metadata.publishedAt,
  author: {
    '@type': 'Person',
    name: 'Dillon Shearer',
    url: 'https://datawithdillon.com',
    sameAs: [
      'https://github.com/dillon-shearer',
      'https://www.linkedin.com/in/dillonshearer/',
    ],
  },
  publisher: {
    '@type': 'Person',
    name: 'Dillon Shearer',
  },
  description: post.metadata.summary,
  image: post.metadata.image || `https://datawithdillon.com/og?title=${encodeURIComponent(post.metadata.title)}`,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://datawithdillon.com/blog/${post.slug}`,
  },
}

// Then add script tag in JSX:
<script
  type="application/ld+json"
  suppressHydrationWarning
  dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
/>
```

**Impact:** Blog posts get rich snippets in search results (author, date, image)

**Verification:** Use Google Rich Results Test

---

## 📊 MEDIUM PRIORITY (Next 2-4 Weeks)

### Task #11: Update homepage meta description with keywords

**Location:** `/app/layout.tsx` line 14

**Current:**
```typescript
const siteDescription = 'Data-centric software engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.'
```

**Fix:**
```typescript
const siteDescription = 'Dillon Shearer | Data Engineer & Analyst specializing in healthcare analytics and AI. Building production data systems in Georgia.'
```

**Impact:** Includes name, roles, location, and specialization in ~135 characters.

---

### Task #12: Add author byline to blog post template

**Location:** `/app/blog/[slug]/page.tsx`

**Add byline after title:**
```typescript
<div className="flex items-center gap-3 mb-6 text-sm text-white/60">
  <span>By</span>
  <a
    href="/about"
    className="text-[#54b3d6] hover:text-[#54b3d6]/80 transition-colors font-medium"
  >
    Dillon Shearer
  </a>
  <span>•</span>
  <time dateTime={post.metadata.publishedAt}>
    {formatDate(post.metadata.publishedAt)}
  </time>
</div>
```

**Add author bio at end of post:**
```typescript
<div className="mt-12 p-6 border border-white/10 rounded-lg bg-white/[0.02]">
  <div className="flex items-start gap-4">
    <img
      src="/ds.jpg"
      alt="Dillon Shearer"
      className="w-16 h-16 rounded-full"
    />
    <div>
      <h3 className="font-bold text-white mb-2">About the Author</h3>
      <p className="text-white/60 text-sm mb-3">
        <strong className="text-white">Dillon Shearer</strong> is a Data Engineer and Data Analyst
        specializing in healthcare analytics and AI implementation. Currently working at Answer ALS,
        building data systems for rare disease research.
      </p>
      <a
        href="/about"
        className="text-[#54b3d6] hover:text-[#54b3d6]/80 text-sm font-medium"
      >
        Learn more about Dillon →
      </a>
    </div>
  </div>
</div>
```

**Impact:** Stronger author attribution signals for Google.

---

### Task #13: Create Data Engineer service landing page

**Create:** `/app/services/data-engineer/page.tsx`

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: 'Data Engineer Services | Dillon Shearer',
  description: 'Hire Dillon Shearer for data engineering services: ETL pipelines, data warehousing, Snowflake/dbt development, and healthcare data systems. Based in Georgia.',
}
```

**Sections to Include:**
1. Hero with H1: "Data Engineering Services"
2. Services overview (ETL, pipelines, warehousing)
3. Technologies (Python, SQL, Snowflake, dbt, PostgreSQL)
4. Featured projects (link to Gym Dashboard, Data Access Portal)
5. Healthcare specialization (FHIR, OMOP, SNOMED, LOINC)
6. CTA (Contact + Resume link)

**Target Keywords:**
- Data Engineer
- Hire Data Engineer
- Data Engineer Georgia
- Healthcare Data Engineer
- ETL Pipeline Development

**Internal Links:**
- `/demos/gym-dashboard`
- `/demos/data-access-portal`
- `/resumes/data-engineer`
- `/contact`

---

### Task #14: Create Data Analyst service landing page

**Create:** `/app/services/data-analyst/page.tsx`

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: 'Data Analyst Services | Dillon Shearer',
  description: 'Hire Dillon Shearer for data analytics services: dashboard development, business intelligence, Power BI/Tableau reporting, and healthcare analytics. Based in Georgia.',
}
```

**Sections to Include:**
1. Hero with H1: "Data Analyst Services"
2. Analytics services (dashboards, reporting, statistical analysis)
3. Tools (Power BI, Tableau, SQL, Python, R)
4. Featured dashboards (Gym Dashboard)
5. Certification highlight (PL-300)
6. CTA

**Target Keywords:**
- Data Analyst
- Hire Data Analyst
- Data Analyst Georgia
- Healthcare Data Analyst
- Power BI Analyst

**Differentiation Section:**
Add comparison between Data Engineer vs Data Analyst roles to educate visitors.

---

### Task #15: Create Healthcare Data service landing page

**Create:** `/app/services/healthcare-data/page.tsx`

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: 'Healthcare Data Services | Dillon Shearer',
  description: 'Specialized healthcare data solutions by Dillon Shearer: clinical data engineering, HL7 FHIR, OMOP, SNOMED, LOINC, and rare disease research data systems.',
}
```

**Sections to Include:**
1. Hero with H1: "Healthcare Data Solutions"
2. Healthcare experience (Answer ALS, rare disease research)
3. Standards expertise (HL7 FHIR, OMOP, SNOMED, LOINC)
4. Services (clinical data pipelines, governance, compliance)
5. Featured project (Data Access Portal)
6. CTA

**Target Keywords:**
- Healthcare Data Analyst
- Healthcare Data Engineer
- Clinical Data Specialist
- HL7 FHIR
- OMOP implementation

**Trust Elements:**
- HIPAA compliance mention
- Patient-centered approach
- Ethics statement

---

### Task #16: Add breadcrumb schema to blog posts and deep pages

**Create:** `/app/components/breadcrumbs.tsx`

**Component code:**
```typescript
'use client'

import Link from 'next/link'
import { baseUrl } from '@/app/sitemap'

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [
    { name: 'Home', url: baseUrl },
    ...items
  ]

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-white/60">
          {allItems.map((item, index) => (
            <li key={item.url} className="flex items-center gap-2">
              {index > 0 && <span className="text-white/40">/</span>}
              {index === allItems.length - 1 ? (
                <span className="text-white/40">{item.name}</span>
              ) : (
                <Link href={item.url.replace(baseUrl, '')} className="hover:text-white transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}
```

**Add to blog posts:**
```typescript
const breadcrumbItems = [
  { name: 'Blog', url: `${baseUrl}/blog` },
  { name: post.metadata.title, url: `${baseUrl}/blog/${post.slug}` },
]

<Breadcrumbs items={breadcrumbItems} />
```

**Impact:** Breadcrumb rich snippets in search results, improved CTR.

---

## 📝 LOW PRIORITY (Ongoing)

### Task #17: Create 3-5 new blog posts with name attribution

**Goal:** Publish 1 post per week for 4-5 weeks

**Recommended Topics:**

1. **"Building Production ETL Pipelines: A Step-by-Step Guide"**
   - Keywords: ETL pipeline, data engineering, Python
   - Links to: Data Engineer service page, Gym Dashboard demo

2. **"5 Power BI Tips for Healthcare Dashboards"**
   - Keywords: Power BI healthcare, clinical dashboards
   - Links to: Data Analyst service page, PL-300 certification

3. **"Introduction to HL7 FHIR for Data Engineers"**
   - Keywords: HL7 FHIR, healthcare data standards
   - Links to: Healthcare Data service page

4. **"SQL for Data Analysts: 10 Essential Queries"**
   - Keywords: SQL for analysts, data analysis SQL
   - Links to: Data Analyst service page

5. **"Building an AI-Powered Analytics Chatbot with Claude"**
   - Keywords: AI chatbot, Claude API, LLM analytics
   - Links to: Gym Dashboard chat demo

**Every Post Must Include:**
- Author byline: "By Dillon Shearer"
- Author bio at end with link to /about
- 3-5 internal links to service pages/demos
- Article schema (from Task #10)
- 1200+ words
- Target keyword in title and H1

---

### Task #18: Optimize external profiles and claim online listings

**LinkedIn:**
- Update headline to match site: "Data Engineer · Data Analyst · Full-Stack Python Developer"
- Include datawithdillon.com link in About section
- Add skills: Data Engineering, Data Analysis, Python, SQL, Power BI, Healthcare Analytics
- Share blog posts regularly

**GitHub:**
- Create profile README (github.com/dillon-shearer/dillon-shearer)
- Include link to datawithdillon.com
- Pin best 6 repositories
- Add descriptions to all repos

**Create Profiles:**
- Dev.to (cross-post blog with canonical links)
- Medium (cross-post blog with canonical links)
- Stack Overflow (answer questions, link to site)

**Update Person Schema in layout.tsx:**
```typescript
sameAs: [
  'https://github.com/dillon-shearer',
  'https://www.linkedin.com/in/dillonshearer/',
  'https://dev.to/dillonshearer',
  'https://medium.com/@dillonshearer',
],
```

**Impact:** Stronger entity signals, quality backlinks, wider content reach.

---

## 📅 Execution Timeline

### Week 1 (Immediate):
- [x] Task #1: Fix base URL (CRITICAL) ✅ **COMPLETED 2026-02-03**
- [x] Task #2: Fix OG image default ✅ **COMPLETED 2026-02-03**
- [x] Tasks #3-8: Update all title tags ✅ **COMPLETED 2026-02-03**
  - [x] Task #3: Homepage title
  - [x] Task #4: About page
  - [x] Task #5: Blog page
  - [x] Task #6: Contact page
  - [x] Task #7: Resumes page
  - [x] Task #8: Demos page
- [x] Task #9: Expand sitemap ✅ **COMPLETED 2026-02-03**

### Week 2-3:
- [x] Task #10: Add Article schema ✅ **COMPLETED 2026-02-03**
- [x] Task #11: Update meta descriptions ✅ **COMPLETED 2026-02-03**
- [x] Task #12: Add author bylines ✅ **COMPLETED 2026-02-03**
- [x] Tasks #13-15: Create service pages ✅ **COMPLETED 2026-02-03**
  - [x] Data Engineer service page
  - [x] Data Analyst service page
  - [x] Healthcare Data service page

### Week 4-8:
- [x] Task #16: Add breadcrumbs ✅ **COMPLETED 2026-02-03**
- [ ] Task #17: Publish blog posts (1 per week) - **IN PROGRESS**
- [ ] Task #18: Optimize external profiles - **TODO**

---

## 🎯 Success Metrics

**30 Days:**
- "Dillon Shearer" ranking: Top 5
- Indexed pages: 20+
- Google Search Console impressions for name: 50+/month

**60 Days:**
- "Dillon Shearer" ranking: #1
- "Data Analyst Georgia" ranking: Page 2
- Organic traffic: 100+ visitors/month

**90 Days:**
- "Dillon Shearer" ranking: #1 (locked)
- "Data Analyst Georgia" ranking: Page 1
- "Healthcare Data Engineer" ranking: Page 1-2
- Organic traffic: 200+ visitors/month
- Contact form submissions: 5+/month

---

## ✅ Verification Tools

- Google Search Console
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- LinkedIn Post Inspector
- Twitter Card Validator

---

**File Location:** `/Users/dillon/Desktop/projects/dillon-shearer-website/SEO-TASKS.md`
**Last Updated:** 2026-02-03
**Implementation Status:** 11/18 tasks completed (61% complete)
