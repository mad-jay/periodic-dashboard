# PeopleTable — 3D Google Sheets Dashboard

A Vite + Three.js/CSS3D implementation of the supplied assignment. It loads the supplied 200-person CSV as a local preview and can switch to live Google Sheets data after Google OAuth is configured.

## Included requirements
- Google sign-in button (Google Identity Services OAuth 2.0).
- Reads `Sheet1!A1:F201` from the configured Google Sheet using Sheets API.
- 200 supplied records rendered as CSS3D tiles with photo, name, age, country, interest and net worth.
- Net-worth colors: red below $100,000; orange from $100,000 through $200,000; green above $200,000.
- Four animated layouts: 20 × 10 Table, Sphere, double Helix, and 10 × 4 × 5 Grid (same 5 × 4 × 10 dimensions, with x/y/z axes arranged for display).
- Search, record detail panel, drag rotation and zoom.

## Run locally
1. Install Node.js 20+.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and fill in Google settings (steps below).
4. Run `npm run dev` and open the local URL printed by Vite.

The app still runs in sample-data mode if Google credentials are not configured.

## Google Cloud / Sheets setup (required for live login)
1. Create a Google Cloud project.
2. Enable **Google Sheets API**.
3. Configure the OAuth consent screen (External for a personal test; add your account as a test user if the app is in Testing).
4. Create an **OAuth Client ID** of type **Web application**. Add your local Vite origin (for example `http://localhost:5173`) to Authorized JavaScript origins. Add your deployed site origin after deployment.
5. Create an API key and restrict it to the Google Sheets API. Add HTTP referrer restrictions for your local and deployed origins.
6. Create a Google Sheet by importing `public/Data Template.csv`. Keep the first worksheet named `Sheet1` (or update `RANGE` in `src/main.js`).
7. Share the Sheet with **lisa@kasatria.com** as requested in the assignment. Do not make the sheet public.
8. Put the OAuth Client ID, API key and Sheet ID in `.env`. Restart Vite.
9. Sign in with an account that has access to the Sheet. The app requests read-only Sheets permission.

## Deploy
Deploy the project to a static host such as Vercel, Netlify or GitHub Pages. For Vercel/Netlify, import this folder/repository, use `npm run build` and output directory `dist`. Add the same three `VITE_...` environment variables in the host dashboard. Add the deployed domain to OAuth authorized JavaScript origins and API-key referrer restrictions, then redeploy.

## Important limitations / handoff
- Google sign-in, Google Sheet creation/sharing, Cloud project creation and public deployment require access to your Google account / Cloud project / hosting account. This project supplies the integration and exact setup steps, but those account actions have not been performed.
- The OAuth flow is client-side for a read-only assignment demo. Do not put service-account private keys or other secrets in frontend environment variables.
- The assignment PDF specifies the 20 × 10 Table and 5 × 4 × 10 Grid and a double Helix. The Table is laid out in row-major order from the supplied CSV; no chemical periodic-table grouping is inferred from the people data.
