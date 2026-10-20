// A personal portfolio — it's about Spandana, not SP Design Studio.
// Studio work, services and client stories live on spdesignstudio.in; link out, don't repeat.
// Every fact here comes from her bio note. No invented press, numbers or quotes.

export const SITE = {
  name: "Spandana Puppala",
  city: "Hyderabad",
  email: "hello@spandanapuppala.com",
  studioName: "SP Design Studio",
  studioUrl: "https://www.spdesignstudio.in",
  credit: {
    name: "Abhiraman Kuntimaddi",
    url: "https://abhiramankuntimaddi.com",
  },
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
  {
    id: "top",
    name: "Sa",
    short: "S",
    label: "Spandana",
    step: 0,
    ratio: et(0),
    mode: [3, 5, -1],
    intensity: 0.95,
  },
  {
    id: "profile",
    name: "Re",
    short: "R",
    label: "Profile",
    step: 2,
    ratio: et(2),
    mode: [2, 7, 1],
    intensity: 0.38,
  },
  {
    id: "journey",
    name: "Ga",
    short: "G",
    label: "Journey",
    step: 4,
    ratio: et(4),
    mode: [4, 5, -1],
    intensity: 0.35,
  },
  {
    id: "honours",
    name: "Ma",
    short: "M",
    label: "Honours",
    step: 5,
    ratio: et(5),
    mode: [3, 8, 1],
    intensity: 0.35,
  },
  {
    id: "giving",
    name: "Pa",
    short: "P",
    label: "Giving back",
    step: 7,
    ratio: et(7),
    mode: [5, 7, -1],
    intensity: 0.4,
  },
  {
    id: "music",
    name: "Dha",
    short: "D",
    label: "Music",
    step: 9,
    ratio: et(9),
    mode: [6, 7, 1],
    intensity: 0.95,
  },
  {
    id: "next",
    name: "Ni",
    short: "N",
    label: "What's next",
    step: 11,
    ratio: et(11),
    mode: [4, 9, -1],
    intensity: 0.42,
  },
  {
    id: "contact",
    name: "Ṡa",
    short: "Ṡ",
    label: "Connect",
    step: 12,
    ratio: et(12),
    mode: [3, 5, 1],
    intensity: 0.75,
  },
];

export const hero = {
  first: "Spandana",
  last: "Puppala",
  scripts: "స్పందన · स्पंदन",
  definition: "a pulse or vibration. In Telugu, also a response.",
  roles: ["Interior Designer", "Carnatic Vocalist", "Entrepreneur", "Educator"],
  tagline: "Interior designer and Carnatic vocalist, based in Hyderabad.",
};

// Copy between *asterisks* renders as the brass emphasis (components/ui/Emphasis.tsx).
export const profile = {
  heading: ["Personal", "Profile"],
  lead: "Spandana is an interior designer in Hyderabad. She started SP Design Studio to bring good design and *everyday use* together.",
  body: [
    "She studied interior design at JNAFAU, Hyderabad. She learnt furniture design and origami prototyping from Prof. Supradip Das at IIT Guwahati, and worked on offices and corporate interiors at Liquid Space Studio.",
    "She is also a trained Carnatic vocalist. She has sung playback for Telugu films, teaches music to 40 students, and gives guest lectures at JNAFAU.",
  ],
  quote: "I design for how people feel in a space, not just how it looks.",
  studioLine: "Her studio's work has its own website:",
};

export const journey = [
  {
    when: "Education",
    title: "Bachelor of Interior Design",
    sub: "JNAFAU, Hyderabad · School of Planning & Architecture",
    body: "Her degree, from Jawaharlal Nehru Architecture and Fine Arts University.",
  },
  {
    when: "Mentorship",
    title: "Furniture design & origami prototyping",
    sub: "Prof. Supradip Das · IIT Guwahati",
    body: "Furniture design, and using origami to build prototypes.",
  },
  {
    when: "Early career",
    title: "Liquid Space Studio",
    sub: "Under Ar. Nagaraju Mundrai",
    body: "Her first job, working on offices and corporate interiors.",
  },
  {
    when: "2023-24",
    title: "Gold certifications",
    sub: "IIT Roorkee & SPA Delhi",
    body: "Gold certificates in Design Technology and Innovation, and in Building Materials and Composites.",
  },
  {
    when: "2024",
    title: "The Architectural Imagination",
    sub: "HarvardX · Verified certificate",
    body: "A verified online course on architecture from HarvardX.",
  },
];

export const honours = [
  {
    year: "2023",
    title: "Telangana's Rising Interior Designer of the Year",
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
    title: "Speaker and panelist, Trailblazers of Tomorrow",
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
    kicker: "Guest lecturer",
    figure: "JNAFAU",
    body: "She goes back to her old university to teach design students.",
  },
  {
    kicker: "Mentoring",
    figure: "Women at work",
    body: "She supports and encourages women in professional workplaces.",
  },
  {
    kicker: "Teaching",
    figure: "40 + students",
    body: "She teaches Carnatic music to students in different countries.",
  },
];

export const music = {
  heading: ["The other", "half is", "music."],
  body: "Music is a big part of her life. She is *a trained and certified Carnatic vocalist*, has sung playback for Telugu films, and teaches students around the world.",
  listen: "Listen while you scroll",
  facts: [
    { value: "Carnatic", label: "Trained and certified vocalist" },
    { value: "Playback", label: "Songs for Telugu films" },
    { value: "40 +", label: "Music students" },
  ],
};

export const next = {
  heading: ["What's", "Next?"],
  eyebrow: "New venture",
  title: "Jaipuri Trunk",
  url: "https://jaipuritrunk.com",
  urlLabel: "jaipuritrunk.com",
  launch: "Launching in early December 2026",
  body: "*Jaipuri Trunk* is her new label for Jaipuri juttis and handmade accessories.",
};
