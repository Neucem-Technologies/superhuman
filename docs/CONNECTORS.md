# Connectors

All 19 feeds are in the Connectors panel. Connect is mock until you paste keys in `secrets/.env`.
The panel stays simple — name, on/off, Connect / Sync / Disconnect. Keys are not collected in the app.

Paste values in **`secrets/.env`** (gitignored). Copy from `secrets/.env.example` or the root `.env.example`. Server-side only — no `VITE_` prefix.

| Connector | Lands in | Approval path |
| --- | --- | --- |
| Google (Gmail, Calendar, Contacts) | Work | Google Cloud OAuth + restricted-scope verification |
| Google Tasks | Work | Same Cloud project, Tasks API |
| Slack | Work | Slack app, then distribution review |
| Microsoft (Outlook, To Do, OneDrive) | Work · Files | Entra ID app + publisher verification |
| WhatsApp | Work · Notes | Meta Business + Cloud API |
| Apple Health | Health | HealthKit on iPhone (no web key) |
| UltraHuman | Health | Partner cloud |
| Fitbit | Health | Fitbit Web API + app review |
| MakeMyTrip | Travel | Affiliate / partner contract |
| Airbnb | Travel | Partner OAuth or iCal |
| Bank / UPI | Finance | AA FIU + PSP |
| GST / invoices | Businesses | GSP |
| YouTube | Growth · Enjoy | YouTube Data API OAuth |
| Spotify | Growth · Enjoy | Spotify Developer app |
| Amazon | Shopping | Associates PA-API |
| BigBasket | Shopping | Partner feed |
| Google Drive | Files | Same Google OAuth + Drive API |
| Dropbox | Files | Dropbox app console + production review |
| Notion | Notes | Public integration OAuth |

Not listed (no consumer API we can get approved): family live location, Screen Time, IRCTC, Swiggy, Apple Notes / Reminders on the web.

Sign-in (Google, X, email/password) stays on the auth stack — not this catalog.
When a connector is on, it only writes into its tab. Contributors never see each other.
