# FinFlow Executive — Hosting, Domain & URL Handover Guide
*Production Infrastructure, DNS Architecture, Browser Automation & HTTPS Configuration*

---

## 1. Quick Reference & Core Identifiers

| Parameter | Production Value | Description |
|---|---|---|
| **Production URL** | **`https://expenses.scriptingbear.com`** | Live public production web endpoint |
| **Local / Fallback URL** | `http://localhost:3000` | Local production/dev server on macOS |
| **LAN IP (Mobile / WiFi)** | `http://10.95.71.75:3000` | Local network mobile access without SSL |
| **Hosting Provider** | **Vercel** (Hobby Plan — 100% Free) | Edge serverless hosting & automated CI/CD |
| **Vercel Team / Project** | `priyanshuagrawals-projects` / `finflow-app` | Project dashboard on Vercel |
| **Vercel Project URL** | `https://vercel.com/priyanshuagrawals-projects/finflow-app` | Vercel dashboard management console |
| **Domain Registrar** | **Spaceship** | DNS management for `scriptingbear.com` |
| **Spaceship DNS Console** | `https://www.spaceship.com/application/advanced-dns-application/manage/scriptingbear.com/` | Advanced DNS management console |
| **Subdomain** | `expenses.scriptingbear.com` | Dedicated CNAME record under `scriptingbear.com` |
| **Git Deployment Remote** | `app` (`https://github.com/Priyanshu-Agrawal/finflow-app.git`) | Pushing to `app/main` triggers auto-deployment |
| **Google Cloud Project** | `Linker's Lobby` (`linkers-lobby`) | Hosts the Google Sheets API & Service Account |
| **Authoritative Sheet** | `Expenses Tracker` (`19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A`) | Live transactional backend |

---

## 2. Infrastructure & Hosting Architecture

```mermaid
flowchart TD
    User([Executive User / iPhone / Desktop]) -->|HTTPS: expenses.scriptingbear.com| SpaceshipDNS[Spaceship DNS\nCNAME: expenses]
    
    SpaceshipDNS -->|Points to: cname.vercel-dns.com| VercelEdge[Vercel Global Edge Network\nAnycast SSL Termination]
    
    subgraph Vercel_Platform [Vercel Cloud Platform]
        VercelEdge --> SSL[Automatic Let's Encrypt SSL/TLS]
        SSL --> NextRuntime[Next.js 16 App Router Serverless Engine]
        NextRuntime --> AuthCheck[JWT Cookie & Session Verification]
    end

    subgraph External_Integrations [External APIs & Services]
        AuthCheck -->|OAuth2 Service Account| GSheets[Google Sheets API v4\nExpenses Tracker]
        GitHub[GitHub: Priyanshu-Agrawal/finflow-app] -->|Git Push Webhook| VercelBuild[Vercel Automated Build CI/CD]
        VercelBuild --> NextRuntime
    end
```

### 2.1 Hosting Provider: Vercel
- **Form Factor**: Serverless Next.js 16 deployment with static asset caching and dynamic serverless edge functions for `/api/*` route handlers.
- **Continuous Deployment (CI/CD)**:
  - Linked to GitHub repository: `https://github.com/Priyanshu-Agrawal/finflow-app.git`.
  - Every time code is pushed to the `main` branch of `app` (`git push app main`), Vercel automatically runs `next build`, performs static optimization, verifies types, and deploys a zero-downtime release.

### 2.2 Dual-Remote Git Synchronization
To maintain both the private workspace repo and the Vercel deployment repo, two remotes are maintained locally:
```bash
# origin -> Primary engineering repository
origin  https://github.com/Priyanshu-Agrawal/finflow-executive.git (fetch & push)

# app -> Live Vercel production repository
app     https://github.com/Priyanshu-Agrawal/finflow-app.git (fetch & push)
```
**Standard Deploy Command**:
```bash
git push origin main
git push app main
```

---

## 3. Domain, Subdomain & HTTPS Provisioning

### 3.1 Domain Setup on Spaceship (Registrar)
The root domain `scriptingbear.com` is registered and managed on **Spaceship**. The subdomain `expenses.scriptingbear.com` was created using a standard CNAME delegation:

