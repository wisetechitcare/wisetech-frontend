/**
 * Demo data for the Company Profile Storybook prototype only. Company copy and project names are taken
 * from WISETECH MEP's own published brochure (Rev.27); the cover render is from their Profile.pptx; other
 * photos and logos are generated placeholders.
 */
import { scene, type SceneName } from "../project-gallery/fixtures";
import coverHero from "./cover-hero.jpg";
import {
  PICK_LIMIT,
  places,
  type OrgProfile,
  type ProfileCompany,
  type ProfileData,
  type ProfileProject,
  type ProfileService,
  type Section,
} from "./profile";
import { categorySections, clientsSection } from "./profileBuilder";

const SCENE: Record<string, SceneName[]> = {
  Residential: ["exterior", "night"],
  Commercial: ["night", "exterior"],
  Hospitality: ["lobby", "night"],
  Healthcare: ["ceiling", "hvac"],
  Institutional: ["exterior", "lobby"],
  Industrial: ["hvac", "ceiling"],
  Religious: ["exterior", "night"],
  Township: ["exterior", "night"],
  Bungalows: ["exterior", "lobby"],
  Retail: ["lobby", "night"],
};

/** City → [lat, lng, country]. In the app these come from each project's AdditionalDetails. */
const CITY: Record<string, [number, number, string?]> = {
  Mumbai: [19.08, 72.88],
  "Navi Mumbai": [19.03, 73.03],
  Thane: [19.22, 72.98],
  "Mira Road": [19.28, 72.87],
  Nalasopara: [19.42, 72.82],
  Vasai: [19.39, 72.84],
  Panvel: [18.99, 73.12],
  Uran: [18.88, 72.94],
  Kalyan: [19.24, 73.13],
  Shahpur: [19.45, 73.33],
  Karjat: [18.91, 73.33],
  Alibaug: [18.64, 72.87],
  Lonavala: [18.75, 73.41],
  Pune: [18.52, 73.86],
  Nashik: [20.0, 73.79],
  Nagpur: [21.15, 79.09],
  Wada: [19.65, 73.13],
  Goa: [15.49, 73.83],
  Rajkot: [22.3, 70.8],
  Mehsana: [23.59, 72.37],
  Ahmedabad: [23.02, 72.57],
  Surat: [21.17, 72.83],
  Ranthambore: [26.02, 76.5],
  Jaipur: [26.91, 75.79],
  Mandu: [22.36, 75.39],
  Indore: [22.72, 75.86],
  Khajuraho: [24.85, 79.93],
  Bengaluru: [12.97, 77.59],
  Chennai: [13.08, 80.27],
  Coimbatore: [11.02, 76.96],
  Ooty: [11.41, 76.7],
  Thiruvananthapuram: [8.52, 76.94],
  Hyderabad: [17.39, 78.49],
  Belagavi: [15.85, 74.5],
  Rudrapur: [28.98, 79.4],
  Aligarh: [27.88, 78.08],
  Delhi: [28.61, 77.21],
  Noida: [28.54, 77.39],
  Amritsar: [31.63, 74.87],
  Ludhiana: [30.9, 75.85],
  Lucknow: [26.85, 80.95],
  Kanpur: [26.45, 80.33],
  Patna: [25.59, 85.14],
  Kolkata: [22.57, 88.36],
  Bhubaneswar: [20.3, 85.82],
  Jamshedpur: [22.8, 86.2],
  Guwahati: [26.14, 91.74],
  Raipur: [21.25, 81.63],
  Karbala: [32.62, 44.02, "Iraq"],
  Lubumbashi: [-11.66, 27.48, "Congo"],
  Kinshasa: [-4.44, 15.27, "Congo"],
  Kolwezi: [-10.71, 25.47, "Congo"],
  Thimphu: [27.47, 89.64, "Bhutan"],
  Nairobi: [-1.29, 36.82, "Kenya"],
  Washington: [47.6, -122.33, "USA"],
};

