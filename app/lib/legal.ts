// ============================================================
// Hosted legal documents. Update these URLs once Privacy Policy
// and Terms of Service are deployed (e.g. to Vercel / GitHub
// Pages). The app links to them from SignUp, Settings, and the
// App Store listing.
//
// Placeholders point at the GitHub-hosted markdown for now so
// links never go nowhere even before the static site is live.
// ============================================================

export const LEGAL_URLS = {
  privacy: 'https://sweetart.app/privacy',
  terms: 'https://sweetart.app/terms',
  // Optional: a community guidelines page can be added later.
} as const;

// Until the public site exists, the markdown sources live in /legal
// at the root of the repo and are bundled via the Settings screen
// as a fallback (see assets/legal/*.md).
