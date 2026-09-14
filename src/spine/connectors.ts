import { fetchUltraHuman } from "@/mocks";
import { uid } from "@/lib/utils";
import { at } from "./format";
import type {
  ChatMessage,
  Connector,
  ConnectorId,
  Domain,
  Email,
  HealthStream,
  Note,
  Task,
  Trip,
  Txn,
  VaultFile,
  WaThread,
} from "./types";
import { SELF_ID } from "./types";
import { resolveFolderId } from "./vault";

export type ConnectorNeedKind = "oauth" | "api-key" | "secret" | "account" | "partnership" | "device";

export type ConnectorNeed = {
  name: string;
  kind: ConnectorNeedKind;
  detail: string;
  /** Server env var to fill later. Omit for device/account steps with no secret. */
  env?: string;
};

export type ConnectorGroupId = "work" | "health" | "travel" | "money" | "play" | "shop" | "files" | "notes";

export type ConnectorMeta = {
  id: ConnectorId;
  label: string;
  account: string;
  blurb: string;
  tabs: string;
  group: ConnectorGroupId;
  scopes: string[];
  live: {
    summary: string;
    needs: ConnectorNeed[];
  };
};

export const CONNECTOR_GROUPS: { id: ConnectorGroupId; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "health", label: "Health" },
  { id: "travel", label: "Travel" },
  { id: "money", label: "Money" },
  { id: "play", label: "Enjoy" },
  { id: "shop", label: "Shop" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
];

