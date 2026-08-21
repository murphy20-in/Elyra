/**
 * Demo population.
 *
 * Every person here is fictional. Names, bios, and cities are invented for
 * the local demo; no real individual's data appears in this file. Avatars
 * are rendered from initials and a deterministic gradient rather than
 * photographs, which keeps the bundle small, works offline, and avoids
 * shipping images of people who never consented to being demo data.
 *
 * `reciprocates` decides whether a like becomes a match. It is fixed per
 * profile rather than random so the demo is reproducible and testable.
 */

export const INTEREST_POOL = [
  "Filter coffee", "Carnatic", "Indie films", "Poetry", "Queer history", "Bouldering",
  "Street food", "Trekking", "Board games", "Drag", "Photography", "Cats", "Dogs",
  "Cycling", "Baking", "Techno", "Ghazals", "Reading", "Theatre", "Cricket",
  "Gardening", "Pottery", "Stand-up", "Volunteering", "Chess", "Running",
];

export const CITIES = [
  "Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune",
  "Kolkata", "Kochi", "Ahmedabad", "Jaipur",
];

export const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they", "ze/hir"];

export const GENDER_IDENTITIES = [
  "Woman", "Man", "Non-binary", "Genderqueer", "Genderfluid",
  "Agender", "Trans woman", "Trans man", "Prefer not to say",
];

export const ORIENTATIONS = [
  "Lesbian", "Gay", "Bisexual", "Pansexual", "Asexual",
  "Queer", "Questioning", "Prefer not to say",
];

