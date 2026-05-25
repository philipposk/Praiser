import type { ChatMode, PersonInfo } from "@/lib/types";

/**
 * Curated, safe persona presets. Fictional + historical only — no private
 * individuals or living public figures (defamation/likeness risk).
 *
 * Bundled with the app so first-time users have a one-click demo without
 * typing anything.
 */

export type PersonaPreset = {
  /** Stable id used as the seed person.id on import. */
  id: string;
  /** Used to look up the preset; also the name unless overridden. */
  slug: string;
  name: string;
  /** Sentence shown under the name in the SubjectPanel. */
  tagline: string;
  /** First-paragraph bio used to seed extraInfo. Include "aliases: ..." to populate alias chips. */
  extraInfo: string;
  /** Default mode that fits this character best. */
  mode: ChatMode;
  /** Short label shown in the preset chip. */
  emoji: string;
};

export const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: "preset-socrates",
    slug: "socrates",
    name: "Socrates",
    tagline: "Ο σοφός που γνώριζε ότι δεν γνωρίζει τίποτα.",
    extraInfo:
      "Athenian philosopher (470–399 BC). Father of Western philosophy. Known for the Socratic method — relentless questioning. aliases: Σωκράτης, the Gadfly, the wisest man in Athens. Drank hemlock rather than betray his principles. Walked barefoot through the Agora arguing with sophists.",
    mode: "praise",
    emoji: "🏛️",
  },
  {
    id: "preset-mr-rogers",
    slug: "mr-rogers",
    name: "Mr. Rogers",
    tagline: "Won't you be my neighbour?",
    extraInfo:
      "Fred Rogers (1928–2003). American TV personality and ordained minister. Host of Mister Rogers' Neighborhood for 33 years. aliases: Fred, Mister Rogers, the Neighbour. Believed deeply in kindness, slowing down, and looking for the helpers. Wore the same cardigan his mother knitted him.",
    mode: "affirmation",
    emoji: "🧶",
  },
  {
    id: "preset-mary-oliver",
    slug: "mary-oliver",
    name: "Mary Oliver",
    tagline: "Tell me, what is it you plan to do with your one wild and precious life?",
    extraInfo:
      "American poet (1935–2019). Pulitzer Prize winner. aliases: Mary, the poet of the woods. Wrote about the natural world — geese, ponds, mornings — with reverence. Lived in Provincetown for decades, walked the dunes at dawn with a notebook.",
    mode: "tribute",
    emoji: "🪶",
  },
  {
    id: "preset-bob-ross",
    slug: "bob-ross",
    name: "Bob Ross",
    tagline: "We don't make mistakes — just happy little accidents.",
    extraInfo:
      "American painter (1942–1995). Host of The Joy of Painting (1983–1994). aliases: Bob, the Joy of Painting man, the gentle painter. Permed hair, soft voice, wet-on-wet oil technique. Painted 30,000+ pieces, gave nearly all of them away. Loved squirrels. Believed every painter deserved to feel calm.",
    mode: "hype",
    emoji: "🎨",
  },
  {
    id: "preset-marcus-aurelius",
    slug: "marcus-aurelius",
    name: "Marcus Aurelius",
    tagline: "Waste no more time arguing what a good man should be. Be one.",
    extraInfo:
      "Roman emperor (121–180 AD), last of the Five Good Emperors. aliases: Marcus, Imperator, the Stoic emperor. Author of Meditations — private notes written to himself in Greek during military campaigns. Ruled an empire while practising philosophy at dawn. Believed virtue is the only good.",
    mode: "affirmation",
    emoji: "⚔️",
  },
  {
    id: "preset-carl-sagan",
    slug: "carl-sagan",
    name: "Carl Sagan",
    tagline: "We are made of star-stuff.",
    extraInfo:
      "American astronomer + science communicator (1934–1996). aliases: Carl, the Cosmos man. Host of Cosmos: A Personal Voyage. Lobbied for SETI, helped design the Pioneer plaque and Voyager Golden Record. Wrote about the Pale Blue Dot — the photo of Earth from 6 billion km. Believed wonder was civic duty.",
    mode: "praise",
    emoji: "🌌",
  },
  {
    id: "preset-ada-lovelace",
    slug: "ada-lovelace",
    name: "Ada Lovelace",
    tagline: "The Enchantress of Numbers.",
    extraInfo:
      "English mathematician (1815–1852). aliases: Ada, Augusta Ada King, Countess of Lovelace, Enchantress of Numbers. Daughter of Lord Byron. Wrote what is considered the first computer algorithm — a method to compute Bernoulli numbers on Babbage's Analytical Engine — a hundred years before any actual computer existed.",
    mode: "praise",
    emoji: "💾",
  },
  {
    id: "preset-hercules",
    slug: "hercules",
    name: "Heracles",
    tagline: "Twelve labours. Zero excuses.",
    extraInfo:
      "Greek mythological hero, son of Zeus. aliases: Hercules, Herakles, ο Ηρακλής, the Lion of Nemea. Completed the Twelve Labours — slew the Nemean lion, the Hydra, captured Cerberus from the Underworld. Patron of athletes, wrestlers, and anyone with an impossible to-do list. Symbol of human endurance against the universe.",
    mode: "hype",
    emoji: "🦁",
  },
];

const slugToPreset = new Map(PERSONA_PRESETS.map((p) => [p.slug, p]));

export const findPresetBySlug = (slug: string): PersonaPreset | undefined =>
  slugToPreset.get(slug);

/** Convert a preset to a PersonInfo ready to insert into the store. */
export const presetToPersonInfo = (p: PersonaPreset): PersonInfo => ({
  id: p.id,
  name: p.name,
  mode: p.mode,
  images: [],
  videos: [],
  urls: [],
  extraInfo: `${p.tagline} ${p.extraInfo}`,
});
