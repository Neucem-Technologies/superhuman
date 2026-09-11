export type TabId =
  | "home"
  | "work"
  | "growth"
  | "travel"
  | "health"
  | "entertainment"
  | "shopping"
  | "notes"
  | "files"
  | "finance"
  | "businesses";

export const PRIMARY_TABS: TabId[] = ["home", "work", "health", "finance", "businesses"];
export const SHELF_TABS: TabId[] = ["growth", "travel", "entertainment", "shopping", "notes", "files"];
export const ALL_TABS: TabId[] = [
  "home",
  "work",
  "growth",
  "travel",
  "health",
  "entertainment",
  "shopping",
  "notes",
  "files",
  "finance",
  "businesses",
];

export const TAB_LABELS: Record<TabId, string> = {
  home: "Home",
  work: "Work",
  growth: "Growth",
  travel: "Travel",
  health: "Health",
  entertainment: "Entertainment",
  shopping: "Shopping",
  notes: "Notes",
  files: "Files",
  finance: "Finance",
  businesses: "Businesses",
};

export type CircleId =
  | "self"
  | "family"
  | "coworkers"
  | "friends"
  | "trainers"
  | "doctors"
  | "coaches"
  | "nutritionists"
  | "accountants";
export type Access = "view" | "edit" | "admin";
export type InviteChannel = "whatsapp" | "email";
export type InviteStatus = "pending" | "accepted";

export type TimelineEvent = {
  id: string;
  type: string;
  timestamp: number;
  source_tab: TabId;
  actor_id: string;
  payload: Record<string, unknown>;
  links: string[];
};

export type Person = {
  id: string;
  name: string;
  shortName: string;
  circle: CircleId;
  title: string;
  initials: string;
  email?: string;
  phone?: string;
  inviteStatus?: InviteStatus;
  inviteChannel?: InviteChannel;
  invitedAt?: number;
  scopes?: { tab: TabId; access: Access; healthFilter?: "workout" | "full" }[];
};

export type CalendarItem = {
  id: string;
  title: string;
  start: number;
  end: number;
  ownerId: string;
  kind: "focus" | "meeting" | "personal" | "health" | "travel" | "workout";
  status: "confirmed" | "pending" | "declined";
  invitedBy?: string;
  deepWork?: boolean;
  shortened?: boolean;
  lightened?: boolean;
  note?: string;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  ownerId: string;
  createdBy: string;
  priority: number;
  tiny?: boolean;
  due?: number;
};

export type Email = {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: number;
  unread: boolean;
  mailbox: "work" | "personal";
  source?: "google";
};

export type Reminder = {
  id: string;
  title: string;
  when: number;
  ownerId: string;
  createdBy: string;
  fired: boolean;
};

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  tab: TabId;
  action?: { label: string; eventType: string; payload: Record<string, unknown> };
};

export type Suggestion = {
  id: string;
  title: string;
  body: string;
  reason: string;
  source_tabs: TabId[];
  actions: { label: string; eventType: string; payload: Record<string, unknown> }[];
};

export type AdherenceItem = {
  id: string;
  name: string;
  kind: "supplement" | "peptide";
  dose: string;
  taken: boolean;
  missed: boolean;
  vialId?: string;
};

export type PeptideVial = {
  id: string;
  name: string;
  powderMg: number;
  vialVolumeMl: number;
  syringeVolumeMl: number;
  syringeUnits: number;
  targetDoseMcg: number;
  premixedConcentrationMcgPerMl?: number;
  startDate: number;
  history: { date: string; taken: boolean }[];
};

export type HealthRecord = {
  id: string;
  kind: "prescription" | "lab" | "note" | "upload";
  title: string;
  date: number;
  summary: string;
  authorId: string;
  workoutRelated?: boolean;
};

export type WorkoutPlan = {
  id: string;
  title: string;
  trainerId: string;
  notes: string;
  days: { day: string; focus: string; exercises: { name: string; sets: string }[] }[];
};

export type DietMeal = {
  id: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  notes: string;
};

export type CheckIn = {
  date: string;
  mood: number;
  energy: number;
  anxiety: number;
  sleepHours: number;
  stress: number;
  notes?: string;
};

export type BodyMetric = {
  date: string;
  weightKg: number;
  waistCm?: number;
};

export type HealthStream = {
  source: "apple" | "ultrahuman";
  hrv: number;
  rhr: number;
  steps: number;
  sleepHours: number;
  stress: number;
  recovery: number;
  syncedAt: number;
  sleepScore?: number;
  deepSleepH?: number;
  remSleepH?: number;
  lightSleepH?: number;
  spo2?: number;
  skinTempDeltaC?: number;
  respRate?: number;
  strain?: number;
  calories?: number;
  activeMin?: number;
  vo2?: number;
  glucoseMgDl?: number;
};

export type GrowthItem = {
  id: string;
  area: string;
  title: string;
  streak: number;
  lastDone: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: number;
  results?: { title: string; source: "youtube" | "spotify"; meta: string }[];
};