type Extra = { tags?: string[]; noCover?: boolean };
let n = 0;
const P = (
  name: string,
  city: string,
  typology: string,
  areaSqft?: number,
  client?: string,
  architect?: string,
  x: Extra = {},
): ProfileProject => {
  n++;
  const [lat, lng, country = "India"] = CITY[city];
  return {
    id: `p${n}`,
    name,
    city,
    country,
    lat,
    lng,
    typology,
    tags: x.tags ?? [],
    client,
    architect,
    areaSqft,
    status: n % 5 === 0 ? "Ongoing" : "Completed",
    cover: x.noCover ? null : scene(SCENE[typology][n % 2], n + 200),
  };
};
const HR = "High-rise";
const MOEF = "MOEF / CRZ";
const GOV = "Government";
const HER = "Heritage";
const INT = "International";
const GREEN = "Green Building";

export const DEMO_PROJECTS: ProfileProject[] = [
  // Residential & high-rise
  P(
    "Shravan Nagar, Kandivali",
    "Mumbai",
    "Residential",
    1200000,
    "Shree Ji",
    undefined,
    { tags: [HR] },
  ),
  P(
    "Cornerstone, Lokseva Worli",
    "Mumbai",
    "Residential",
    200000,
    "Chandak",
    "Ingrain Arch",
    { tags: [HR, MOEF] },
  ),
  P("Signature, Bandra", "Mumbai", "Residential", 400000, "DLH", "KNS", {
    tags: [HR, MOEF],
  }),
  P(
    "Eiffel Tower, Mazgaon",
    "Mumbai",
    "Residential",
    200000,
    "Neumec",
    "Consultants Combined",
    { tags: [HR, MOEF] },
  ),
  P(
    "Shikhar Tower",
    "Mumbai",
    "Residential",
    400000,
    "Shreem Realty",
    "Reza Kabul",
    { tags: [HR] },
  ),
  P(
    "Crescent Jogeshwari",
    "Mumbai",
    "Residential",
    1000000,
    "Crescent Group",
    "Reza Kabul",
    { tags: [HR, MOEF] },
  ),
  P(
    "Res Agripada",
    "Mumbai",
    "Residential",
    800000,
    "Living Stones",
    undefined,
    { tags: [HR], noCover: true },
  ),
  P(
    "Sky Annex, Chembur",
    "Mumbai",
    "Residential",
    250000,
    "Buildtech Group",
    undefined,
    { tags: [HR, MOEF] },
  ),
  P(
    "Ditya Garden, Vashi",
    "Navi Mumbai",
    "Residential",
    400000,
    "Ditya",
    "Sanat Mehta",
    { tags: [HR, MOEF] },
  ),
  P(
    "Pluto Jogeshwari",
    "Mumbai",
    "Residential",
    500000,
    "Chandiwala",
    "Reza Kabul",
    { tags: [HR, MOEF] },
  ),
  P(
    "Agarwal Nalasopara",
    "Nalasopara",
    "Residential",
    1500000,
    "Agarwal",
    "Sanat Mehta",
    { tags: [HR, MOEF], noCover: true },
  ),
  P(
    "Crescent Horizon, Kandivali",
    "Mumbai",
    "Residential",
    160000,
    "Crescent Group",
    "Reza Kabul",
  ),
  P(
    "Crescent Downtown, Kalina",
    "Mumbai",
    "Residential",
    300000,
    "Crescent Group",
    "Reza Kabul",
  ),
  P(
    "Crescent Silverwood, Chandivali",
    "Mumbai",
    "Residential",
    160000,
    "Crescent Group",
    "Reza Kabul",
  ),
  P("DLH Ashoka", "Thane", "Residential", 250000, "DLH", "Horizon", {
    tags: [MOEF],
  }),
  P("DLH Legacy", "Mumbai", "Residential", 180000, "DLH", "Horizon"),
  P("DLH Dawn", "Mumbai", "Residential", 120000, "DLH", "Horizon", {
    noCover: true,
  }),
  P("Imperial Splendor", "Vasai", "Residential", 800000, "Imperial Life Style"),
  P(
    "Altamount, Nalasopara",
    "Nalasopara",
    "Residential",
    200000,
    "Imperial Life Style",
  ),
  P("Mamta, Andheri", "Mumbai", "Residential", 150000, undefined, "Neo Modern"),
  P("Bellagio, Saat Rasta", "Mumbai", "Residential", 130000, "Living Stones"),
  P(
    "Royal Bay, Nerul",
    "Navi Mumbai",
    "Residential",
    500000,
    "TPV Vishwakarma",
    "Urban Analysis",
  ),
  P(
    "Sahyadri Project",
    "Panvel",
    "Residential",
    500000,
    "Raj Tulsi",
    "Urban Analysis",
  ),
  P(
    "Moraj Silent Valley, Nerul",
    "Navi Mumbai",
    "Residential",
    undefined,
    "Moraj",
    "ACUBE",
  ),
  P(
    "Amarchand Mansion, Colaba",
    "Mumbai",
    "Residential",
    50000,
    undefined,
    "K. Unwalla",
    { tags: [HER] },
  ),
  // Commercial
  P(
    "Crescent Western Trade Center",
    "Mira Road",
    "Commercial",
    800000,
    "Crescent Group",
    "Reza Kabul",
    { tags: [HR, MOEF] },
  ),
  P(
    "Lotus Commercial Tower, Pydhoni",
    "Mumbai",
    "Commercial",
    120000,
    "Shreem Realty",
    "Ubaid",
    { tags: [HR] },
  ),
  P("World One", "Mumbai", "Commercial", 130000, "Sanjar", "Reza Kabul"),
  P("Artek, Marol", "Mumbai", "Commercial", 75000, "Artek", "KNS"),
  P("L&T House", "Mumbai", "Commercial", 60000, "L&T", "SNS", { tags: [HER] }),
  P(
    "Balaji Wafers HQ",
    "Rajkot",
    "Commercial",
    225000,
    "Balaji Wafers",
    "Knexir",
  ),
  P(
    "Sahar Commercial",
    "Mumbai",
    "Commercial",
    150000,
    "Continental Infra",
    "Samoon & Associates",
    { tags: [GREEN] },
  ),
  P(
    "MMB, BKC",
    "Mumbai",
    "Commercial",
    200000,
    "Maharashtra Maritime Board",
    "Hafeez Contractor",
    { tags: [GOV] },
  ),
  P(
    "DB House",
    "Mumbai",
    "Commercial",
    50000,
    "DB Realty",
    "Hafeez Contractor",
  ),
  P(
    "Asian Paints, Vakola",
    "Mumbai",
    "Commercial",
    17000,
    "Asian Paints",
    "ANJ",
    { tags: [GREEN] },
  ),
  P(
    "Team Global, Uran",
    "Uran",
    "Commercial",
    20000,
    "Team Global",
    "D'zyn Illusions",
    { tags: [GREEN] },
  ),
  P("Axis Bank MIDC", "Mumbai", "Commercial", 47000, "Axis Bank", "Reza Kabul"),
  P("HDFC Bank, Vashi", "Navi Mumbai", "Commercial", 35000, "HDFC Bank"),
  P("HDFC Bank, Panvel", "Panvel", "Commercial", 35000, "HDFC Bank"),
  // Hospitality
  P(
    "Al Qasr Hotel",
    "Karbala",
    "Hospitality",
    1500000,
    "Anjuman e Faiz e Panjetani",
    undefined,
    { tags: [INT] },
  ),
  P(
    "Bloom Hotel, Marol",
    "Mumbai",
    "Hospitality",
    undefined,
    "AA Group",
    "SD Consultant",
  ),
  P(
    "Fortune Hotel",
    "Lonavala",
    "Hospitality",
    undefined,
    undefined,
    "JOI Design",
  ),
  P(
    "Hotel New Bengal",
    "Mumbai",
    "Hospitality",
    undefined,
    "Hotel New Bengal",
    "Skyline",
  ),
  P("Amigos Hotel", "Goa", "Hospitality", undefined, "Amigos", "Ulysis Design"),
  P(
    "Ranthambore Forest Resort",
    "Ranthambore",
    "Hospitality",
    100000,
    undefined,
    "Magic Oxide",
  ),
  P(
    "Mandu Resort",
    "Mandu",
    "Hospitality",
    50000,
    "Madhya Pradesh Govt.",
    "Finer Edge",
    { tags: [GOV] },
  ),
  P(
    "Convention Centre, Khajuraho",
    "Khajuraho",
    "Hospitality",
    70000,
    "Madhya Pradesh Govt.",
    "Finer Edge",
    { tags: [GOV] },
  ),
  P(
    "Gokul Vatika",
    "Jaipur",
    "Hospitality",
    undefined,
    undefined,
    "Magic Oxide",
  ),
  P(
    "SAZ Restaurant, BKC",
    "Mumbai",
    "Hospitality",
    3000,
    "SAZ",
    "Patch Design Studio",
  ),
  P("eve Restaurant, Powai", "Mumbai", "Hospitality", 3000, "eve", "KNS"),
  P(
    "Ginger Hotel",
    "Bengaluru",
    "Hospitality",
    undefined,
    "Ginger Hotels",
    undefined,
    { noCover: true },
  ),
  P("Ginger Hotel", "Bhubaneswar", "Hospitality", undefined, "Ginger Hotels"),
  P("Fabcafe, Amritsar", "Amritsar", "Hospitality", 3000, "Fabcafe"),
  P("Fabcafe, Indore", "Indore", "Hospitality", 3000, "Fabcafe"),
  P("Fabcafe, Coimbatore", "Coimbatore", "Hospitality", 3000, "Fabcafe"),
  P("Fabcafe, Gachibowli", "Hyderabad", "Hospitality", 3000, "Fabcafe"),
  P("McDonald's, Sekaran Mall", "Chennai", "Hospitality", 2500, "McDonald's"),
  P("McDonald's, Belgaum", "Belagavi", "Hospitality", 2500, "McDonald's"),
  // Healthcare
  P(
    "CritiCare / Kohinoor Hospital, Kurla",
    "Mumbai",
    "Healthcare",
    undefined,
    "CritiCare",
  ),
  P(
    "Gaurabai Maternity Hospital, Nagpada",
    "Mumbai",
    "Healthcare",
    undefined,
    "Govt. of Maharashtra",
    "Hafeez Contractor",
    { tags: [GOV] },
  ),
  P(
    "New Millat Hospital",
    "Mumbai",
    "Healthcare",
    undefined,
    "Millat Hospital",
  ),
  P(
    "BMC Intervention Centre",
    "Mumbai",
    "Healthcare",
    undefined,
    "BMC",
    "Hafeez Contractor",
    { tags: [GOV] },
  ),
  P(
    "SRV Hospital, Chembur",
    "Mumbai",
    "Healthcare",
    undefined,
    "SRV Hospital",
    "Haresh Gidye",
  ),
  P(
    "SRV Hospital, Goregaon",
    "Mumbai",
    "Healthcare",
    undefined,
    "SRV Hospital",
    "Haresh Gidye",
  ),
  P(
    "CritiCare Hospital, Malad",
    "Mumbai",
    "Healthcare",
    undefined,
    "CritiCare",
  ),
  P("KEM Hospital", "Mumbai", "Healthcare", undefined, "KEM Hospital", "SKD", {
    tags: [GOV],
    noCover: true,
  }),
  // Institutional & heritage
  P(
    "Delhi Public School",
    "Rudrapur",
    "Institutional",
    250000,
    "Delhi Public School",
    "Finer Edge",
  ),
  P(
    "Delhi Public School",
    "Mehsana",
    "Institutional",
    200000,
    "Delhi Public School",
    "Magic Oxide",
  ),
  P("i Global School", "Vasai", "Institutional", 300000, "Imperial Life Style"),
  P(
    "Asmita College of Architecture & Law",
    "Mira Road",
    "Institutional",
    250000,
    "Asmita",
    "Ahmed Associates",
  ),
  P(
    "AMU Pharmacy College",
    "Aligarh",
    "Institutional",
    60000,
    undefined,
    "M.E. Eran & Associates",
  ),
  P("Birla School", "Kolkata", "Institutional", 40000, "Birla Group", "ANA"),
  P(
    "Sir J. J. School of Art",
    "Mumbai",
    "Institutional",
    30000,
    undefined,
    "K. Unwalla",
    { tags: [HER, GOV] },
  ),
  P(
    "Sreepadam Palace Museum",
    "Thiruvananthapuram",
    "Institutional",
    undefined,
    "Archaeological Survey of India",
    "K. Unwalla",
    { tags: [HER, GOV] },
  ),
  P(
    "Advanced Learning Centre (Library)",
    "Patna",
    "Institutional",
    75000,
    "Patna Municipal Corporation",
    "Hafeez Contractor",
    { tags: [GOV] },
  ),
  P("Afghan Church", "Mumbai", "Religious", 30000, undefined, "K. Unwalla", {
    tags: [HER],
  }),
  P("Juma Masjid", "Mumbai", "Religious", 50000, undefined, "K. Unwalla", {
    tags: [HER],
  }),
  P(
    "Taloja Jama Masjid",
    "Navi Mumbai",
    "Religious",
    40000,
    undefined,
    "Abrar Arch",
  ),
  // Industrial
  P("Perfume Factory", "Wada", "Industrial", 300000, undefined, "Bomi Irani"),
  P(
    "Star Labels Factory",
    "Lubumbashi",
    "Industrial",
    100000,
    "Retail Detailz",
    "Retail Detailz",
    { tags: [INT] },
  ),
  P(
    "66/33 kV Substation",
    "Thimphu",
    "Industrial",
    75000,
    undefined,
    undefined,
    { tags: [INT] },
  ),
  P("TAGMA", "Pune", "Industrial", 150000, "TAGMA", "Ratan J Batliboi"),
  P("DHL Vikhroli", "Mumbai", "Industrial", 50000, "DHL", "DCH Architects"),
  // Township & bungalows
  P(
    "Thansit City, Shahpur",
    "Shahpur",
    "Township",
    2500000,
    "Mittal Painterior Realty",
    "Hafeez Contractor",
    { tags: [MOEF] },
  ),
  P(
    "Thousand Palms, Sancoale",
    "Goa",
    "Township",
    250000,
    "Ashoka Realty",
    "Spectrum",
    { tags: [MOEF] },
  ),
  P(
    "Casa Unico",
    "Karjat",
    "Township",
    180000,
    "Landmark Developers",
    "GA Design",
  ),
  P("Villa Vaibhav", "Raipur", "Township", 125000, undefined, "Magic Oxide"),
  P("Mandala Alibaug", "Alibaug", "Bungalows", 550000, "Tricone"),
  P("Pernem 28k", "Goa", "Bungalows", 475000, "Isprava"),
  P("Pomburpa Villas", "Goa", "Bungalows", 300000, "Isprava"),
  P(
    "Fern Hills Development",
    "Ooty",
    "Bungalows",
    150000,
    undefined,
    "SPASM Design",
  ),
  P("Private Bungalow", "Nairobi", "Bungalows", 12000, undefined, "KNS", {
    tags: [INT],
  }),
  P("Springvale Villa", "Washington", "Bungalows", 10000, undefined, "KNS", {
    tags: [INT],
  }),
  // Retail & chains
  P(
    "Kasa Vubu Mall",
    "Kinshasa",
    "Retail",
    75000,
    "KIN Marche",
    "Retail Detailz",
    { tags: [INT] },
  ),
  P("KM Jolie", "Kolwezi", "Retail", 20000, "KIN Marche", "Retail Detailz", {
    tags: [INT],
  }),
  P(
    "SS Mall",
    "Patna",
    "Retail",
    100000,
    "Sumeet Infraventures",
    "S.P & Associates",
  ),
  P("D Mart, Kalyan", "Kalyan", "Retail", 40000, "D Mart"),
  P("D Mart, Nashik", "Nashik", "Retail", 40000, "D Mart"),
  P("D Mart, Nagpur", "Nagpur", "Retail", 40000, "D Mart", undefined, {
    noCover: true,
  }),
  P("D Mart, Lucknow", "Lucknow", "Retail", 40000, "D Mart"),
  P("D Mart, Kanpur", "Kanpur", "Retail", 40000, "D Mart"),
  P("D Mart, Ludhiana", "Ludhiana", "Retail", 40000, "D Mart"),
  P("D Mart, Noida", "Noida", "Retail", 40000, "D Mart"),
  P("Baggit, Guwahati", "Guwahati", "Retail", 1500, "Baggit"),
  P("Baggit, Jamshedpur", "Jamshedpur", "Retail", 1500, "Baggit"),
  P("Baggit, Vegas Mall", "Delhi", "Retail", 1500, "Baggit"),
  P("Fabindia, Oberoi Mall", "Mumbai", "Retail", 5000, "Fabindia", "SKD"),
  P("Fabindia, Aundh", "Pune", "Retail", 5000, "Fabindia"),
];

