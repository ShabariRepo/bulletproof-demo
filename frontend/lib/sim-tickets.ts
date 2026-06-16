// Random Tier-1 ticket generator for the Live Simulation page.
//
// Each template produces a realistic support ticket spanning every Tier-1
// category the Bonito Triage Router knows about. Templates carry an
// `expectedRouting` so the simulation can measure triage correctness against
// the REAL routing decision returned by the agent.
//
// Randomization keeps every press feeling fresh (client, user, device, error
// code, software, etc.) without changing the category/expected routing.

export type SimCategory =
  | "password_account"
  | "connectivity_vpn"
  | "software_provisioning"
  | "hardware_general"
  | "escalation";

export type SimTicket = {
  id: string;
  subject: string;
  body: string;
  category: SimCategory;
  // One of the specialist slugs or "ESCALATION".
  expectedRouting: string;
};

const CLIENTS = [
  "Maple Ridge Municipality",
  "GamingCo International",
  "TechStart Innovation",
  "Apex Logistics",
  "Northern Health Network",
  "Apex Financial Group"
];

const FIRST_NAMES = [
  "Sarah",
  "John",
  "Priya",
  "Mike",
  "Alex",
  "Dana",
  "Marcus",
  "Lena",
  "Omar",
  "Grace",
  "Tariq",
  "Nina"
];

const LAST_NAMES = [
  "Chen",
  "Martinez",
  "Sharma",
  "Torres",
  "Kim",
  "Okafor",
  "Nguyen",
  "Patel",
  "Rossi",
  "Walsh"
];

const DEVICES = [
  "Dell Latitude 7440",
  "Lenovo ThinkPad X1",
  "HP EliteBook 840",
  "MacBook Pro 14",
  "Surface Laptop 5"
];

const APPROVED_SOFTWARE = ["Slack", "Zoom", "Adobe Acrobat Reader", "Notion", "Microsoft Teams"];
const DENIED_SOFTWARE = ["uTorrent", "TeamViewer (personal)", "a random PDF converter from a popup", "Spotify", "BitTorrent"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function person() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return { first, last, full: `${first} ${last}` };
}

function emailFor(name: { first: string; last: string }, client: string) {
  const domain = client.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "client";
  return `${name.first[0].toLowerCase()}${name.last.toLowerCase()}@${domain}.com`;
}

type Template = (ctx: { client: string }) => Omit<SimTicket, "id">;

