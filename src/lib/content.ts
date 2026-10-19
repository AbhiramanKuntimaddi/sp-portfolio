// A personal portfolio — it's about Spandana, not SP Design Studio.
// Studio work, services and client stories live on spdesignstudio.in; link out, don't repeat.
// Every fact here comes from her bio note. No invented press, numbers or quotes.

export const SITE = {
  name: "Spandana Puppala",
  city: "Hyderabad",
  email: "hello@spandanapuppala.com",
  studioName: "SP Design Studio",
  studioUrl: "https://www.spdesignstudio.in",
  credit: { name: "Abhiraman Kuntimaddi", url: "https://abhiramankuntimaddi.com" },
};

/*
 * The page is one octave. Each section is a swara of the major scale
 * (Shankarabharanam), tuned to concert pitch — Sa = A3, 220 Hz, equal
 * temperament — so the strings that play it sit with any Western instrument.
 * Each swara tunes the cymatic plate to its own Chladni mode (n, m, sign).
 * Scrolling climbs from Sa to the upper Sa.
 */
export interface Swara {
  id: string;
  name: string;
  short: string;
  label: string;
  /** Semitones above Sa. */
  step: number;
  ratio: number;
  mode: [n: number, m: number, sign: number];
  /** How bright the sand burns behind this section (text sits over it). */
  intensity: number;
}

export const SA_HZ = 220;

const et = (step: number) => Math.pow(2, step / 12);

export const SWARAS: Swara[] = [
  { id: "top", name: "Sa", short: "S", label: "Spandana", step: 0, ratio: et(0), mode: [3, 5, -1], intensity: 1 },
  { id: "profile", name: "Re", short: "R", label: "Profile", step: 2, ratio: et(2), mode: [2, 7, 1], intensity: 0.32 },
  { id: "journey", name: "Ga", short: "G", label: "Journey", step: 4, ratio: et(4), mode: [4, 5, -1], intensity: 0.3 },
  { id: "honours", name: "Ma", short: "M", label: "Honours", step: 5, ratio: et(5), mode: [3, 8, 1], intensity: 0.3 },
  { id: "giving", name: "Pa", short: "P", label: "Giving back", step: 7, ratio: et(7), mode: [5, 7, -1], intensity: 0.36 },
  { id: "music", name: "Dha", short: "D", label: "Music", step: 9, ratio: et(9), mode: [6, 7, 1], intensity: 1 },
  { id: "next", name: "Ni", short: "N", label: "What’s next", step: 11, ratio: et(11), mode: [4, 9, -1], intensity: 0.4 },
  { id: "contact", name: "Ṡa", short: "Ṡ", label: "Connect", step: 12, ratio: et(12), mode: [3, 5, 1], intensity: 0.9 },
];

export const hero = {
  first: "Spandana",
  last: "Puppala",
  scripts: "స్పందన · स्पन्दन",
  definition: "a throb, a pulse, a vibration.",
  roles: ["Interior Designer", "Carnatic Vocalist", "Entrepreneur", "Educator"],
  tagline:
    "Driven by a lifelong passion for crafting beautiful, soul-stirring spaces — and for the music that has shaped her just as deeply.",
};

export const profile = {
  heading: ["Personal", "Profile"],
  lead: "Spandana designs for the way a space feels — intuitive, human-centred rooms where every new idea has to earn its place in everyday life.",
  body: [
    "She trained in interior design at JNAFAU, learnt furniture and prototyping under Prof. Supradip Das at IIT Guwahati, and found her footing in workspace design at Liquid Space Studio. Then she started her own practice — one of the youngest entrepreneurs in her field.",
    "The other half of her is music: a trained Carnatic vocalist and playback singer who teaches students across the world. And she keeps returning to JNAFAU, as a guest lecturer, for the designers coming up behind her.",
  ],
  quote: "I design for how people feel in a space, not just how it looks.",
  studioLine: "Her studio’s interiors have a home of their own —",
};

export const journey = [
  {
    when: "Education",
    title: "Bachelor of Interior Design",
    sub: "JNAFAU, Hyderabad · School of Planning & Architecture",
    body: "Where she learnt to see space — at Jawaharlal Nehru Architecture & Fine Arts University.",
  },
  {
    when: "Mentorship",
    title: "Furniture design & origami prototyping",
    sub: "Prof. Supradip Das · IIT Guwahati",
    body: "Furniture design, and origami as a way of thinking with her hands — folding ideas into prototypes.",
  },
  {
    when: "Early career",
    title: "Liquid Space Studio",
    sub: "Under Ar. Nagaraju Mundrai",
    body: "Her first studio: workspaces and corporate interiors — the experience that shaped her human-centred way of designing.",
  },
  {
    when: "2023–24",
    title: "Gold certifications",
    sub: "IIT Roorkee & SPA Delhi",
    body: "Gold in Design Technology & Innovation, and in Building Materials & Composites.",
  },
  {
    when: "2024",
    title: "The Architectural Imagination",
    sub: "HarvardX · Verified certificate",
    body: "A verified course in reading architecture as a cultural, creative practice — study that never stopped.",
  },
];

export const honours = [
  {
    year: "2023",
    title: "Telangana’s Rising Interior Designer of the Year",
    by: "Presented by award-winning architect Ar. Ponni Concessao",
    img: "/img/award-stage.jpg",
    alt: "Spandana receiving the Rising Interior Designer of the Year award on stage",
  },
  {
    year: "2024",
    title: "Eminent Jury Member",
    by: "ACETECH Grand Stand Awards",
    img: "/img/jury.jpg",
    alt: "Spandana at ACETECH, wearing her jury sash",
  },
  {
    year: "2025",
    title: "Speaker & Panelist — Trailblazers of Tomorrow",
    by: "APTA Katalyst",
    img: "/img/apta-panel.jpg",
    alt: "Spandana with fellow panelists at APTA Katalyst",
  },
  {
    year: "2025",
    title: "Production Tour Invite",
    by: "Hettich · Kirchlengern, Germany",
    img: "/img/hettich.jpg",
    alt: "Spandana outside the Hettich Forum in Germany",
  },
];

export const givingBack = [
  {
    title: "Guest lecturer at JNAFAU",
    body: "She returns to her alma mater to teach — and to show young designers what the path can look like.",
  },
  {
    title: "Women at work",
    body: "One of the youngest entrepreneurs in her field, she makes a point of empowering and motivating women in professional workplaces.",
  },
  {
    title: "Teaching music",
    body: "Forty young students, across the globe, learn Carnatic music from her.",
  },
];

export const music = {
  eyebrow: "Beyond spatial design",
  heading: ["The other", "half is", "music."],
  body: "Music is as much a part of Spandana as design. A trained and certified Carnatic vocalist, she has sung playback for Telugu cinema — and now passes the form on to a global class of young students.",
  facts: [
    { value: "Carnatic", label: "Trained & certified vocalist" },
    { value: "TFI", label: "Playback songs in Telugu cinema" },
    { value: "40", label: "Students, across the globe" },
  ],
};

export const next = {
  heading: ["What’s", "Next?"],
  eyebrow: "Upcoming venture",
  title: "Jaipuri Trunk",
  url: "https://jaipuritrunk.com",
  urlLabel: "jaipuritrunk.com",
  launch: "Launching early December 2026",
  body: "Her newest venture brings the same eye for craft, colour and material to what we wear: Jaipuri Trunk, a label for Jaipuri juttis and artisanal accessories.",
};