export const SEED_CANDIDATES = [
  {
    id: "cand_aarav", displayName: "Aarav", age: 28, pronouns: "he/him",
    genderIdentity: "Man", orientation: "Gay", city: "Bengaluru", distanceKm: 4,
    intent: "serious", verified: true, reciprocates: true, accent: "teal",
    bio: "Architect, slow cook, worse dancer. Looking for someone to build a quiet life with — and to argue about Sunday breakfast.",
    interests: ["Filter coffee", "Indie films", "Bouldering", "Cats", "Baking"],
  },
  {
    id: "cand_meera", displayName: "Meera", age: 26, pronouns: "she/her",
    genderIdentity: "Woman", orientation: "Bisexual", city: "Bengaluru", distanceKm: 8,
    intent: "exploring", verified: true, reciprocates: true, accent: "coral",
    bio: "Product designer. I take photos of strangers' dogs without permission. Working out what I want, honestly.",
    interests: ["Photography", "Dogs", "Techno", "Street food", "Poetry"],
  },
  {
    id: "cand_ishaan", displayName: "Ishaan", age: 31, pronouns: "he/they",
    genderIdentity: "Genderqueer", orientation: "Queer", city: "Mumbai", distanceKm: 42,
    intent: "serious", verified: false, reciprocates: true, accent: "violet",
    bio: "Documentary editor. Grew up in Bhopal, found myself in Bombay. Big on long walks and longer conversations.",
    interests: ["Indie films", "Queer history", "Poetry", "Theatre", "Cycling"],
  },
  {
    id: "cand_nikita", displayName: "Nikita", age: 24, pronouns: "she/they",
    genderIdentity: "Trans woman", orientation: "Lesbian", city: "Bengaluru", distanceKm: 12,
    intent: "friendship", verified: true, reciprocates: false, accent: "gold",
    bio: "Two years into transition and three years into a pottery obsession. Here mostly for community and good people.",
    interests: ["Pottery", "Volunteering", "Cats", "Reading", "Baking"],
  },
  {
    id: "cand_rehan", displayName: "Rehan", age: 29, pronouns: "he/him",
    genderIdentity: "Man", orientation: "Gay", city: "Hyderabad", distanceKm: 68,
    intent: "discreet", verified: true, reciprocates: true, accent: "teal",
    bio: "Not out at home and that's not changing soon. Straightforward, kind, and clear about what I can offer.",
    interests: ["Cricket", "Ghazals", "Running", "Street food"],
  },
  {
    id: "cand_tara", displayName: "Tara", age: 33, pronouns: "she/her",
    genderIdentity: "Woman", orientation: "Queer", city: "Chennai", distanceKm: 21,
    intent: "serious", verified: true, reciprocates: true, accent: "coral",
    bio: "Doctor, night shifts, unreasonable love for Carnatic music. I want something steady, not something loud.",
    interests: ["Carnatic", "Reading", "Gardening", "Filter coffee", "Chess"],
  },
  {
    id: "cand_dev", displayName: "Dev", age: 27, pronouns: "they/them",
    genderIdentity: "Non-binary", orientation: "Pansexual", city: "Delhi", distanceKm: 95,
    intent: "exploring", verified: false, reciprocates: false, accent: "violet",
    bio: "Sound engineer. I make playlists as apology gifts. Newly out and enjoying it more than I expected.",
    interests: ["Techno", "Drag", "Stand-up", "Photography", "Theatre"],
  },
  {
    id: "cand_saira", displayName: "Saira", age: 30, pronouns: "she/her",
    genderIdentity: "Woman", orientation: "Lesbian", city: "Pune", distanceKm: 51,
    intent: "serious", verified: true, reciprocates: true, accent: "gold",
    bio: "Lawyer with a garden that's slowly taking over the balcony. Direct, warm, allergic to game-playing.",
    interests: ["Gardening", "Reading", "Trekking", "Dogs", "Board games"],
  },
  {
    id: "cand_kabir", displayName: "Kabir", age: 25, pronouns: "he/him",
    genderIdentity: "Trans man", orientation: "Bisexual", city: "Bengaluru", distanceKm: 6,
    intent: "exploring", verified: true, reciprocates: true, accent: "teal",
    bio: "Grad student, bad at chess but plays anyway. Happiest on a trail with no signal.",
    interests: ["Chess", "Trekking", "Cycling", "Indie films", "Cats"],
  },
  {
    id: "cand_zoya", displayName: "Zoya", age: 32, pronouns: "she/her",
    genderIdentity: "Woman", orientation: "Bisexual", city: "Mumbai", distanceKm: 39,
    intent: "discreet", verified: false, reciprocates: false, accent: "coral",
    bio: "Finance by day, ghazals by night. Discreet because my situation asks for it, not because I'm unsure.",
    interests: ["Ghazals", "Poetry", "Street food", "Running"],
  },
  {
    id: "cand_arjun", displayName: "Arjun", age: 35, pronouns: "he/him",
    genderIdentity: "Man", orientation: "Gay", city: "Kochi", distanceKm: 140,
    intent: "serious", verified: true, reciprocates: true, accent: "violet",
    bio: "Chef. I will feed you and then ask what you actually think. Looking for the long version.",
    interests: ["Baking", "Street food", "Gardening", "Cricket", "Dogs"],
  },
  {
    id: "cand_lila", displayName: "Lila", age: 23, pronouns: "they/them",
    genderIdentity: "Genderfluid", orientation: "Queer", city: "Bengaluru", distanceKm: 15,
    intent: "friendship", verified: false, reciprocates: true, accent: "gold",
    bio: "Illustrator. Building a chosen family one board-game night at a time. Not looking to date right now.",
    interests: ["Board games", "Drag", "Photography", "Volunteering", "Stand-up"],
  },
  {
    id: "cand_farhan", displayName: "Farhan", age: 29, pronouns: "he/him",
    genderIdentity: "Man", orientation: "Queer", city: "Jaipur", distanceKm: 210,
    intent: "exploring", verified: true, reciprocates: false, accent: "teal",
    bio: "Museum guide, part-time poet, full-time overthinker. Ask me about the 18th century.",
    interests: ["Poetry", "Queer history", "Theatre", "Reading", "Photography"],
  },
  {
    id: "cand_priya", displayName: "Priya", age: 27, pronouns: "she/they",
    genderIdentity: "Woman", orientation: "Pansexual", city: "Kolkata", distanceKm: 175,
    intent: "serious", verified: true, reciprocates: true, accent: "coral",
    bio: "Climate researcher. Loud laugh, strong opinions about tea. I want someone who argues kindly.",
    interests: ["Trekking", "Reading", "Volunteering", "Cycling", "Filter coffee"],
  },
];

/** Opening lines used when a seeded match starts a conversation. */
export const SEED_OPENERS = [
  "Hey — your bio made me laugh. How's your week going?",
  "Okay, I have to ask about the interests list. Which one is a lie?",
  "Hi! We matched on intent, which honestly feels like a good start.",
  "Your profile reads like someone who actually thinks. Refreshing.",
  "Hey there. What's the best thing you've eaten this week?",
];

export const buildSeedCandidates = () =>
  SEED_CANDIDATES.map((candidate) => ({ ...candidate, interests: [...candidate.interests] }));