export const CONNECTOR_CATALOG: ConnectorMeta[] = [
  {
    id: "google",
    label: "Google",
    account: "rajan.malhotra@gmail.com",
    blurb: "Gmail, Calendar, Contacts. Lands in Work.",
    tabs: "Work",
    group: "work",
    scopes: ["Gmail", "Calendar", "Contacts"],
    live: {
      summary: "Google Cloud OAuth app with Gmail, Calendar, and People APIs.",
      needs: [
        { name: "OAuth client ID", kind: "oauth", detail: "Google Cloud → APIs & Services → Credentials.", env: "GOOGLE_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Same OAuth client. Web application type.", env: "GOOGLE_CLIENT_SECRET" },
        { name: "Gmail API", kind: "account", detail: "Enable Gmail API. Scope gmail.readonly." },
        { name: "Calendar API", kind: "account", detail: "Enable Calendar API. Scope calendar.readonly." },
        { name: "People API", kind: "account", detail: "Enable People API. Scope contacts.readonly." },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the sign-in callback for this app.", env: "GOOGLE_REDIRECT_URI" },
      ],
    },
  },
  {
    id: "google-tasks",
    label: "Google Tasks",
    account: "Tasks · Google",
    blurb: "Task lists into Today and Work. Same Cloud project as Google.",
    tabs: "Work",
    group: "work",
    scopes: ["Tasks"],
    live: {
      summary: "Google Tasks API. Reuses the Google OAuth client. Self-serve; add the Tasks API and scope.",
      needs: [
        { name: "Tasks API", kind: "account", detail: "Enable Google Tasks API on the Cloud project." },
        { name: "OAuth client", kind: "oauth", detail: "Reuse GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.", env: "GOOGLE_CLIENT_ID" },
        { name: "Scope", kind: "account", detail: "https://www.googleapis.com/auth/tasks.readonly (or tasks to write back)." },
      ],
    },
  },
  {
    id: "slack",
    label: "Slack",
    account: "Malhotra Media",
    blurb: "Channels and DMs into Work. Hub-and-spoke — they do not see each other.",
    tabs: "Work",
    group: "work",
    scopes: ["Channels", "DMs"],
    live: {
      summary: "Slack app with user token. Create the app, then submit for distribution when you leave the workspace.",
      needs: [
        { name: "Client ID", kind: "oauth", detail: "api.slack.com → Your Apps → OAuth & Permissions.", env: "SLACK_CLIENT_ID" },
        { name: "Client secret", kind: "secret", detail: "Same Slack app. Server-side only.", env: "SLACK_CLIENT_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the Slack app redirect exactly.", env: "SLACK_REDIRECT_URI" },
        { name: "Scopes", kind: "account", detail: "channels:history, groups:history, im:history, users:read — user token, not bot-only." },
      ],
    },
  },
  {
    id: "microsoft",
    label: "Microsoft",
    account: "Outlook · OneDrive · To Do",
    blurb: "Mail, calendar, To Do, OneDrive. Lands in Work and Files.",
    tabs: "Work · Files",
    group: "work",
    scopes: ["Mail", "Calendar", "Tasks", "Files"],
    live: {
      summary: "Microsoft identity platform (Entra ID) + Graph. Self-serve app registration; publisher verification for work tenants.",
      needs: [
        { name: "Application (client) ID", kind: "oauth", detail: "Entra ID → App registrations.", env: "MICROSOFT_CLIENT_ID" },
        { name: "Client secret", kind: "secret", detail: "Certificates & secrets. Server-side only.", env: "MICROSOFT_CLIENT_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Web platform redirect; must match exactly.", env: "MICROSOFT_REDIRECT_URI" },
        { name: "Graph scopes", kind: "account", detail: "Mail.Read, Calendars.Read, Tasks.Read, Files.Read. Delegated, not application." },
      ],
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    account: "+91 98100 11223",
    blurb: "Family and advisor threads. Lands in Work and Notes. Hub-and-spoke — they do not see each other.",
    tabs: "Work · Notes",
    group: "work",
    scopes: ["Chats"],
    live: {
      summary: "Meta Cloud API on a WhatsApp Business number.",
      needs: [
        { name: "Meta app ID", kind: "account", detail: "Meta for Developers app with WhatsApp product.", env: "WHATSAPP_META_APP_ID" },
        { name: "Meta app secret", kind: "secret", detail: "Used to verify webhook signatures.", env: "WHATSAPP_META_APP_SECRET" },
        { name: "Cloud access token", kind: "api-key", detail: "Permanent system-user token, not the 24h test token.", env: "WHATSAPP_ACCESS_TOKEN" },
        { name: "Phone number ID", kind: "account", detail: "The WhatsApp Cloud phone-number id, not the raw +91.", env: "WHATSAPP_PHONE_NUMBER_ID" },
        { name: "Webhook verify token", kind: "secret", detail: "Shared secret you set when registering the webhook.", env: "WHATSAPP_WEBHOOK_VERIFY_TOKEN" },
      ],
    },
  },
  {
    id: "apple-health",
    label: "Apple Health",
    account: "HealthKit · iPhone",
    blurb: "Sleep, HRV, steps, recovery. Lands in Health.",
    tabs: "Health",
    group: "health",
    scopes: ["Workouts", "Vitals", "Sleep"],
    live: {
      summary: "HealthKit on iPhone — there is no web API key.",
      needs: [
        { name: "Apple Developer team", kind: "account", detail: "Paid Apple Developer Program." },
        { name: "HealthKit entitlement", kind: "device", detail: "iOS companion (or export). Browsers cannot read HealthKit." },
        { name: "Usage strings", kind: "account", detail: "NSHealthShareUsageDescription in the iOS Info.plist." },
      ],
    },
  },
  {
    id: "ultrahuman",
    label: "UltraHuman",
    account: "Ring Air · paired",
    blurb: "HRV, glucose, strain, recovery. Lands in Health.",
    tabs: "Health",
    group: "health",
    scopes: ["Ring", "Glucose", "Recovery"],
    live: {
      summary: "UltraHuman partner cloud. Ring must already be paired in their app.",
      needs: [
        { name: "Partner API access", kind: "partnership", detail: "Request developer access from UltraHuman." },
        { name: "API key or OAuth bearer", kind: "api-key", detail: "Issued per environment (sandbox / production).", env: "ULTRAHUMAN_API_KEY" },
        { name: "User link", kind: "oauth", detail: "User authorises LivinSync to read their ring cloud.", env: "ULTRAHUMAN_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Pairs with ULTRAHUMAN_CLIENT_ID. Server-side only.", env: "ULTRAHUMAN_CLIENT_SECRET" },
      ],
    },
  },
  {
    id: "fitbit",
    label: "Fitbit",
    account: "Fitbit · Google",
    blurb: "Steps, sleep, HR. Lands in Health. Works on the web — no HealthKit.",
    tabs: "Health",
    group: "health",
    scopes: ["Activity", "Sleep", "Heart"],
    live: {
      summary: "Fitbit Web API via a Google Cloud OAuth client. Self-serve; production needs a Fitbit app review.",
      needs: [
        { name: "Fitbit app", kind: "account", detail: "dev.fitbit.com → Register an application." },
        { name: "OAuth client ID", kind: "oauth", detail: "Fitbit app OAuth 2.0 client ID.", env: "FITBIT_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Server-side only.", env: "FITBIT_CLIENT_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the Fitbit app callback.", env: "FITBIT_REDIRECT_URI" },
        { name: "Scopes", kind: "account", detail: "activity, sleep, heartrate, profile — personal, not all-users until reviewed." },
      ],
    },
  },
  {
    id: "makemytrip",
    label: "MakeMyTrip",
    account: "rajan@malhotra.media",
    blurb: "Fare watches and hotel holds. Lands in Travel.",
    tabs: "Travel",
    group: "travel",
    scopes: ["Flights", "Hotels"],
    live: {
      summary: "No public consumer API — needs an MMT affiliate or partner contract.",
      needs: [
        { name: "Affiliate / partner ID", kind: "partnership", detail: "Issued by MakeMyTrip partnerships, not self-serve.", env: "MMT_AFFILIATE_ID" },
        { name: "Auth token", kind: "api-key", detail: "Partner feed token for fare watch + hotel holds.", env: "MMT_AUTH_TOKEN" },
      ],
    },
  },
  {
    id: "airbnb",
    label: "Airbnb",
    account: "rajan.malhotra",
    blurb: "Saved stays and host messages. Lands in Travel.",
    tabs: "Travel",
    group: "travel",
    scopes: ["Stays", "Messages"],
    live: {
      summary: "No consumer API key. Partner OAuth, or iCal for calendars.",
      needs: [
        { name: "Airbnb partner OAuth", kind: "partnership", detail: "Official partner program — not the public website login.", env: "AIRBNB_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Pairs with AIRBNB_CLIENT_ID. Server-side only.", env: "AIRBNB_CLIENT_SECRET" },
        { name: "iCal URL (fallback)", kind: "account", detail: "Host/guest calendar export if partner access is delayed.", env: "AIRBNB_ICAL_URL" },
      ],
    },
  },
  {
    id: "bank",
    label: "Bank / UPI",
    account: "HDFC · UPI",
    blurb: "Balances, UPI, bills. Lands in Finance.",
    tabs: "Finance",
    group: "money",
    scopes: ["Balances", "UPI", "Bills"],
    live: {
      summary: "India Account Aggregator to read the bank. UPI pay-in is a separate PSP.",
      needs: [
        { name: "AA FIU registration", kind: "partnership", detail: "Sahamati / RBI Account Aggregator as a Financial Information User." },
        { name: "AA client ID", kind: "oauth", detail: "Issued after FIU onboarding.", env: "AA_CLIENT_ID" },
        { name: "AA client secret", kind: "secret", detail: "Pairs with the client ID. Never ship in the browser.", env: "AA_CLIENT_SECRET" },
        { name: "User consent artefact", kind: "oauth", detail: "Each person must approve the bank link in their AA app." },
        { name: "UPI PSP key id", kind: "api-key", detail: "Razorpay/Cashfree key_id — collect/payout, not personal UPI history.", env: "UPI_KEY_ID" },
        { name: "UPI PSP key secret", kind: "secret", detail: "Pairs with UPI_KEY_ID. Server-side only.", env: "UPI_KEY_SECRET" },
      ],
    },
  },
  {
    id: "gst",
    label: "GST / invoices",
    account: "Malhotra Media · GSTIN",
    blurb: "GSTR, retainers, CPL. Lands in Businesses.",
    tabs: "Businesses",
    group: "money",
    scopes: ["GSTR", "Invoices", "Ads"],
    live: {
      summary: "GSTN through a GSP, plus an invoicing API if you want line items.",
      needs: [
        { name: "GSTIN", kind: "account", detail: "The business GST number LivinSync will file against.", env: "GSTIN" },
        { name: "GSP username", kind: "account", detail: "GST Suvidha Provider login (ClearTax, WhiteBooks, etc.).", env: "GSP_USERNAME" },
        { name: "GSP app key", kind: "api-key", detail: "GSP-issued app key for GSTR pulls.", env: "GSP_APP_KEY" },
        { name: "GSP app secret", kind: "secret", detail: "Pairs with GSP_APP_KEY. Server-side only.", env: "GSP_APP_SECRET" },
        { name: "Books API (optional)", kind: "api-key", detail: "Zoho Books or QuickBooks key if invoices live there, not only GSTN.", env: "BOOKS_API_KEY" },
      ],
    },
  },
  {
    id: "youtube",
    label: "YouTube",
    account: "library · subscribed",
    blurb: "Subscriptions and Watch Later. Lands in Growth and Enjoy.",
    tabs: "Growth · Enjoy",
    group: "play",
    scopes: ["Subscriptions", "Library"],
    live: {
      summary: "YouTube Data API v3. Library needs OAuth, not only an API key.",
      needs: [
        { name: "YouTube Data API", kind: "account", detail: "Enable v3 on the Google Cloud project." },
        { name: "API key", kind: "api-key", detail: "Enough for public search. Not enough for *your* subscriptions.", env: "YOUTUBE_API_KEY" },
        { name: "OAuth client ID", kind: "oauth", detail: "Scopes youtube.readonly. Can reuse GOOGLE_CLIENT_ID.", env: "YOUTUBE_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Pairs with YOUTUBE_CLIENT_ID, or reuse GOOGLE_CLIENT_SECRET.", env: "YOUTUBE_CLIENT_SECRET" },
        { name: "Quota", kind: "account", detail: "Default 10k units/day. Subscriptions sync is expensive." },
      ],
    },
  },
  {
    id: "spotify",
    label: "Spotify",
    account: "library · playlists",
    blurb: "Playlists and saved albums. Lands in Growth and Enjoy.",
    tabs: "Growth · Enjoy",
    group: "play",
    scopes: ["Library", "Playlists"],
    live: {
      summary: "Spotify Developer app with user-library scopes.",
      needs: [
        { name: "Spotify Client ID", kind: "oauth", detail: "Developer Dashboard → app.", env: "SPOTIFY_CLIENT_ID" },
        { name: "Spotify Client Secret", kind: "secret", detail: "Same app. Server-side only.", env: "SPOTIFY_CLIENT_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the Dashboard allow-list exactly.", env: "SPOTIFY_REDIRECT_URI" },
        { name: "Scopes", kind: "account", detail: "user-library-read, playlist-read-private, user-read-recently-played." },
      ],
    },
  },
  {
    id: "amazon",
    label: "Amazon",
    account: "orders · price watch",
    blurb: "Price watch and recent orders. Lands in Shopping.",
    tabs: "Shopping",
    group: "shop",
    scopes: ["Orders", "Prices"],
    live: {
      summary: "Associates PA-API for prices. Order history is seller-only (SP-API).",
      needs: [
        { name: "Associates account", kind: "account", detail: "Amazon Associates — required before PA-API keys." },
        { name: "PA-API access key", kind: "api-key", detail: "Product Advertising API access key.", env: "AMAZON_PAAPI_ACCESS_KEY" },
        { name: "PA-API secret key", kind: "secret", detail: "Pairs with the access key. Server-side only.", env: "AMAZON_PAAPI_SECRET_KEY" },
        { name: "Partner tag", kind: "account", detail: "Associates tracking id (e.g. yourtag-21).", env: "AMAZON_PARTNER_TAG" },
        { name: "SP-API (orders)", kind: "partnership", detail: "Selling Partner API — only if you sell, not for personal purchases." },
      ],
    },
  },
  {
    id: "bigbasket",
    label: "BigBasket",
    account: "grocery · recurring",
    blurb: "Basket and recurring groceries. Lands in Shopping.",
    tabs: "Shopping",
    group: "shop",
    scopes: ["Basket", "Recurring"],
    live: {
      summary: "No public API. Needs a BigBasket B2B / partner feed.",
      needs: [
        { name: "Partner token", kind: "partnership", detail: "Issued by BigBasket commercial, not a self-serve dashboard.", env: "BIGBASKET_PARTNER_TOKEN" },
        { name: "Account email", kind: "account", detail: "The grocery account to attach the feed to.", env: "BIGBASKET_ACCOUNT_EMAIL" },
      ],
    },
  },
  {
    id: "google-drive",
    label: "Google Drive",
    account: "Drive · vault",
    blurb: "Docs and PDFs into the vault. Lands in Files.",
    tabs: "Files",
    group: "files",
    scopes: ["Files", "Folders"],
    live: {
      summary: "Same Google Cloud OAuth as Google, plus Drive API.",
      needs: [
        { name: "Drive API", kind: "account", detail: "Enable Google Drive API on the Cloud project." },
        { name: "OAuth client", kind: "oauth", detail: "Can reuse GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET." },
        { name: "Scope", kind: "account", detail: "drive.readonly (full vault) or drive.file (app-created only).", env: "GOOGLE_DRIVE_SCOPE" },
      ],
    },
  },
  {
    id: "dropbox",
    label: "Dropbox",
    account: "Dropbox · vault",
    blurb: "Files into the vault. Lands in Files.",
    tabs: "Files",
    group: "files",
    scopes: ["Files", "Folders"],
    live: {
      summary: "Dropbox app console. Scoped app, then production status after review.",
      needs: [
        { name: "App key", kind: "oauth", detail: "Dropbox App Console → app key.", env: "DROPBOX_APP_KEY" },
        { name: "App secret", kind: "secret", detail: "Same app. Server-side only.", env: "DROPBOX_APP_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the console allow-list.", env: "DROPBOX_REDIRECT_URI" },
        { name: "Access type", kind: "account", detail: "Scoped app with files.metadata.read and files.content.read." },
      ],
    },
  },
  {
    id: "notion",
    label: "Notion",
    account: "workspace · notes",
    blurb: "Pages into Notes. Public integration — self-serve, then Notion distribution if you leave your workspace.",
    tabs: "Notes",
    group: "notes",
    scopes: ["Pages", "Databases"],
    live: {
      summary: "Notion public integration with OAuth. Start internal, then public for other workspaces.",
      needs: [
        { name: "OAuth client ID", kind: "oauth", detail: "notion.so/my-integrations → Public integration.", env: "NOTION_CLIENT_ID" },
        { name: "OAuth client secret", kind: "secret", detail: "Same integration. Server-side only.", env: "NOTION_CLIENT_SECRET" },
        { name: "Redirect URI", kind: "oauth", detail: "Must match the integration redirect.", env: "NOTION_REDIRECT_URI" },
        { name: "Capabilities", kind: "account", detail: "Read content. User picks which pages to share with LivinSync." },
      ],
    },
  },
];

export function defaultConnectors(): Connector[] {
  const now = Date.now();
  return CONNECTOR_CATALOG.map((c) =>
    c.id === "google" || c.id === "apple-health"
      ? { id: c.id, status: "connected" as const, account: c.account, lastSync: now - 12 * 60_000 }
      : { id: c.id, status: "disconnected" as const },
  );
}

export function mergeConnectors(saved?: Connector[] | null): Connector[] {
  const base = defaultConnectors();
  if (!saved?.length) return base;
  const byId = new Map(saved.map((c) => [c.id, c]));
  return base.map((row) => {
    const prev = byId.get(row.id);
    if (!prev) return row;
    return {
      ...row,
      status: prev.status === "connected" ? "connected" : "disconnected",
      account: prev.account ?? row.account,
      lastSync: prev.lastSync,
    };
  });
}

export function catalogOf(id: string) {
  return CONNECTOR_CATALOG.find((c) => c.id === id);
}

function upsertEmail(list: Email[], item: Email) {
  if (list.some((e) => e.id === item.id)) return list;
  return [item, ...list];
}

function upsertTrip(list: Trip[], item: Trip) {
  const i = list.findIndex((t) => t.id === item.id);
  if (i === -1) return [item, ...list];
  return list.map((t) => (t.id === item.id ? { ...t, ...item } : t));
}

function upsertThread(list: WaThread[], item: WaThread) {
  if (list.some((t) => t.id === item.id)) return list.map((t) => (t.id === item.id ? item : t));
  return [item, ...list];
}

function upsertNote(list: Note[], item: Note) {
  if (list.some((n) => n.id === item.id)) return list;
  return [item, ...list];
}

function upsertFile(list: VaultFile[], item: VaultFile) {
  if (list.some((f) => f.id === item.id)) return list;
  return [item, ...list];
}

function upsertTask(list: Task[], item: Task) {
  if (list.some((t) => t.id === item.id)) return list;
  return [item, ...list];
}

function upsertTxn(list: Txn[], item: Txn) {
  if (list.some((t) => t.id === item.id)) return list;
  return [item, ...list];
}

export function applyConnectorImport(state: Domain, id: ConnectorId, atTs: number): Partial<Domain> {
  if (id === "google") {
    const email: Email = {
      id: "em-gcal",
      from: "calendar-notification@google.com",
      fromName: "Google Calendar",
      subject: "Accepted: Design review · Thursday 11:30",
      preview: "You accepted Design review with Northwind. Meet on Meet.",
      body: "Synced from Google Calendar. Design review Thu 11:30–12:15. Guests: Arjun, Priya (optional).",
      timestamp: atTs - 8 * 60_000,
      unread: true,
      mailbox: "work",
      source: "google",
    };
    const calendar = state.calendar.some((c) => c.id === "cal-gcal")
      ? state.calendar
      : [
          {
            id: "cal-gcal",
            title: "Design review · Northwind",
            start: at(11, 30),
            end: at(12, 15),
            ownerId: SELF_ID,
            kind: "meeting" as const,
            status: "confirmed" as const,
            invitedBy: "google",
            note: "Synced from Google Calendar",
          },
          ...state.calendar,
        ];
    return { emails: upsertEmail(state.emails, email), calendar };
  }

  if (id === "apple-health") {
    const streams: HealthStream[] = state.streams.map((s) =>
      s.source === "apple"
        ? { ...s, steps: s.steps + 40, syncedAt: atTs, recovery: Math.min(99, s.recovery + 1) }
        : s,
    );
    if (!streams.some((s) => s.source === "apple")) {
      streams.unshift({
        source: "apple",
        hrv: 38,
        rhr: 61,
        steps: 6460,
        sleepHours: 5.6,
        stress: 74,
        recovery: 49,
        syncedAt: atTs,
      });
    }
    return { streams };
  }

  if (id === "ultrahuman") {
    const snap = fetchUltraHuman();
    const next: HealthStream = { ...snap, syncedAt: atTs };
    const streams = state.streams.some((s) => s.source === "ultrahuman")
      ? state.streams.map((s) => (s.source === "ultrahuman" ? { ...s, ...next, recovery: Math.min(99, s.recovery + 1) } : s))
      : [next, ...state.streams];
    return { streams };
  }

  if (id === "whatsapp") {
    const threads: WaThread[] = [
      {
        id: "wa-anaya",
        name: "Anaya",
        preview: "School ends 3:40. Can you do pickup if Priya is late?",
        tab: "work",
        timestamp: atTs - 22 * 60_000,
      },
      {
        id: "wa-meera",
        name: "Meera",
        preview: "If HRV stays low Thursday we shorten the block. Confirm in Work.",
        tab: "health",
        timestamp: atTs - 3 * 3600_000,
      },
      {
        id: "wa-priya",
        name: "Priya",
        preview: "Added spinach to groceries. Need oat milk restock.",
        tab: "shopping",
        timestamp: atTs - 5 * 3600_000,
      },
    ];
    let waThreads = state.waThreads ?? [];
    for (const t of threads) waThreads = upsertThread(waThreads, t);
    const note: Note = {
      id: "note-wa-anaya",
      title: "WhatsApp · Anaya pickup",
      body: "School ends 3:40. Pickup if Priya is late. Filed from WhatsApp.",
      createdAt: atTs,
      updatedAt: atTs,
      authorId: SELF_ID,
      shared: true,
      linkedEventIds: [],
    };
    return { waThreads, notes: upsertNote(state.notes, note) };
  }

  if (id === "makemytrip") {
    const trips = state.trips.map((t) =>
      t.id === "trip-blr"
        ? {
            ...t,
            source: "makemytrip" as const,
            rateWatch: {
              current: 6620,
              previous: t.rateWatch?.current ?? 6840,
              label: "MMT · DEL–BLR 16 Sep 6:55",
            },
          }
        : t,
    );
    return { trips };
  }

  if (id === "airbnb") {
    const stay: Trip = {
      id: "trip-airbnb",
      mode: "personal",
      title: "Assagao cottage",
      destination: "Goa",
      vibe: "beach",
      companions: "Anaya",
      season: "October",
      budgetInr: 120000,
      status: "suggested",
      estimateInr: 54000,
      source: "airbnb",
      itinerary: [
        { day: 1, title: "Check-in 3p", detail: "Host Neha. Quiet lane off Mapusa road. Pool." },
        { day: 2, title: "Anjuna morning", detail: "Beach + market. Back by nap time." },
      ],
    };
    return { trips: upsertTrip(state.trips, stay) };
  }

  if (id === "youtube") {
    const msg: ChatMessage = {
      id: "chat-yt",
      role: "bot",
      text: "From your YouTube library — still in Watch Later.",
      timestamp: atTs,
      results: [{ title: "Yoga Nidra — 10 minutes", source: "youtube", meta: "Ally Boothroyd · subscribed" }],
    };
    const chat = state.chat.some((m) => m.id === msg.id) ? state.chat : [msg, ...state.chat];
    const growth = state.growth.map((g) => (g.area.toLowerCase().includes("spirit") ? { ...g, streak: g.streak + 1 } : g));
    return { chat, growth };
  }

  if (id === "spotify") {
    const msg: ChatMessage = {
      id: "chat-sp",
      role: "bot",
      text: "From Spotify — in your library.",
      timestamp: atTs,
      results: [{ title: "Music for Inner Stillness", source: "spotify", meta: "In your library" }],
    };
    const chat = state.chat.some((m) => m.id === msg.id) ? state.chat : [msg, ...state.chat];
    return { chat };
  }

  if (id === "bank") {
    const txn: Txn = {
      id: "tx-upi-sync",
      accountId: "acc-check",
      amountInr: -340,
      merchant: "UPI · Cafe Coffee Day",
      category: "dining",
      timestamp: atTs - 40 * 60_000,
    };
    const accounts = state.accounts.map((a) =>
      a.id === "acc-check" && !state.txns.some((t) => t.id === txn.id)
        ? { ...a, balanceInr: a.balanceInr - 340 }
        : a,
    );
    return { txns: upsertTxn(state.txns, txn), accounts };
  }

  if (id === "gst") {
    const txn: Txn = {
      id: "tx-gst-sync",
      accountId: "acc-media",
      amountInr: -7560,
      merchant: "GST · GSTR-3B",
      category: "tax",
      timestamp: atTs - 2 * 3600_000,
    };
    const businesses = state.businesses.map((b) =>
      b.id === "biz-media"
        ? {
            ...b,
            expensesInr: state.txns.some((t) => t.id === txn.id) ? b.expensesInr : b.expensesInr + 7560,
          }
        : b,
    );
    return { txns: upsertTxn(state.txns, txn), businesses };
  }

  if (id === "amazon") {
    const research = state.research.map((r) =>
      r.id === "res-stereo" ? { ...r, priceInr: 81200, lastPriceInr: r.priceInr } : r,
    );
    return { research };
  }

  if (id === "bigbasket") {
    const lists = state.lists.map((l) => {
      if (l.id !== "list-groc") return l;
      if (l.items.some((i) => i.id === "gi-bb")) return l;
      return {
        ...l,
        items: [...l.items, { id: "gi-bb", name: "Almonds", qty: "500 g", ownerId: SELF_ID, checked: false, fromProtocol: true }],
      };
    });
    return { lists };
  }

  if (id === "google-drive") {
    const resolved = resolveFolderId(state.folders ?? [], "files", "Work");
    const file: VaultFile = {
      id: "vf-drive",
      name: "Northwind-brief.gdoc",
      mime: "application/vnd.google-apps.document",
      size: 18432,
      folderId: resolved.folderId,
      createdAt: atTs,
      textExcerpt: "Northwind Q3 brief. Synced from Drive. Deep work Thursday still holds.",
      sourceTab: "work",
    };
    return { folders: resolved.folders, files: upsertFile(state.files ?? [], file) };
  }

  if (id === "google-tasks") {
    const task: Task = {
      id: "task-gtasks",
      title: "Confirm Northwind deck owner",
      done: false,
      ownerId: SELF_ID,
      createdBy: SELF_ID,
      priority: 1,
      tiny: true,
      due: at(16, 0),
    };
    return { tasks: upsertTask(state.tasks, task) };
  }

  if (id === "slack") {
    const thread: WaThread = {
      id: "wa-slack",
      name: "Slack · #studio",
      preview: "Arjun: Northwind mix is in the thread. Need a yes by 4.",
      tab: "work",
      timestamp: atTs - 18 * 60_000,
    };
    return { waThreads: upsertThread(state.waThreads ?? [], thread) };
  }

  if (id === "microsoft") {
    const email: Email = {
      id: "em-msft",
      from: "arjun@malhotramedia.in",
      fromName: "Arjun Khanna",
      subject: "Outlook · vendor hold",
      preview: "Moved the Northwind hold to 2:15. Synced from Outlook.",
      body: "Synced from Microsoft Outlook. Vendor hold 14:15–15:00 IST.",
      timestamp: atTs - 11 * 60_000,
      unread: true,
      mailbox: "work",
    };
    const calendar = state.calendar.some((c) => c.id === "cal-msft")
      ? state.calendar
      : [
          {
            id: "cal-msft",
            title: "Vendor hold · Outlook",
            start: at(14, 15),
            end: at(15, 0),
            ownerId: SELF_ID,
            kind: "meeting" as const,
            status: "confirmed" as const,
            invitedBy: "microsoft",
            note: "Synced from Outlook",
          },
          ...state.calendar,
        ];
    const task: Task = {
      id: "task-msft",
      title: "To Do · send Northwind recap",
      done: false,
      ownerId: SELF_ID,
      createdBy: SELF_ID,
      priority: 2,
    };
    const resolved = resolveFolderId(state.folders ?? [], "files", "Work");
    const file: VaultFile = {
      id: "vf-onedrive",
      name: "Q3-narrative.docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 48200,
      folderId: resolved.folderId,
      createdAt: atTs,
      textExcerpt: "Q3 narrative. Synced from OneDrive.",
      sourceTab: "work",
    };
    return {
      emails: upsertEmail(state.emails, email),
      calendar,
      tasks: upsertTask(state.tasks, task),
      folders: resolved.folders,
      files: upsertFile(state.files ?? [], file),
    };
  }

  if (id === "fitbit") {
    const next: HealthStream = {
      source: "fitbit",
      hrv: 41,
      rhr: 59,
      steps: 8120,
      sleepHours: 6.1,
      stress: 62,
      recovery: 58,
      syncedAt: atTs,
    };
    const streams = state.streams.some((s) => s.source === "fitbit")
      ? state.streams.map((s) => (s.source === "fitbit" ? { ...s, ...next, steps: s.steps + 30 } : s))
      : [next, ...state.streams];
    return { streams };
  }

  if (id === "dropbox") {
    const resolved = resolveFolderId(state.folders ?? [], "files", "Work");
    const file: VaultFile = {
      id: "vf-dropbox",
      name: "Board-pack.pdf",
      mime: "application/pdf",
      size: 240128,
      folderId: resolved.folderId,
      createdAt: atTs,
      textExcerpt: "Board pack. Synced from Dropbox.",
      sourceTab: "work",
    };
    return { folders: resolved.folders, files: upsertFile(state.files ?? [], file) };
  }

  if (id === "notion") {
    const note: Note = {
      id: "note-notion",
      title: "Notion · weekly OS",
      body: "From Notion: keep Friday deep work. Ferritin follow-up still open with Dr Shah.",
      createdAt: atTs,
      updatedAt: atTs,
      authorId: SELF_ID,
      shared: false,
      linkedEventIds: [],
    };
    return { notes: upsertNote(state.notes, note) };
  }

  return {};
}