/** Placeholder wordmark standing in for Company.logo: no real brand artwork in the repo. */
function wordmark(name: string, i: number) {
  const hue = (i * 47) % 360;
  const text = name.length > 18 ? initialsOfWords(name) : name;
  // Fit the word into the 156-unit text box (Arial bold averages ~0.62 em per glyph).
  const size = Math.min(30, Math.floor(156 / (text.length * 0.62)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 96"><rect x="4" y="18" width="60" height="60" rx="14" fill="hsl(${hue} 65% 42%)"/><text x="34" y="58" font-family="Arial" font-size="26" font-weight="800" fill="#fff" text-anchor="middle">${initialsOfWords(name).slice(0, 2)}</text><text x="76" y="${48 + size / 3}" font-family="Arial" font-size="${size}" font-weight="800" fill="hsl(${hue} 55% 28%)">${text.replace(/&/g, "&amp;")}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const initialsOfWords = (s: string) =>
  s
    .split(/[\s&.'-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");

/** Client company type, the way the brochure groups its logo pages. In the app: CompanyType. */
function clientType(name: string): string {
  const ps = DEMO_PROJECTS.filter((p) => p.client === name);
  if (ps.some((p) => p.tags.includes(GOV))) return "Government";
  const t = ps[0]?.typology;
  if (t === "Residential" || t === "Township" || t === "Bungalows")
    return "Builder";
  if (t === "Hospitality" || t === "Healthcare" || t === "Retail") return t;
  return "Corporate";
}

const clientNames = [
  ...new Set(DEMO_PROJECTS.flatMap((p) => (p.client ? [p.client] : []))),
];
const architectNames = [
  ...new Set(DEMO_PROJECTS.flatMap((p) => (p.architect ? [p.architect] : []))),
];
export const DEMO_COMPANIES: ProfileCompany[] = [
  ...clientNames.map((name, i) => ({
    id: `c${i}`,
    name,
    types: [clientType(name)],
    logo: i % 9 === 8 ? null : wordmark(name, i),
  })),
  ...architectNames
    .filter((name) => !clientNames.includes(name))
    .map((name, i) => ({
      id: `a${i}`,
      name,
      types: ["Architect"],
      logo: i % 7 === 6 ? null : wordmark(name, i + 3),
    })),
];

/** CRM services (ProjectService) with their LeadService project counts. */
export const DEMO_SERVICES: ProfileService[] = [
  ["Electrical", 601],
  ["Public Health Engineering", 577],
  ["HVAC", 548],
  ["Fire Protection", 512],
  ["ELV & Security", 233],
  ["IBMS / BMS", 141],
  ["BIM", 88],
  ["3rd Party Testing & Audit", 64],
  ["Interior (associate)", 52],
  ["Green Building", 41],
  ["Structural (associate)", 35],
  ["MOEF", 28],
  ["Architectural (associate)", 19],
].map(([name, projects], i) => ({
  id: `s${i}`,
  name: name as string,
  projects: projects as number,
}));

const DEMO_ORG: OrgProfile = {
  legalName: "WISETECH MEP Consultants Pvt. Ltd.",
  wordmark: ["WISE", "TECH"],
  tagline: ["Engineering Solutions.", "Building Tomorrow."],
  slogan: "Built on Trust. Driven by Innovation.",
  foundedIn: 2005,
  homeCity: "Mumbai",
  about: [
    "WISETECH MEP Consultants Pvt. Ltd. is a design consulting firm based in Mumbai, India, and a leading services provider in mechanical, electrical, plumbing and fire-fighting design. We focus on continuous improvement, efficient design and value engineering on every project.",
    "We serve offices, IT complexes, campuses & SEZs, high-rise residences and townships, institutional buildings, hotels and hospitals, malls and multiplexes, studios, industries, laboratories and banks, across India and abroad. Through our associates we also offer structural, green building, MOEF and interior design.",
  ],
  vision:
    "To be the most customer-satisfying company in the consultancy market, with the most technical and knowledgeable team, doing business on business ethics.",
  mission:
    "Dedication to the highest quality of custom service, on time, with our all-time availability.",
  values: [
    { label: "Customer", text: "We make the most satisfied customers." },
    {
      label: "Team",
      text: "We build the most technical and knowledgeable team.",
    },
    { label: "Working", text: "We do business on business ethics." },
  ],
  // Company history, copy supplied by the company (2026-11-13).
  milestones: [
    {
      year: 2017,
      title: "Company Founded",
      text: "Started in Mumbai with a team of three.",
    },
    {
      year: 2019,
      title: "Office Expansion",
      text: "Moved to a new office and grew to nearly 25 team members.",
    },
    {
      year: 2021,
      title: "Jogeshwari Office",
      text: "Opened a new office with a capacity of 35 people.",
    },
    {
      year: 2026,
      title: "Vashi Branch",
      text: "Expanded our presence with a new branch office in Vashi.",
    },
  ],
  pillars: [
    {
      title: "MEP Design",
      text: "Innovative, efficient & sustainable design solutions.",
    },
    {
      title: "Engineering Excellence",
      text: "Delivering precision-engineered systems across industries.",
    },
    {
      title: "Collaborate",
      text: "Partnering with clients to turn ideas into impactful realities.",
    },
    {
      title: "Commitment",
      text: "Dedicated to quality, safety and long-term value.",
    },
  ],
  address:
    "1st Floor, Loonawat Compound, Ghaswala Estate, next to Millat Hospital, SV Road, Jogeshwari (W), Mumbai 400102",
  phone: "+91 22 4673 2679",
  website: "www.wisetech-mep.com",
  hero: coverHero,
  site: scene("ceiling", 998),
};

export const DEMO_DATA: ProfileData = {
  org: DEMO_ORG,
  totals: {
    projects: 668,
    completed: 468,
    clients: 214,
    team: 38,
    countries: 6,
    cities: 60,
    inHomeCity: 512,
  },
  projects: DEMO_PROJECTS,
  companies: DEMO_COMPANIES,
  services: DEMO_SERVICES,
};

/* ---------- The default deck: a section per project category; the logo wall holds every client and architect ---------- */

const fixed = (
  kind: "cover" | "about" | "vision" | "contact",
  title: string,
): Section => ({ id: kind, kind, title, enabled: true });
const clients = clientsSection(DEMO_DATA);

export const DEMO_SECTIONS: Section[] = [
  fixed("cover", "Cover"),
  fixed("about", "About us"),
  fixed("vision", "Who we are"),
  {
    id: "services",
    kind: "services",
    title: "Services we offer",
    enabled: true,
    ids: DEMO_SERVICES.slice(0, 8).map((s) => s.id),
  },
  ...categorySections(DEMO_PROJECTS),
  clients,
  // The wall lists clients first, most projects first: the top 8 are the repeat clients.
  {
    id: "repeat",
    kind: "companies",
    title: "Repeat clients",
    enabled: true,
    display: "chart",
    ids: clients.ids.slice(0, 8),
  },
  {
    id: "india",
    kind: "map",
    title: "Our projects across India",
    enabled: true,
    region: "india",
    ids: places(DEMO_PROJECTS, "india")
      .slice(0, PICK_LIMIT.map)
      .map((p) => p.id),
  },
  {
    id: "world",
    kind: "map",
    title: "Our projects worldwide",
    enabled: true,
    region: "world",
    ids: places(DEMO_PROJECTS, "world").map((p) => p.id),
  },
  fixed("contact", "Contact"),
];
