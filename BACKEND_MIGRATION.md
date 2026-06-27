# Backend Migration Plan — Tapestry AI

This document details the blueprint for migrating the Tapestry AI Civic Intelligence Platform from its client-only, `localStorage`-backed architecture to a production-ready, full-stack implementation using Node.js/Express, MongoDB, and Cloudinary.

---

## 1. Current Architecture vs. Target Architecture

```
Current (Client-Only):
[UI Pages] <---> [TapestryAPI (js/store.js)] <---> [SubtleCrypto & localStorage]

Target (Full-Stack):
[UI Pages] <---> [TapestryAPI (HTTP Client)] <---> [Express Server (Node.js)] <---> [MongoDB Atlas]
                                                                        <---> [Cloudinary API]
```

### Key Differences:
1.  **Authentication**: Currently, passwords are hashed in-browser via PBKDF2 and signed using a client-side HMAC secret. Post-migration, authentication will occur on the server via `bcrypt` (password hashing) and signed JWT tokens with a server-only environment variable secret.
2.  **Storage**: Currently, all collections (`users`, `issues`, `updates`) are serialized as JSON strings in the browser's `localStorage`. Post-migration, they will be stored in a remote MongoDB Atlas database.
3.  **Image Uploads**: Currently, files are read as base64 data URLs via `FileReader` and stored directly in the issue document inside `localStorage`. Post-migration, files will be POSTed to the server, uploaded to Cloudinary, and only the secure HTTPS image URL will be saved to MongoDB.

---

## 2. Current Folder Structure and Target Changes

The current codebase is structure-clean. The migration will preserve all existing UI pages and styles, introducing a new backend subdirectory (`/server` or `/backend`) to isolate server-side logic:

```
tapestry-ai-civic-intelligence (1)/
├── css/
│   └── theme.css
├── images/
├── js/
│   ├── app.js
│   └── store.js              # <--- Will be refactored to make fetch() calls
├── pages/                    # <--- Unchanged (preserves UI/layouts)
└── server/                   # <--- NEW BACKEND DIRECTORY
    ├── config/               # DB and Cloudinary connections
    ├── middleware/           # Auth and role guards
    ├── models/               # Mongoose schemas (User, Issue, Update)
    ├── routes/               # Express endpoints
    ├── .env                  # Server secrets (JWT_SECRET, MONGO_URI, CLOUDINARY_URL)
    ├── package.json          # Server dependencies
    └── server.js             # Express application entrypoint
```

---

## 3. TapestryAPI Methods Specification

Below is the precise mapping of every frontend-facing `TapestryAPI` method to its corresponding REST API call:

| Method Name | Parameters | Action / Behavior | Target REST Endpoint | HTTP Method |
| :--- | :--- | :--- | :--- | :--- |
| `register` | `(data)` | Validates inputs, checks for existing user, creates user record, starts session. | `/api/auth/register` | `POST` |
| `login` | `(data)` | Validates email, verifies password hash, starts session. | `/api/auth/login` | `POST` |
| `logout` | `()` | Destroys client-side token and clears authorization headers. | `/api/auth/logout` | `POST` |
| `currentUser` | `()` | Decodes JWT token and retrieves current user profile. | `/api/auth/me` | `GET` |
| `requireAuth` | `(roles)` | Route guard that checks current session and active user roles. | *Client-side local check* | — |
| `uploadImage` | `(file)` | Sends image file to server, uploads to Cloudinary, returns secure URL. | `/api/upload` | `POST` (Multipart) |
| `createIssue` | `(data)` | Saves a new issue, triggers ledger update, rewards reputation points. | `/api/issues` | `POST` |
| `getIssues` | `(opts)` | Retrieves issues list (supports filtering by logged-in user: `opts.mine`). | `/api/issues` | `GET` |
| `getIssue` | `(id)` | Retrieves detailed record for a specific issue by its ID. | `/api/issues/:id` | `GET` |
| `updateIssue`| `(id, changes)`| Updates issue properties and appends status updates to the ledger. | `/api/issues/:id` | `PUT` |
| `getUpdates` | `(issueId)` | Retrieves the timeline audit trail of status changes for an issue. | `/api/issues/:id/updates` | `GET` |
| `dashboardStats`| `(opts)`| Aggregates issue counts (total, open, resolved, critical, in-progress). | `/api/dashboard/stats` | `GET` |

