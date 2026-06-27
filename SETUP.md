# Setup Guide — Tapestry AI Full-Stack Platform

This guide explains how to configure, run, and test the Tapestry AI Civic Intelligence Platform locally using the new Node.js/Express, MongoDB Atlas, and Cloudinary backend.

---

## Prerequisites

Before starting, ensure you have the following installed and configured:
1.  **Node.js** (v18.x or later recommended) and **npm** (v9.x or later).
2.  **MongoDB Atlas Database**: A running cloud cluster. (A connection URI is already configured in the default `.env` file).
3.  **Cloudinary Account**: For handling image uploads securely. (Credentials are already configured in the default `.env` file).

---

## Installation & Setup

1.  Navigate into the `server/` directory:
    ```bash
    cd server
    ```
2.  Install all required server-side dependencies:
    ```bash
    npm install
    ```
    This installs the core packages (`express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, `bcryptjs`, `multer`, `cloudinary`) and development utilities (`nodemon`).

---

## Environment Configuration

The server expects a `.env` file located in the `server/` directory. A fully populated `.env` file has been created for you with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://mohammadikhatoon555_db_user:habeebali@cluster0.wlbk8rg.mongodb.net/tapestryAI?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=416ca32e93517d1461798c7de1e294563408afa705f766594ee521e9a3f44eaa
CLOUDINARY_CLOUD_NAME=dr9cc5f9w
CLOUDINARY_API_KEY=897949652997395
CLOUDINARY_API_SECRET=SeWBXJwpHPwdGDtfut-ohz5UIKg
```

---

## Running the Server

Inside the `server/` directory, you can start the application using one of the following commands:

### Development Mode (Recommended)
Starts the server with `nodemon`, which automatically restarts the server when any backend file changes:
```bash
npm run dev
```

### Production Mode
Starts the server normally using Node:
```bash
npm start
```

Once started, you should see logs confirming:
*   `MongoDB Connected: ...` (successful Atlas connection)
*   `Cloudinary SDK configured successfully`
*   `Server running on port 5000`
*   `Access the application at http://localhost:5000`

---

## Accessing the Platform & Seeding

Open your browser and navigate to:
**`http://localhost:5000`**

### Automatic Seeding
On the very first page load in the browser, the frontend client layer will automatically trigger a one-time POST request to `/api/seed`. 
*   If the database has no user records, the backend will automatically seed the database with:
    *   **Admin Account**: `admin@tapestry.ai` (password: `admin123`)
    *   **Contractor Account**: `contractor@tapestry.ai` (password: `work123`)
    *   **Citizen Account**: `citizen@tapestry.ai` (password: `demo123`)
    *   **5 Sample Issues** with realistic locations, severities, estimated costs, and detailed chronological status ledger histories.
*   If the database is already seeded, the request is safely ignored.

---

## Verification & Testing Workflows

To verify that the full-stack integration is working perfectly, try the following manual tests:

1.  **Login & Session**: Go to `http://localhost:5000/auth` and log in with the citizen credentials:
    *   Email: `citizen@tapestry.ai`
    *   Password: `demo123`
    *   Verify you are redirected to the Dashboard and see `Welcome back, Jordan 👋` and your current reputation points.
2.  **Report an Issue (Uploads & Database Writes)**: 
    *   Go to `/report`.
    *   Upload an image file. The page will immediately stream the image to Cloudinary and return a secure HTTPS url, then run the simulated AI analysis.
    *   Click **Submit report**. The issue will be saved in MongoDB, an initial ledger log will be recorded, and you will receive `+50 reputation points` (synced instantly to your session).
    *   You will be redirected to the **Tracking** page.
3.  **Audit Ledger & History**:
    *   On the `/tracking` page, select your newly reported issue.
    *   Verify that the timeline shows the correct history (e.g., `Reported · Issue submitted by Jordan Rivera.`).
4.  **Admin / Contractor Update Workflows**:
    *   Log out, and log back in as the municipal administrator:
        *   Email: `admin@tapestry.ai`
        *   Password: `admin123`
    *   Access the **Admin Dashboard** (`/admin`), click **Manage** on an issue, and change the status (e.g., to `Assigned` or `In progress`) or assign a contractor.
    *   Log back in as the citizen and check the `/tracking` timeline to verify that the updates appear in real-time, matching the MongoDB ledger records.
