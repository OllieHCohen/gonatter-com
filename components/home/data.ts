// Homepage content. The Natterers and pairings are ILLUSTRATIVE (marked as
// such on the page) until founding Natterers replace them.

// Homepage topics → interest ids used by /discover?topic=…
export const TOPICS = [
  { label: "History", interest: "history" },
  { label: "Gardening", interest: "gardening" },
  { label: "Baking & food", interest: "cooking" },
  { label: "Travel", interest: "travel" },
  { label: "Sport", interest: "sport" },
  { label: "Books", interest: "books" },
  { label: "Outdoors", interest: "nature-walking" },
] as const;

export type Natterer = {
  name: string;
  role: string;
  img: string;
  alt: string;
  interests: string[]; // interest ids, for the topic filter
  tags: string[];
};

export const NATTERERS: Natterer[] = [
  {
    name: "Peter",
    role: "Veteran, 32 years of service",
    img: "/home/peter.jpg",
    alt: "Peter, an older man in a flat cap, on the phone while fishing by a canal",
    interests: ["history", "nature-walking"],
    tags: ["Military life", "Fishing", "Canal boats", "Growing up in the 1960s"],
  },
  {
    name: "Margaret",
    role: "Lifelong gardener, Kent",
    img: "/home/margaret.jpg",
    alt: "Margaret laughing on the phone among her roses",
    interests: ["gardening", "nature-walking"],
    tags: ["Roses", "Allotments", "Growing veg"],
  },
  {
    name: "Sarah",
    role: "Home baker and sourdough obsessive",
    img: "/home/sarah.jpg",
    alt: "Sarah kneading dough in a sunny kitchen and laughing",
    interests: ["cooking"],
    tags: ["Sourdough", "Bread making", "Family recipes"],
  },
  {
    name: "Lucía",
    role: "Grew up in Madrid",
    img: "/home/lucia.jpg",
    alt: "Lucía walking her dog through an autumn park, headphones on",
    interests: ["travel", "nature-walking"],
    tags: ["Spanish conversation", "Moving to Spain", "Madrid life"],
  },
  {
    name: "Dan",
    role: "Season-ticket holder for twenty years",
    img: "/home/dan.jpg",
    alt: "Dan celebrating on the phone with a football match on the TV",
    interests: ["sport"],
    tags: ["Match-day talk", "Football history", "Away days"],
  },
  {
    name: "Arthur",
    role: "Retired history teacher, Bath",
    img: "/home/arthur.jpg",
    alt: "Arthur smiling on the phone in an armchair surrounded by books",
    interests: ["history", "books"],
    tags: ["The Tudors", "Local history", "Crime fiction"],
  },
  {
    name: "Tom",
    role: "Spent ten years living in Tokyo",
    img: "/home/tom.jpg",
    alt: "Tom on the phone, sitting cross-legged in a window seat with a notebook",
    interests: ["travel"],
    tags: ["Japan", "First trips abroad", "Learning Japanese"],
  },
];

export const SPARKS = [
  { q: "What first got you interested in this?", why: "Invites a personal story, not a factual answer." },
  { q: "What do people usually misunderstand about this?", why: "Creates immediate energy and reveals personality." },
  { q: "What's the best story you rarely get to tell?", why: "Room for memorable, human stories without forcing intimacy." },
  { q: "Where should someone begin if they want to learn more?", why: "Useful for informal learning, and leaves the conversation open." },
  { q: "What surprised you most?", why: "Works across travel, careers, hobbies, history and lived experience." },
];

type Person = { name: string; role: string; img: string; alt: string };

export const PAIRINGS: { topic: string; line: string; caller: Person; natterer: Person & { tags: string[] } }[] = [
  {
    topic: "History",
    line: "A history undergraduate in Bristol and a veteran on the Kennet & Avon.",
    caller: { name: "Maya", role: "History undergraduate, Bristol", img: "/home/maya.jpg", alt: "Maya laughing on a call at her desk, surrounded by books" },
    natterer: { name: "Peter", role: "Veteran, 32 years of service", img: "/home/peter.jpg", alt: "Peter on the phone by the canal", tags: ["Military life", "Canal boats", "Growing up in the 1960s"] },
  },
  {
    topic: "Gardening",
    line: "A new allotment holder in Leeds and a lifelong gardener in Kent.",
    caller: { name: "Sam", role: "New allotment holder, Leeds", img: "/home/tom.jpg", alt: "Sam on the phone in a window seat with a notebook" },
    natterer: { name: "Margaret", role: "Lifelong gardener, Kent", img: "/home/margaret.jpg", alt: "Margaret on the phone among her roses", tags: ["Roses", "Allotments", "Growing veg"] },
  },
  {
    topic: "Bread",
    line: "A sourdough beginner in Bath and a bread maker in Arizona.",
    caller: { name: "Arthur", role: "Sourdough beginner, Bath", img: "/home/arthur.jpg", alt: "Arthur on the phone in his armchair" },
    natterer: { name: "Sarah", role: "Home baker, Arizona", img: "/home/sarah.jpg", alt: "Sarah kneading dough and laughing", tags: ["Sourdough", "Bread making", "Family recipes"] },
  },
];