---

## 4. Database Schemas Mapping (Mongoose / MongoDB)

The `localStorage` arrays must be converted to structured MongoDB collections using Mongoose schemas:

### 4.1 Users Collection (`tap_users`)

```javascript
// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // Store bcrypt hash, never plain text
  role: { type: String, enum: ['citizen', 'contractor', 'admin'], default: 'citizen' },
  reputation: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
```

### 4.2 Issues Collection (`tap_issues`)

```javascript
// server/models/Issue.js
const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { 
    type: String, 
    enum: ['Potholes', 'Garbage', 'Water Leakage', 'Broken Streetlights', 'Drainage Issues', 'Damaged Sidewalks', 'Road Cracks', 'Public Safety Hazards', 'Other'], 
    default: 'Other' 
  },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  imageUrl: { type: String, default: '' }, // Stores secure Cloudinary URL (HTTPS)
  location: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Reported', 'Verified', 'Assigned', 'In progress', 'Resolved'], 
    default: 'Reported' 
  },
  estimatedCost: { type: Number, default: null },
  assignee: { type: String, default: '' }, // Contractor name or ID
  votes: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Issue', IssueSchema);
```

### 4.3 Updates / Audit Ledger Collection (`tap_updates`)

```javascript
// server/models/Update.js
const mongoose = require('mongoose');

const UpdateSchema = new mongoose.Schema({
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  status: { type: String, required: true },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Update', UpdateSchema);
```

---

## 5. LocalStorage Structure Mapping

During authentication, the server will return a signed JWT token and user metadata. The client-side will store this token in `localStorage` to maintain sessions:

```json
// Key: tap_session
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdh...",
  "userId": "607a7e8f1c8a4c2b98e723cd"
}
```

Every subsequent API call from the browser will read `tap_session.token` and include it in the request headers:
`Authorization: Bearer <token>`

---

## 6. Express Endpoint Mapping

The Node.js/Express server must expose the following RESTful API:

### 6.1 Authentication Routes
*   `POST /api/auth/register`:
    *   Accepts: `{ name, email, password, role }`
    *   Action: Checks if email is registered. Hashes password using `bcrypt` (salt rounds = 10). Saves new `User` document. Generates and signs a JWT. Returns the token and sanitized user object.
*   `POST /api/auth/login`:
    *   Accepts: `{ email, password }`
    *   Action: Searches for user by email. Compares input password with stored hash via `bcrypt.compare()`. Generates JWT. Returns token and sanitized user object.
*   `GET /api/auth/me` (Protected):
    *   Action: Reads JWT from authorization header, decodes user ID, retrieves `User` profile from database, and returns it.

### 6.2 Image Upload Route
*   `POST /api/upload` (Protected):
    *   Accepts: Multipart file upload (`file`).
    *   Action: Employs `multer` to capture file stream, streams it directly to Cloudinary via `cloudinary.v2.uploader.upload_stream`. Returns the secure HTTPS URL (`secure_url`).

### 6.3 Issue and Ledger Routes
*   `POST /api/issues` (Protected):
    *   Accepts: `{ title, description, category, severity, imageUrl, location, estimatedCost }`
    *   Action: Saves `Issue` record. Appends a status log in `Update` collection (ledger). Increments creator's reputation points by 50. Returns the new issue.
*   `GET /api/issues` (Protected):
    *   Query Params: `?mine=true` (optional)
    *   Action: If `mine` is true, returns issues where `createdBy` matches the authenticated user ID. Otherwise, returns all issues.
*   `GET /api/issues/:id` (Protected):
    *   Action: Retrieves a single issue by ID, or returns a 404 error if not found.
*   `PUT /api/issues/:id` (Protected):
    *   Accepts: `{ status, assignee, notes }`
    *   Action: Updates the `Issue` document. If status changes or assignees/notes are provided, creates a corresponding record in the `Update` collection. Returns the updated issue.
*   `GET /api/issues/:id/updates` (Protected):
    *   Action: Returns all status updates for the specified issue, sorted chronologically.

