# Architecture Documentation — Tapestry AI

This document provides a comprehensive overview of the client-side and simulated backend architecture of the Tapestry AI Civic Intelligence Platform.

---

## 1. Architectural Overview

Tapestry AI is designed as a single-page-feel multi-page application (MPA). It runs entirely in the client browser using a decoupled data-access abstraction layer (`TapestryAPI`). This layer simulates a full-stack REST API and database using browser-native technologies:

*   **UI / Presentation Layer**: HTML5, Vanilla CSS (`theme.css`), browser-compiled Tailwind CSS, and Chart.js for data visualization.
*   **Abstraction Layer (`TapestryAPI`)**: A unified JavaScript interface that exposes authentication, issue reporting, tracking, mapping, and admin controls.
*   **Cryptography / Security Simulation**: W3C SubtleCrypto API running PBKDF2 for password hashing and HMAC-SHA256 for JSON Web Token (JWT) signatures.
*   **Persistence Layer**: Browser `localStorage` acting as a document-store database (collections for users, issues, updates, and active sessions).

This decoupled architecture ensures that the presentation layer is completely agnostic of the underlying data source. Transitioning to a real server-backed infrastructure requires zero changes to the UI pages; only the implementation details inside the `TapestryAPI` wrapper need to be refactored to make network requests.

```mermaid
graph TD
    UI[HTML5 / CSS / Tailwind / Chart.js] -->|Method Calls| API[TapestryAPI Layer js/store.js]
    API -->|Auth / Hashing / JWT| Crypto[SubtleCrypto API]
    API -->|Persistence / Read / Write| LS[localStorage "MongoDB"]
    
    subgraph Client Browser
        UI
        API
        Crypto
        LS
    end
```

---

## 2. Folder Structure

The codebase is organized cleanly into functional directories, separating assets, styles, scripts, and pages:

```
tapestry-ai-civic-intelligence (1)/
├── css/
│   └── theme.css              # Global styles, variables, transitions, and component utility styles
├── images/
│   ├── 3f6314a7-...png        # Before-repair reference image (seeded)
│   └── 7c24d362-...png        # After-repair reference image (seeded)
├── js/
│   ├── app.js                 # Shared UI logic (mobile nav, scroll reveal, counters, loaders)
│   └── store.js               # Client-side API simulation, crypto functions, and localStorage database
├── pages/
│   ├── index.html             # Landing Page (scroll-driven city transformation)
│   ├── admin/
│   │   └── index.html         # Admin Dashboard (AI-ranked priority queue)
│   ├── analytics/
│   │   └── index.html         # Analytics Dashboard (Chart.js metrics and ML predictive heatmaps)
│   ├── auth/
│   │   └── index.html         # Authentication (Sign in / Registration, role management)
│   ├── dashboard/
│   │   └── index.html         # Citizen Dashboard (Report summary, notifications, activity)
│   ├── manage/
│   │   └── index.html         # Issue Management (Status update, contractor assignment, AI verification)
│   ├── map/
│   │   └── index.html         # Interactive GIS Map (Custom SVG grid, filtering, heatmaps)
│   ├── profile/
│   │   └── index.html         # Profile & Reputation (Achievements, badges, ward leaderboards)
│   ├── report/
│   │   └── index.html         # Report Issue (Image upload, mock TF/OpenCV triage, cost estimation)
│   └── tracking/
│       └── index.html         # Issue Tracking (Timeline, detail pane, public ledger history)
```

---

## 3. Technology Stack

### Frontend Core
*   **HTML5**: Semantic document structures.
*   **CSS3**: Custom design tokens, HSL-based color variables, custom animations, glassmorphism filters, and responsive layout grids.
*   **Tailwind CSS (Runtime)**: In-browser Tailwind engine (`tailwind-browser-4.1.13`) utilized for rapid layout tweaks and utility styling.
*   **Chart.js**: Client-side canvas charting library (`chart.umd.min.js`) for rendering analytics, trends, and department metrics.

### Client-Side Utilities
*   **IntersectionObserver API**: Utilized in `js/app.js` for scroll-driven animations (lazy element fade-in and high-performance numeric count-up indicators).
*   **SVG (Scalable Vector Graphics)**: Custom vector paths utilized in the Interactive Map page to represent roads, intersections, and coordinates without heavy external GIS dependencies.

### Security and Storage
*   **Web Cryptography API (SubtleCrypto)**: Provides low-level, high-performance cryptographic primitives.
*   **Web Storage API (localStorage)**: Provides up to 5MB of synchronous key-value storage across page reloads.

---

## 4. Component-Level Breakdown

### 4.1 Landing Page (`pages/index.html`)
*   **Functionality**: Introduces the Tapestry AI value proposition. Exposes public statistics (resolved issues, response times) and features the "Scroll to Rebuild" transformation showcase.
*   **Key Interaction**: Scroll-driven visual transformation. A scroll event listener monitors the bounding box of the city image, applying dynamic CSS transitions (`scale`, `translateX`, `brightness`, `saturate`) to simulate a transition from a polluted/damaged city to a green/repaired smart city.

