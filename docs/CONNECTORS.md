# Connectors

Work branch for wiring every Superhuman tab to a mock feed.
No real passwords. Each connector writes into one tab (or two, if the spine already does that).

## Already in the panel

| Connector | Lands in | Status |
| --- | --- | --- |
| Google (Gmail, Calendar, Contacts) | Work | mock, connected in seed |
| Apple Health | Health | mock, connected in seed |
| WhatsApp | Work · Notes | mock, off |
| MakeMyTrip | Travel | mock, off |
| Airbnb | Travel | mock, off |

## Still to add

| Connector | Lands in | Why |
| --- | --- | --- |
| UltraHuman | Health | ring vitals, glucose, strain |
| YouTube | Growth · Enjoy | library / subscriptions |
| Spotify | Growth · Enjoy | library / playlists |
| Bank / UPI (HDFC + UPI) | Finance | balances, UPI, bills |
| GST / invoices | Businesses | retainers, CPL, pots |
| Google Drive | Files | vault folders |
| Amazon / BigBasket | Shopping | lists, price watch |

Sign-in (Google, X, email/password) stays on the auth stack — not this catalog.

When a connector is on, it only writes timeline events for its tab. Contributors never see each other.