1. Navigated to **Spaceship Advanced DNS**:
   `https://www.spaceship.com/application/advanced-dns-application/manage/scriptingbear.com/`
2. Configured the DNS record:
   - **Type**: `CNAME`
   - **Host / Name**: `expenses`
   - **Value / Target**: `cname.vercel-dns.com.` (or Vercel-assigned endpoint `ee685213973030ee.vercel-dns-017.com.`)
   - **TTL**: Automatic (or 300s)
3. Verified DNS propagation via terminal:
   ```bash
   dig expenses.scriptingbear.com +short
   # Output:
   # ee685213973030ee.vercel-dns-017.com.
   # 216.198.79.65
   # 64.29.17.65
   ```

### 3.2 How HTTPS & SSL Were Added
- **Automatic SSL Provisioning**: Vercel handles SSL/TLS certificates automatically through Let's Encrypt / DigiCert.
- **Verification Flow**:
  1. Once `expenses.scriptingbear.com` was added to **Vercel ➔ Project Settings ➔ Domains**, Vercel initiated an automated ACME challenge against the CNAME record.
  2. As soon as the CNAME record resolved to Vercel's edge network, Vercel signed and provisioned a wildcard / dedicated SSL certificate.
  3. **Strict HTTPS Enforcement**: All incoming HTTP traffic on port 80 is automatically redirected via HTTP 308/307 to `https://expenses.scriptingbear.com` with HSTS headers.

