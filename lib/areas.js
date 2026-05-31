// Single source of truth for the scope-check questionnaire.
// Used both to render the form (injected into the client) and to render
// the admin response view server-side. Mirrors the original
// homecare-scope-check.html exactly.

const AREAS = [
  ["What the owner sees and does", [
    "A new owner can sign themselves up, and their details (ID, address, bank) are checked so they are correct",
    "The owner has a clear home screen showing what needs their decision, what is in progress, and what is done",
    "The owner can request a service from their phone, and flag it as urgent",
    "The owner can order set services themselves (gardener, pool, cleaning, a stocked fridge on arrival)",
    "The owner can enter their own stays and ask us to prepare the home for their arrival",
    "The owner gets a monthly overview of what was done and spent, and can see the history of care for the home",
    "The owner can set how they like the home looked after, and add a co-owner or their lawyer",
    "The app feels fast and pleasant to use"
  ]],
  ["What you do at the office", [
    "We can manage all properties and owners in one place",
    "We can invite a new owner, and turn an interested lead into a client",
    "Every incoming request has a clear status and nothing gets lost",
    "We can make a quote or work order, with our margin on top of the contractor cost",
    "Each property has its own list of trusted contractors (their gardener, their plumber)",
    "We can load our existing owners and properties in one go at the start",
    "When an owner leaves, we can close it off cleanly (final invoice, access ended)"
  ]],
  ["Inspections and visits", [
    "Inspections are planned automatically per plan, including seasonal checks",
    "The inspector can do the inspection on their phone, also without internet at the house",
    "We can prove the inspector was really at the house, and when",
    "Each issue reaches the owner as a problem with a proposed solution and price, not a raw checklist"
  ]],
  ["Payments and invoices", [
    "Owners pay their subscription automatically by direct debit, with IVA handled",
    "Invoices go out automatically, with our margin included",
    "Failed payments are chased automatically, and plan changes are handled fairly",
    "Hourly work, like a gardener, is billed on the real hours used",
    "An owner can see and pay all their invoices in one place"
  ]],
  ["Access and security", [
    "Access can be arranged by key, by a personal code, or through the app",
    "We record where the keys are kept and which alarm and lock the home has",
    "Each person gets their own code that works only for the agreed time",
    "We can see who entered and when, and the owner can be notified",
    "The owner can see that the people we send are screened and insured"
  ]],
  ["Documents", [
    "All the home's documents are kept in one organised place",
    "When a document is uploaded, the key details are read out automatically",
    "Community of owners (VvE) information is summarised in plain language for the owner",
    "We get a reminder before something expires or needs renewing",
    "The home's contents and equipment are listed, with their warranties"
  ]],
  ["Communication", [
    "The owner and our team chat inside the app, with a notification so nothing is missed",
    "The owner can use the app in their own language",
    "Messages are translated automatically so language is never a barrier",
    "The owner can choose what they get notified about"
  ]],
  ["Settings and control (office)", [
    "We can change prices, plans, services and texts ourselves, without a developer",
    "We can switch features on or off ourselves",
    "Each staff member has their own login and sees only what fits their role",
    "We can see who changed what and when",
    "Connections to outside services (payments, email) are set up and kept safe"
  ]],
  ["Marketing and new owners", [
    "There are public web pages that attract new owners",
    "Someone interested can leave their details, which we turn into an invitation",
    "The website works in multiple languages and is easy to find online"
  ]]
];

const STATUS_LABELS = {
  live: "Live",
  partial: "Partial",
  notyet: "Not yet",
  nsure: "Not sure",
  notneeded: "Not needed",
  "": "(not answered)"
};

// Intake fields, grouped, with friendly labels for the admin view.
const META_GROUPS = [
  ["How the work runs now", [
    ["buildStart", "Build started"],
    ["devTasks", "Tasks given to developer by"],
    ["hasSpec", "Written plan or specification"],
    ["hasSpecNote", "Plan / spec note"]
  ]],
  ["Expectations and timeline", [
    ["readyDate", "Expected ready for owners"],
    ["readyConf", "Confidence in that date"],
    ["readyMeaning", "What \"ready\" means"],
    ["agreed", "Agreed on scope and timing"],
    ["risk", "Biggest risk or concern"]
  ]]
];

const TOTAL = AREAS.reduce((n, a) => n + a[1].length, 0);

module.exports = { AREAS, STATUS_LABELS, META_GROUPS, TOTAL };
