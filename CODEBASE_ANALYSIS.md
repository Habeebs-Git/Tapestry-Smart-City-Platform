# Codebase Analysis & Technical Audit — Tapestry AI

This document provides a detailed technical audit of the Tapestry AI codebase. It identifies existing bugs, security vulnerabilities, architectural concerns, and performance bottlenecks, offering concrete recommendations for resolution.

---

## 1. Executive Summary

The Tapestry AI codebase is a well-designed, decoupled prototype. It utilizes a clean abstraction layer (`TapestryAPI`) that separates the user interface from data storage. However, because it is currently a client-side mock, it exhibits several critical security, scalability, and performance issues that must be addressed before or during the backend migration.

---

## 2. Codebase Audit Details

### 2.1 Technical Debt

*   **Tailwind Browser-Runtime Compiler**:
    *   *Issue*: Pages load the Tailwind CSS runtime compiler (`tailwind-browser-4.1.13-index.global.min.js`) via CDN. This script parses the DOM on-the-fly to generate utility classes.
    *   *Impact*: Heavy performance penalties, style flashes during page loads, and a large client-side bundle size.
    *   *Recommendation*: Shift to build-time compilation using the Tailwind CSS CLI or a bundler (Vite) during the backend migration.
*   **Inline JavaScript and Script Bloat**:
    *   *Issue*: Business logic, event handlers, mock database connections, and chart configurations are written directly in `<script>` tags inside HTML files.
    *   *Impact*: Violates separation of concerns, complicates testing, and blocks the browser from caching scripts.
    *   *Recommendation*: Extract inline scripts into modular, caching-friendly JavaScript files.
*   **Global Namespace Pollution**:
    *   *Issue*: Several pages define global variables (e.g., `MODE` in `auth/index.html`, `AI` in `report/index.html`, and `issues` in `map/index.html`) outside of modules or scoped IIFEs.
    *   *Impact*: High risk of variable collisions and difficult-to-track side effects.
    *   *Recommendation*: Wrap page-level scripts in standard IIFEs or transition to ES Modules.

---

### 2.2 Bugs & Typos

*   **Severity Color Typo in Issue Management**:
    *   *Location*: `pages/manage/index.html`, Line 105:
        ```javascript
        var sevClass={Low:'sev-med',Medium:'sev-med',High:'sev-high',Critical:'sev-crit'};
        ```
    *   *Bug*: The severity key `Low` is mapped to `'sev-med'` instead of `'sev-low'`.
    *   *Impact*: Low-severity issues incorrectly display as medium-severity (orange/yellow colors) on the management dashboard.
*   **Silent JSON Parse Failures**:
    *   *Location*: `js/store.js`, Line 25:
        ```javascript
        function read(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
        ```
    *   *Bug*: If `localStorage` becomes corrupted, the `catch` block silently returns an empty array `[]` and subsequent writes will overwrite the entire collection.
    *   *Impact*: Complete, irreversible loss of citizen reports and user profiles.
*   **Pseudo-Random Map Positioning (GIS Gap)**:
    *   *Location*: `pages/map/index.html`, Line 94:
        ```javascript
        function hashPos(id,seed){var h=0;for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;return 8+((h>>seed)%84);}
        ```
    *   *Bug*: The interactive map does not use GPS coordinates to render pins. Instead, it hashes the issue ID to generate a pseudo-random grid percentage (x, y).
    *   *Impact*: Pins are scattered randomly across the SVG graphic. If multiple reports share the same location, they appear in different areas of the map.

---

### 2.3 Security Concerns

*   **Client-Side Secret and JWT Forgery**:
    *   *Location*: `js/store.js`, Line 22:
        ```javascript
        var JWT_SECRET = 'tapestry-ai-demo-signing-key';
        ```
    *   *Vulnerability*: The signing key is exposed in plain text to the browser.
    *   *Impact*: Any user can open the browser console, forge a JWT containing administrative claims (e.g., `{ "role": "admin" }`), and bypass front-end role guards.