### 3.3 Dynamic Cookie & Subdomain Authentication Protocol
To support both production HTTPS (`expenses.scriptingbear.com`) and local WiFi LAN access (`10.95.71.75:3000`) without mobile cookie rejection, [`src/lib/auth.ts`](file:///Users/essence/finflow-executive/src/lib/auth.ts) implements an adaptive cookie policy:

```typescript
// Detect protocol & origin
const isIpOrLocalhost =
  !hostname ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname) ||
  /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

// HTTPS only enforces secure: true on real domain names
const secure = isHttps && !isIpOrLocalhost;
```

---

## 4. Production Environment Variables (Vercel)

The following environment variables are securely stored in **Vercel Project Settings ➔ Environment Variables** across Production, Preview, and Development environments:

| Environment Variable | Description |
|---|---|
| `SPREADSHEET_ID` | `19MdOX_A-Nqw8a6rk77l4sNRQMAFcxudCp0ZmrHuqA_A` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email generated in Google Cloud console |
| `GOOGLE_PRIVATE_KEY` | RSA private key starting with `-----BEGIN PRIVATE KEY-----` |
| `AUTH_USERNAME` | `scriptingBear` (Executive login username) |
| `AUTH_USER` | `scriptingbear` (Normalized username) |
| `AUTH_PASSWORD` | `FinFlow@2026!` (Executive login password) |
| `AUTH_SECRET` | Cryptographic secret for signing session JWT tokens |
| `COOKIE_DOMAIN` | `.scriptingbear.com` (Permits shared cookie across subdomains) |
| `COOKIE_SECURE` | Set dynamically by request protocol |

---

## 5. How the Browser Was Controlled (Browser Automation)

During setup and verification, browser automation was performed across two distinct systems:

```mermaid
flowchart LR
    subgraph System_1 [1. Live User Chrome Control]
        MCP[Chrome DevTools MCP Daemon] <--> CLI[chrome_cli.js]
        CLI <--> UserChrome[Live User Chrome Browser\nProfiles & Active Logged-in Sessions]
    end

    subgraph System_2 [2. Headless End-to-End Testing]
        Playwright[Playwright Test Runner] <--> ChromeBinary[/Applications/Google Chrome.app]
    end
```

### 5.1 System 1: Live User Chrome Automation (`chrome_cli.js`)
To interact with authenticated consoles (Google Cloud Console, GitHub, Vercel, Spaceship DNS) without requiring the user to share passwords or solve captchas, automation controlled the user's running Google Chrome browser via a **persistent Chrome DevTools MCP daemon**:

- **CLI Driver**: `~/.agents/skills/main-chrome/scripts/chrome_cli.js`
- **Underlying Protocol**: Chrome DevTools Protocol (CDP) communicating over a persistent local daemon socket (`/tmp/chrome_daemon.log`).
- **Commands Used**:
  1. **Tab Enumeration**:
     ```bash
     node ~/.agents/skills/main-chrome/scripts/chrome_cli.js list
     ```
     Listed all open tabs, window IDs, titles, and active URLs.
  2. **Page Navigation**:
     ```bash
     node ~/.agents/skills/main-chrome/scripts/chrome_cli.js navigate <tabId> <url>
     ```
     - Navigated Tab 17 to GCP Service Account Creation: `https://console.cloud.google.com/iam-admin/serviceaccounts/create...`
     - Navigated Tab 13 to Vercel Project Clone: `https://vercel.com/new/clone?repository-name=finflow-app&s=...`
     - Navigated Tab 7 to Spaceship DNS: `https://www.spaceship.com/application/advanced-dns-application/manage/scriptingbear.com/`
     - Navigated Tab 1 to Live App: `https://expenses.scriptingbear.com`
  3. **In-Page JavaScript Evaluation & DOM Automation**:
     ```bash
     node ~/.agents/skills/main-chrome/scripts/chrome_cli.js eval <tabId> "<javascript>"
     ```
     - Accepted Vercel cookie banner.
     - Selected Git scope (`Priyanshu-Agrawal`) and repository (`finflow-app`).
     - Clicked "Create", "Deploy", and navigated through Vercel environment variable settings.
     - Injected and saved the CNAME record in Spaceship's advanced DNS table.
  4. **Direct Browser Tab Screenshots**:
     ```bash
     node ~/.agents/skills/main-chrome/scripts/chrome_cli.js screenshot <tabId> <outputPath>
     ```
     Captured verified screenshots directly from the active rendering tab.

### 5.2 System 2: Headless Playwright Verification
For non-intrusive automated testing, Playwright drove the macOS installed Chrome binary:
- **Executable Path**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Node Resolution**: `NODE_PATH=/Users/essence/finflow-executive/node_modules`
- **Capabilities Tested**:
  - iPhone 14 Pro viewport emulation (`393x852`, device scale factor 3).
  - Cookie lifecycle and authentication token verification over local LAN.
  - Multi-level `Control+Z` undo testing and drag-and-drop row reordering.

---

## 6. Full Technology Stack Summary

| Technology | Category | Role in System |
|---|---|---|
| **Next.js 16.4.6** | Full-Stack Framework | App Router, Server Components, Route Handlers, Turbopack |
| **React 19** | UI Library | Client component rendering, hooks, state management |
| **Tailwind CSS 3.4.1** | Styling Engine | Executive dark palette (`#0B0B0C`, `#121214`, `amber-400/500`) |
| **TanStack React Query 5** | Async State Management | Query caching, optimistic UI updates, background polling |
| **Google Sheets API v4** | Primary Database | Transactional persistence, dynamic formula computation |
| **Vercel** | Cloud Hosting | Serverless edge execution, global CDN, auto-deployment |
| **Spaceship** | DNS & Registrar | Authoritative DNS hosting for `scriptingbear.com` |
| **Let's Encrypt / DigiCert** | SSL/TLS Encryption | Free automatic HTTPS certificate generation & renewal |
| **Playwright** | Automation & Testing | End-to-end regression testing and mobile emulation |
| **Chrome DevTools MCP** | Live Browser Driver | Real-time browser tab orchestration and console interaction |
| **jose / JWT** | Security & Auth | Cryptographic session tokens with HTTP-only cookies |

---

## 7. Operational Runbook & Maintenance

### How to trigger a fresh production deployment:
```bash
cd /Users/essence/finflow-executive
git add .
git commit --author="Priyanshu Agrawal <Spiderfan.No1@gmail.com>" -m "feat: updates"
git push origin main
git push app main
```
*Vercel detects the push to `app/main` and automatically builds and redeploys to `https://expenses.scriptingbear.com` within 45 seconds.*

### How to check DNS status:
```bash
dig expenses.scriptingbear.com +short
```

### How to verify live HTTPS status:
```bash
curl -sI https://expenses.scriptingbear.com
# Expected HTTP status: HTTP/2 307 (Redirect to /login) or HTTP/2 200
```