### 4.2 Authentication (`pages/auth/index.html`)
*   **Functionality**: Handles registration and login. Restricts access to user roles: Citizen, Contractor, and Admin.
*   **Key Interaction**: Asynchronous form submission. Registration executes PBKDF2 key derivation in-browser to hash passwords securely before database persistence. On success, it issues a signed JWT token and redirects to the appropriate dashboard.

### 4.3 Citizen Dashboard (`pages/dashboard/index.html`)
*   **Functionality**: The personalized portal for citizens. Displays individual metrics (my reports, resolved, active, reputation points), recent submissions, and community notifications.
*   **Key Interaction**: Fetches stats and issues filtered by the logged-in user. Renders an active notifications panel (e.g., contractor assignments and reputation awards) and displays a line chart of ward resolutions.

### 4.4 Report Issue (`pages/report/index.html`)
*   **Functionality**: The core intake mechanism. Allows citizens to upload image evidence, fill in details, select categories, and capture GPS coordinates.
*   **Key Interaction**:
    *   **Image Processing**: Converts uploaded files to base64 data URLs via `FileReader` and validates file types and sizes.
    *   **AI Vision Simulation**: On upload, trigger a simulated TensorFlow/OpenCV vision pipeline. Based on the selected category, the UI applies heuristic rules to generate a confidence score, a detailed visual explanation, a severity level, and a cost estimation (labor, materials, duration).
    *   **Duplicate Detection**: Compares the category of the new report against existing database records to alert the user of potential duplicates in the vicinity, offering an option to merge.

### 4.5 Issue Tracking (`pages/tracking/index.html`)
*   **Functionality**: Provides public transparency on reported issues.
*   **Key Interaction**: Left-pane list of submitted issues with horizontal progress bars. Selecting an issue renders a detailed timeline in the right pane, displaying dates, comments, contractor details, and the immutable ledger history (simulated block hashes). Allows citizens to trigger the `Verify` action once a contractor marks an issue as resolved.

### 4.6 Interactive Map (`pages/map/index.html`)
*   **Functionality**: GIS mapping interface.
*   **Key Interaction**:
    *   **SVG Mapping Grid**: Uses pre-defined paths representing roads. Issue coordinates are mapped onto the SVG coordinate space by hashing their unique database IDs to ensure consistent, stable positioning.
    *   **Interactive Tooltips**: Hovering over marker dots displays a tooltip card containing the issue name, category, and priority score.
    *   **Filters and Overlays**: Toggles severity filters, heatmaps (fuzzy radial blur overlays), and predictive risk indicators (forecasted failures generated via mock ML model).

### 4.7 Analytics Dashboard (`pages/analytics/index.html`)
*   **Functionality**: Broad infrastructure health overview for municipalities.
*   **Key Interaction**: Renders multiple Chart.js instances displaying multi-dimensional data: reported vs resolved trends, issues by category, cost by department, and ward performance. Features a "Predictive Risk Index" grid representing deterioration forecasts.

### 4.8 Profile & Reputation (`pages/profile/index.html`)
*   **Functionality**: Drives citizen engagement through gamification.
*   **Key Interaction**: Calculates user tiers based on reputation points (e.g., Newcomer, Active Citizen, Civic Guardian, City Champion). Renders unlocked/locked achievement badges and displays a localized ward leaderboard.

### 4.9 Admin Dashboard (`pages/admin/index.html`)
*   **Functionality**: Municipal management operations control center.
*   **Key Interaction**: Renders system-wide metrics and features an AI-ranked priority queue. The priority score (1-100) is calculated dynamically using a weighted formula:
    $$\text{Priority} = (\text{Severity Score} \times 0.6) + (\min(\text{Votes}, 150) / 150 \times 30) + (\min(\text{Age in Days}, 30) / 30 \times 10)$$
    Provides direct links to manage each issue.

### 4.10 Issue Management (`pages/manage/index.html`)
*   **Functionality**: Tool for admins and contractors to execute repair workflows.
*   **Key Interaction**:
    *   **Status Lifecycle Transition**: Admins or contractors can update status (Reported → Verified → Assigned → In progress → Resolved) and assign contractors.
    *   **Ledger Logging**: Any update appends a new block record containing a short hash, timestamp, and status.
    *   **AI Repair Verification**: Simulates before/after image comparison with completion scores, quality ratings, and a PASS/FAIL verdict to prevent fraud.

---

## 5. Security & Persistence Architecture

### 5.1 SubtleCrypto Implementation
Tapestry AI implements strong cryptography natively on the client to simulate secure server operations:
*   **Password Hashing**: Employs PBKDF2 (Password-Based Key Derivation Function 2) using SHA-256 with 100,000 iterations and a random 16-byte salt to derive a 256-bit key. This is stored in the format `salt:derived_key_hex`.
*   **Token Signing (Simulated JWT)**: Employs HMAC-SHA256. A token payload containing user ID, role, name, and issued-at (`iat`) timestamp is encoded in Base64URL, concatenated with a header, and signed using a local secret key. The resulting token format is `header.payload.signature_hex`.

### 5.2 LocalStorage Database Schema
The "database" consists of four JSON arrays stored in `localStorage`:
*   `tap_users`: Accounts data.
*   `tap_issues`: Civic reports data.
*   `tap_updates`: Status transitions and notes (audit trail).
*   `tap_session`: Token and ID of the current active session.
