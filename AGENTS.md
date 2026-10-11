# Private document site

- Keep this a static, Korean-language site. The user replaced the travel site with a new private document; do not restore travel pages.
- Encrypt the entire document: title, navigation labels, body, schedule, project context and source links. Public HTML/JS/CSS may contain only the generic lock shell and renderer. Do not put document content in source, attributes, URLs, metadata, logs, source maps, tests, or Git history.
- `.private/` is local-only, ignored by Git, outside Vite's web root. Source JSON, passwords, backups and private review artifacts stay there. Serve/deploy only `dist/`, never the repository root. Public data must not import private source files.
- Use Web Crypto PBKDF2-SHA-256 (600,000 iterations), random 16-byte salt and AES-256-GCM with fresh 12-byte IV. Authenticated decryption and schema validation fail closed.
- A global toggle unlocks all document content. Hold decrypted data only in tab memory across internal hash navigation. Route IDs must be opaque. Browser title remains generic. Never store plaintext/passwords/keys in browser storage, URLs, analytics, or logs.
- Clear password/key references after use. OFF, reload, pagehide and BFCache restoration lock the app; cancel pending unlocks so stale results cannot reveal content. Remove decrypted DOM and hrefs on locking.
- Render decrypted text with textContent, never innerHTML. Validate private links as HTTPS without credentials; create hrefs only after unlocking. Do not promise forensic memory erasure or revocation of previously viewed data.
- Self-host JS/CSS. No third-party requests for document rendering. Preserve source attribution inside the encrypted document. Verify program details using official sources and record verification dates. Distinguish evidence from interpretation and proposals from approvals or bookings.
- On privacy/build changes, run crypto and artifact-leak tests plus browser unlock/lock/reload/navigation/race tests, mobile layouts and static subpath hosting. Tests must not print private values or capture decrypted DOM in failure artifacts. Keep screenshots/trace/video disabled and close test pages before failure snapshot capture.
- Preserve the existing deployment configuration. Do not send team messages, make reservations or purchase tickets.
