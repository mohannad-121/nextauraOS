/**
 * Service Custom Icon Mapper
 *
 * Dynamically resolves custom icon assets imported via Vite's `import.meta.glob`
 * from `src/assets/icons/`. Provides robust matching and fallback handling.
 */

// Import all icon assets eagerly at build time
const iconModules = import.meta.glob<string>('../assets/icons/**/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  import: 'default',
});

// Category folder map
const CATEGORY_FOLDER_MAP: Record<string, string> = {
  finance: 'FINANCE',
  hr: 'HUMAN RESOURCES',
  marketing: 'MARKETING',
  global: 'GLOBAL PLATFORM',
};

// Exact filename map matching actual disk filenames
const SERVICE_EXACT_FILENAME_MAP: Record<string, string> = {
  invoicing: 'invoice & payments',
  accounting: 'Accounting & GenralLedger',
  expenses: 'Expenses & Corporate Cards',
  sign: 'NextAura Sign (E- Signature)',
  equity: 'Equity & Cap Table',
  esg: 'ESG & Carbon Accounting',
  employees: 'Employee Directory & Org Chart',
  attendance: 'Attendence & Kiosk Tracking',
  recruitment: 'Recruitment & ATS Pipeline',
  time_off: 'Time Off & Leave Management',
  appraisals: 'Appraisals & Goals( OKRs)',
  fleet: 'Fleet & Asset Management',
  payroll: 'Payroll processing & GL Sync',
  email_marketing: 'Email Marketing & Campaigns',
  sms_marketing: 'SMS Marketing & Broadcasts',
  surveys: 'Surveys & CSAT Feedback',
  social_marketing: 'Social Marketing & Scheduling',
  contacts: 'Contacts & CRM Directory',
  documents: 'Document Vault & Vault Search',
  analytics: 'Analytics Center',
};

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Returns the resolved custom icon URL for a given service category, name, and key.
 * Returns null if no custom icon can be found (triggering fallback).
 */
export function getServiceCustomIcon(
  category: string,
  serviceName: string,
  serviceKey?: string
): string | null {
  const targetCategoryFolder = CATEGORY_FOLDER_MAP[category.toLowerCase()] || category.toUpperCase();
  const targetCategoryNorm = normalizeString(targetCategoryFolder);

  // 1. Direct check using exact filename map if serviceKey provided
  if (serviceKey && SERVICE_EXACT_FILENAME_MAP[serviceKey]) {
    const exactFilename = SERVICE_EXACT_FILENAME_MAP[serviceKey];
    for (const [path, url] of Object.entries(iconModules)) {
      if (path.includes(`/${targetCategoryFolder}/`) && path.includes(exactFilename)) {
        return url;
      }
    }
  }

  // 2. Normalized name check against all imported asset paths
  const nameNorm = normalizeString(serviceName);

  for (const [path, url] of Object.entries(iconModules)) {
    const normPath = normalizeString(path);
    if (normPath.includes(targetCategoryNorm)) {
      const filenameWithExt = path.split('/').pop() || '';
      const filenameOnly = filenameWithExt.replace(/\.[^/.]+$/, '');
      const fileNorm = normalizeString(filenameOnly);

      if (fileNorm === nameNorm || nameNorm.includes(fileNorm) || fileNorm.includes(nameNorm)) {
        return url;
      }
    }
  }

  // 3. Fallback check: check if filename shares key roots (e.g. 'invoice' vs 'invoicing')
  const rootToken = nameNorm.slice(0, 6);
  if (rootToken.length >= 4) {
    for (const [path, url] of Object.entries(iconModules)) {
      const normPath = normalizeString(path);
      if (normPath.includes(targetCategoryNorm) && normPath.includes(rootToken)) {
        return url;
      }
    }
  }

  if (import.meta.env?.DEV) {
    console.warn(`[ServiceSelection] Missing custom icon for: ${serviceName} (${category})`);
  }

  return null;
}