### 6.4 Analytics Route
*   `GET /api/dashboard/stats` (Protected):
    *   Query Params: `?mine=true` (optional)
    *   Action: Executes MongoDB aggregation pipeline to count total, open, resolved, critical, and in-progress issues.

---

## 7. Cloudinary Integration Mapping

The image upload flow shifts from browser base64 rendering to secure cloud hosting:

1.  **Frontend Form**: The user selects a photo on the `/report` page.
2.  **Upload Request**: `TapestryAPI.uploadImage(file)` creates a `FormData` object, appends the raw file, and executes a `POST` request to `/api/upload` containing the JWT token.
3.  **Server Triage**:
    *   The `/api/upload` route uses the `multer` middleware to parse the file payload.
    *   The route handler instantiates a Cloudinary stream upload:
        ```javascript
        const cloudinary = require('cloudinary').v2;
        const streamifier = require('streamifier');

        let stream = cloudinary.uploader.upload_stream(
          { folder: "tapestry_issues" },
          (error, result) => {
            if (error) return res.status(500).json({ error: "Cloudinary upload failed" });
            res.json({ imageUrl: result.secure_url });
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
        ```
4.  **Database Storage**: The server responds with the secure HTTPS URL, which the client submits in the final issue creation request.

---

## 8. Files That Need Modification

The migration strategy is highly non-intrusive. Only one core file needs modification on the frontend:

### 1. `js/store.js`
*   **Modifications**:
    *   Remove local collections definition (`K`), PBKDF2 functions, and HMAC JWT signing code.
    *   Refactor every method in the `TapestryAPI` object to make asynchronous `fetch()` calls to the Express backend.
    *   Ensure that the return formats of the new network-based methods exactly match the original structure, preventing breaking changes in UI bindings.
    *   Incorporate authorization headers into fetch requests:
        ```javascript
        const session = JSON.parse(localStorage.getItem('tap_session') || '{}');
        const headers = {
          'Content-Type': 'application/json',
          ...(session.token ? { 'Authorization': `Bearer ${session.token}` } : {})
        };
        ```

---

## 9. Step-by-Step Migration Process

Follow this execution plan to move the project to a full-stack configuration:

### Phase 1: Environment & Server Setup
1.  Initialize Node.js in a new `/server` directory: `npm init -y`.
2.  Install required dependencies:
    `npm install express mongoose dotenv cors jsonwebtoken bcryptjs multer cloudinary streamifier`
3.  Install dev dependencies: `npm install --save-dev nodemon`.
4.  Create `server.js` and configure the core Express server, CORS middleware, JSON parsers, and error handling.
5.  Create a `.env` file to securely store environmental configuration:
    ```
    PORT=5000
    MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/tapestry
    JWT_SECRET=your_strong_jwt_private_secret_key
    CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
    ```

### Phase 2: Database Modeling & Middleware
1.  Define the Mongoose models in `server/models/` (`User.js`, `Issue.js`, `Update.js`).
2.  Implement authentication middleware in `server/middleware/auth.js` to extract, decode, and verify JWT tokens.
3.  Implement role-based authorization middleware:
    ```javascript
    const authorize = (roles = []) => {
      return (req, res, next) => {
        if (roles.length && !roles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      };
    };
    ```

### Phase 3: Route Handlers & Cloud Integrations
1.  Build auth route handlers in `server/routes/auth.js` (Register, Login, Me).
2.  Build issue route handlers in `server/routes/issues.js` (Create, List, Get, Update, Updates timeline).
3.  Configure `multer` and Cloudinary upload streams in `server/routes/upload.js`.
4.  Wire all route groups into `server.js`.

### Phase 4: Frontend API Store Refactor
1.  Replace client-side database/cryptography implementations in `js/store.js` with corresponding `fetch()` requests.
2.  Maintain local session persistence (`tap_session`) on login/register to store JWT tokens in `localStorage`.
3.  Add an interceptor logic to redirect users to `/auth` if a network request returns a 401 Unauthorized status.

### Phase 5: Verification & Seeding
1.  Implement a seed endpoint `/api/admin/seed` or a script that populates MongoDB Atlas with realistic starting records on first run.
2.  Run the server locally (`npm run dev`) and test the end-to-end user flows (Register, Report Issue, View Map, Update status as Admin) using a local browser dev server.
