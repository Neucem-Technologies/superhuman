# Connectors

All 13 feeds are in the Connectors panel. Connect is mock until you fill `.env.example`.
The panel stays simple — name, on/off, Connect / Sync / Disconnect. Keys are not collected in the app.

Copy `.env.example` to `.env` when you go live. Values are server-side (no `VITE_` prefix).

| Connector | Lands in |
| --- | --- |
| Google (Gmail, Calendar, Contacts) | Work |
| WhatsApp | Work · Notes |
| Apple Health | Health |
| UltraHuman | Health |
| MakeMyTrip | Travel |
| Airbnb | Travel |
| Bank / UPI | Finance |
| GST / invoices | Businesses |
| YouTube | Growth · Enjoy |
| Spotify | Growth · Enjoy |
| Amazon | Shopping |
| BigBasket | Shopping |
| Google Drive | Files |

Sign-in (Google, X, email/password) stays on the auth stack — not this catalog.
When a connector is on, it only writes into its tab. Contributors never see each other.