*   **Unsalted/Plaintext Hashing Pipeline**:
    *   *Location*: `js/store.js`, Line 34-45.
    *   *Vulnerability*: While the application uses PBKDF2, the password salt is stored directly alongside the derived hash key in `localStorage`.
    *   *Impact*: Vulnerable to credential theft if a malicious actor gains physical access to the device or executes an XSS payload.
*   **Absence of Input Sanitization (XSS Vulnerability)**:
    *   *Location*: `pages/tracking/index.html`, Line 109-118:
        ```javascript
        d.innerHTML='<div class="glass" ...>' + i.description + '...';
        ```
    *   *Vulnerability*: While some fields use the `esc()` helper, others write raw inputs directly to `innerHTML`.
    *   *Impact*: If a user submits an issue containing a malicious script payload (e.g., `<script>stealTokens()</script>`), it will execute in the browser of any user or administrator tracking that issue.

---

### 2.4 Missing Validations

*   **No Input Length Limits**:
    *   *Issue*: Issue Title, Description, and User Names have no length validation.
    *   *Impact*: Users can submit multi-megabyte text blocks, causing rendering issues, layout breaks, and memory spikes.
*   **Weak Authentication Rules**:
    *   *Issue*: The registration form only checks if input values exist. It does not validate email formats or password strength.
    *   *Impact*: Allows weak or invalid credentials (e.g., email: `a`, password: `1`), decreasing overall data quality.
*   **Mock GPS Capture**:
    *   *Issue*: The "Locate" button hardcodes coordinates rather than requesting geolocation coordinates via the HTML5 Geolocation API.
    *   *Impact*: Prevents real-world civic tracking.

---

### 2.5 Scalability Issues

*   **LocalStorage Quota Overflow**:
    *   *Issue*: Image uploads are converted to base64 data URLs and written directly to `localStorage`.
    *   *Impact*: Browser `localStorage` has a strict 5MB quota limit. A single high-resolution mobile camera photo can be 3MB to 8MB. Converting these to base64 strings will cause the application to crash on its first or second image upload with a `QuotaExceededError`.
*   **Synchronous Table Scanning**:
    *   *Issue*: Every write or read operation parses and serializes the entire collection array (`JSON.parse` and `JSON.stringify`).
    *   *Impact*: As the number of issues grows past a few hundred, operations will cause noticeable UI freezes (blocking the main thread).

---

### 2.6 Performance Improvements

*   **Static Analytics Disconnect**:
    *   *Issue*: The `pages/analytics/index.html` page uses hardcoded static arrays for its charts and does not hook into `TapestryAPI.getIssues()`.
    *   *Impact*: The dashboard does not reflect real-time data or new submissions, presenting a disconnected user experience.
*   **Redundant Asset Loading**:
    *   *Issue*: Heavy external scripts (Chart.js, Tailwind Compiler, and Google Fonts) are loaded synchronously on page boots, blocking the critical rendering path.
    *   *Impact*: Higher page load latency.

---

## 3. Prioritized Action Plan

| Priority | Issue Type | Description | Remediation Target |
| :--- | :--- | :--- | :--- |
| **P0** | Security / Scalability | Base64 images stored in client `localStorage`. | Migrate uploads to Cloudinary storage; store only HTTPS URLs. |
| **P0** | Security | Exposed `JWT_SECRET` in the browser. | Move signing and verification to Express server using environment variables. |
| **P1** | Bug | Low-severity CSS class typo in Management dashboard. | Correct `Low: 'sev-med'` to `Low: 'sev-low'` in `manage/index.html`. |
| **P1** | Security | Raw HTML injection in description strings (XSS). | Ensure all dynamic DOM injections are sanitized or escape text before appending. |
| **P2** | Performance | Tailwind browser compiler. | Setup build step to compile static CSS assets. |
| **P2** | Scalability | Pseudo-random map rendering and static analytics. | Implement true Leaflet/Google Maps bindings and hook analytics to live database aggregates. |