export type Trip = {
  id: string;
  mode: "work" | "personal";
  title: string;
  destination?: string;
  vibe?: string;
  companions?: string;
  season?: string;
  budgetInr?: number;
  start?: number;
  end?: number;
  status: "watching" | "suggested" | "planned" | "committed";
  rateWatch?: { current: number; previous: number; label: string };
  itinerary?: { day: number; title: string; detail: string }[];
  estimateInr?: number;
  packing?: string[];
  source?: "makemytrip" | "airbnb" | "manual";
};

export type ShopList = {
  id: string;
  name: string;
  shared: boolean;
  items: {
    id: string;
    name: string;
    qty: string;
    ownerId?: string;
    checked: boolean;
    fromProtocol?: boolean;
    fromTravel?: boolean;
  }[];
};

export type ResearchItem = {
  id: string;
  category: string;
  name: string;
  notes: string;
  priceInr: number;
  lastPriceInr: number;
  relevantToHealth?: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  purchasedAt: number;
  fromVaultId?: string;
  healthProtocol?: boolean;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  authorId: string;
  shared: boolean;
  linkedEventIds: string[];
  voicePlaceholder?: boolean;
};

export type Account = {
  id: string;
  name: string;
  kind: "personal" | "business";
  businessId?: string;
  balanceInr: number;
};

export type Txn = {
  id: string;
  accountId: string;
  amountInr: number;
  merchant: string;
  category: string;
  timestamp: number;
};

export type RecurringBill = {
  id: string;
  name: string;
  kind: "phone" | "electricity" | "salary" | "house_help" | "other";
  amountInr: number;
  dueDay: number;
  trend: number[];
  status: "due" | "paid" | "queued";
};

export type Loan = {
  id: string;
  from: "me" | string;
  to: "me" | string;
  amountInr: number;
  note: string;
};

export type Campaign = {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  conversions: number;
  cpl: number;
  baselineCpl: number;
};

export type Business = {
  id: string;
  name: string;
  revenueInr: number;
  expensesInr: number;
  clients: { id: string; name: string; status: string }[];
  campaigns: Campaign[];
};

export type LocationPing = {
  personId: string;
  lat: number;
  lng: number;
  label: string;
  updatedAt: number;
};

export type Capture = {
  id: string;
  text: string;
  targetTab: TabId;
  timestamp: number;
  actorId: string;
};

export type ExchangeChannel = "text" | "voice" | "file";

export type Exchange = {
  id: string;
  tab: TabId;
  channel: ExchangeChannel;
  title: string;
  query: string;
  response: string;
  timestamp: number;
  actorId: string;
  fileIds: string[];
};

export type VaultFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
};

export type VaultFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  folderId: string | null;
  createdAt: number;
  dataUrl?: string;
  textExcerpt?: string;
  sourceTab?: TabId;
  exchangeId?: string;
};

export type VoiceShortcut = {
  id: string;
  phrase: string;
  command: string;
};

export type PendingFile = {
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  textExcerpt?: string;
};

export type ConnectorId =
  | "google"
  | "apple-health"
  | "whatsapp"
  | "makemytrip"
  | "airbnb"
  | "ultrahuman"
  | "youtube"
  | "spotify"
  | "bank"
  | "gst"
  | "google-drive"
  | "amazon"
  | "bigbasket";
export type ConnectorStatus = "disconnected" | "connected";
export type Connector = {
  id: ConnectorId;
  status: ConnectorStatus;
  account?: string;
  lastSync?: number;
};

export type WaThread = {
  id: string;
  name: string;
  preview: string;
  tab: TabId;
  timestamp: number;
};

export type HomeLayout = "stack" | "board" | "agenda";
export type WidgetSize = "s" | "m" | "l";
export type WidgetDensity = "stat" | "story";
export type WidgetPref = {
  id: TabId;
  visible: boolean;
  size: WidgetSize;
  pinned: boolean;
  density: WidgetDensity;
};

export type Domain = {
  people: Person[];
  timeline: TimelineEvent[];
  calendar: CalendarItem[];
  tasks: Task[];
  emails: Email[];
  reminders: Reminder[];
  notifications: NotificationItem[];
  suggestions: Suggestion[];
  dismissedSuggestionIds: string[];
  adherence: AdherenceItem[];
  vials: PeptideVial[];
  records: HealthRecord[];
  workout: WorkoutPlan;
  diet: DietMeal[];
  checkins: CheckIn[];
  metrics: BodyMetric[];
  streams: HealthStream[];
  usageByHour: number[];
  growth: GrowthItem[];
  chat: ChatMessage[];
  trips: Trip[];
  lists: ShopList[];
  research: ResearchItem[];
  inventory: InventoryItem[];
  notes: Note[];
  accounts: Account[];
  txns: Txn[];
  bills: RecurringBill[];
  loans: Loan[];
  businesses: Business[];
  locations: LocationPing[];
  captures: Capture[];
  exchanges: Exchange[];
  folders: VaultFolder[];
  files: VaultFile[];
  shortcuts: VoiceShortcut[];
  homeLayout: HomeLayout;
  widgets: WidgetPref[];
  connectors: Connector[];
  waThreads: WaThread[];
};

export const SELF_ID = "rajan";
