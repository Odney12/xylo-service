# Multi-Tenant AI Lead Automation for Gyms

A production WhatsApp AI assistant that automatically qualifies, nurtures, and tracks gym leads in real time — built as a multi-tenant SaaS platform so a single deployment serves many gym clients, each with their own WhatsApp number, business data, and isolated lead pipeline.

Built end-to-end on Cloudflare's edge platform: Workers, D1 (serverless SQLite), and a React dashboard served from the same deployment.

## What it does

A lead texts a gym's WhatsApp number → Meta delivers the message to a single shared Worker → the Worker identifies which gym it belongs to, verifies the request is genuinely from Meta (per-gym HMAC signature verification), and asks Gemini to generate a reply grounded in that gym's real, live pricing/offers/class schedule — not static text. Gemini also classifies the lead's pipeline stage (`New → Pass Claimed → Tour Booked`) and extracts their fitness goal, all in a single structured JSON call. A human can take over any conversation at any time from the dashboard, pausing the bot instantly.

## Architecture

- **Backend:** Cloudflare Workers (Hono.js), TypeScript
- **Database:** Cloudflare D1 (serverless SQLite), one schema serving every tenant
- **AI:** Google Gemini, structured JSON output (single call returns reply + pipeline stage + extracted goal)
- **Messaging:** Meta WhatsApp Cloud API — one Meta App per gym client, isolating risk between tenants
- **Auth:** Hand-rolled session auth using the Web Crypto API (PBKDF2 password hashing, no external auth library)
- **Frontend:** React + Tailwind CSS, served as static assets from the same Worker (no separate hosting, no CORS)

## Key engineering decisions

- **One Meta App per gym** instead of a single shared app, avoiding Meta's lengthy Tech Provider review process and isolating one gym's account issues from affecting others
- **Per-gym HMAC signature verification** on every inbound webhook, using a dynamically looked-up secret per tenant
- **Structured LLM output** (`responseMimeType: application/json`) instead of parsing free text, with exponential backoff for API rate limits
- **Async webhook handling** via `executionCtx.waitUntil()` to acknowledge Meta's webhook within its 5-second timeout while the AI/database work continues in the background
- **Role-based multi-tenant dashboard** — a single React app serves both the agency (sees all gyms) and individual gym owners (see only their own data), enforced at the API layer

## Status

Deployed and tested against real WhatsApp traffic for a pilot gym client. Dashboard, auth, and lead management are functional; payment/subscription handling is in progress.