const TEMPLATES: Template[] = [
  // --- password_account ---
  ({ client }) => {
    const p = person();
    return {
      category: "password_account",
      expectedRouting: "password-specialist",
      subject: "Can't log in — password expired over the weekend",
      body: `Hi, this is ${p.full} from ${client}. My password expired and now I can't log in to my workstation. Username is ${emailFor(p, client)}. I'm at the main office and have a meeting shortly — can you help me reset it?`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "password_account",
      expectedRouting: "password-specialist",
      subject: "Account locked after too many attempts",
      body: `${p.full} at ${client} here. I'm locked out of my account after ${randInt(5, 9)} failed login emails overnight — I think someone tried to guess my password. Username is ${emailFor(p, client)}. I need access for a call this morning.`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "password_account",
      expectedRouting: "password-specialist",
      subject: "New phone, MFA codes not working",
      body: `I'm ${p.full} at ${client}. I got a new phone and now my authenticator app isn't generating codes, so I can't get into any of our systems. Employee ID: ${client.slice(0, 2).toUpperCase()}-${randInt(1000, 9999)}. Please help, it's urgent.`
    };
  },
  // --- connectivity_vpn ---
  ({ client }) => {
    const p = person();
    const err = pick(["443", "868", "412", "720"]);
    return {
      category: "connectivity_vpn",
      expectedRouting: "connectivity-specialist",
      subject: `VPN won't connect — error ${err}`,
      body: `This is ${p.full}, working remote for ${client}. My VPN client keeps failing with "server communication error. Error ${err}." It was fine yesterday. Running ${pick(["Windows 11", "Windows 10", "macOS Sonoma"])} on a ${pick(DEVICES)}.`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "connectivity_vpn",
      expectedRouting: "connectivity-specialist",
      subject: "New employee needs VPN access",
      body: `Hi, I'm the office manager at ${client}. We just hired ${p.full} (${emailFor(p, client)}) and they need VPN access to our dev environment. They start Monday and will be fully remote. Can you get them provisioned?`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "connectivity_vpn",
      expectedRouting: "connectivity-specialist",
      subject: "WiFi keeps dropping in the branch office",
      body: `${p.full} from ${client}. The WiFi at our branch office keeps dropping every ${randInt(5, 20)} minutes and reconnecting. It's affecting the whole floor — about ${randInt(6, 25)} people. Hard-wired machines are fine.`
    };
  },
  // --- software_provisioning ---
  ({ client }) => {
    const p = person();
    const sw = pick(APPROVED_SOFTWARE);
    return {
      category: "software_provisioning",
      expectedRouting: "software-specialist",
      subject: `Need ${sw} installed`,
      body: `Hi, ${p.full} at ${client}. I need ${sw} installed on my ${pick(DEVICES)} for an upcoming project. My manager has approved it. Can you push the install or send me the link?`
    };
  },
  ({ client }) => {
    const p = person();
    const sw = pick(DENIED_SOFTWARE);
    return {
      category: "software_provisioning",
      expectedRouting: "software-specialist",
      subject: `Can I install ${sw}?`,
      body: `${p.full} from ${client} here. I'd like to install ${sw} on my work laptop to make a few things easier. Is that allowed? If not, is there an approved alternative?`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "software_provisioning",
      expectedRouting: "software-specialist",
      subject: "License request for design software",
      body: `Hi, ${p.full} at ${client}. Our team needs ${randInt(2, 6)} more seats of ${pick(["Adobe Creative Cloud", "Figma", "AutoCAD"])}. We're onboarding new designers next sprint. How do we request the licenses?`
    };
  },
  // --- hardware_general ---
  ({ client }) => {
    const p = person();
    return {
      category: "hardware_general",
      expectedRouting: "general-support",
      subject: "Laptop won't power on after update",
      body: `${p.full} from ${client}. My ${pick(DEVICES)} won't power on after last night's update — no lights, nothing on the screen. I've tried holding the power button. I have a deadline today.`
    };
  },
  ({ client }) => {
    const p = person();
    return {
      category: "hardware_general",
      expectedRouting: "general-support",
      subject: "Monitor flickering and going black",
      body: `Hi, ${p.full} at ${client}. My external monitor keeps flickering and randomly going black for a few seconds. I've reseated the cable. It's a ${pick(["27-inch Dell", "24-inch LG", "Samsung ultrawide"])}. Is it the cable or the monitor?`
    };
  },
  // --- escalation: security alert ---
  ({ client }) => {
    const p = person();
    return {
      category: "escalation",
      expectedRouting: "ESCALATION",
      subject: "Suspicious login alert from another country",
      body: `URGENT — ${p.full}, IT lead at ${client}. Our SIEM (Microsoft Sentinel) just fired a high-severity alert: a successful login to ${emailFor(p, client)} from an IP in another country, minutes after a login here. We may have a compromised account. Need this handled now.`
    };
  },
  // --- escalation: org-wide outage ---
  ({ client }) => {
    return {
      category: "escalation",
      expectedRouting: "ESCALATION",
      subject: "Entire office can't reach email or shared drives",
      body: `This is the operations director at ${client}. The ENTIRE office — all ${randInt(40, 120)} staff — suddenly lost access to email and our shared drives about 10 minutes ago. Nothing is loading. This is business-critical, please escalate immediately.`
    };
  },
  // --- escalation: exec request ---
  ({ client }) => {
    const p = person();
    return {
      category: "escalation",
      expectedRouting: "ESCALATION",
      subject: "CEO laptop encrypted by ransomware note",
      body: `${p.full} here at ${client}. Our CEO's laptop just showed a full-screen ransom note and all their files are renamed with a weird extension. We've unplugged it from the network. This needs immediate senior attention.`
    };
  }
];

let counter = 0;

/**
 * Generate a fresh random Tier-1 ticket. Optionally force a category.
 * Safe to call inside a Next route handler (uses Date.now()/Math.random()).
 */
export function generateRandomTicket(forceCategory?: SimCategory): SimTicket {
  const pool = forceCategory ? TEMPLATES.filter((t) => t({ client: CLIENTS[0] }).category === forceCategory) : TEMPLATES;
  const template = pick(pool.length ? pool : TEMPLATES);
  const client = pick(CLIENTS);
  const base = template({ client });

  counter += 1;
  const seq = String((Date.now() % 100000) + counter).padStart(5, "0").slice(-5);
  const id = `SIM-${seq}`;

  return { id, ...base };
}

export const SIM_CATEGORIES: SimCategory[] = [
  "password_account",
  "connectivity_vpn",
  "software_provisioning",
  "hardware_general",
  "escalation"
];
