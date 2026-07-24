/**
 * Official CGU program facts used across generated documents
 * (admission letters, enrollment letters, transcripts).
 */
export interface ProgramInfo {
  code: string; // BBA | MBA | DBA | PRG (fallback)
  duration: string;
  durationYears: string;
  credits: string;
  priorCredential: string;
}

const PROGRAMS: Record<string, Omit<ProgramInfo, "code">> = {
  BBA: {
    duration: "3 Years (Standard Track)",
    durationYears: "3 Academic Years",
    credits: "180 Semester Credit Hours",
    priorCredential: "high school diploma",
  },
  MBA: {
    duration: "2 Years (Standard Track)",
    durationYears: "2 Academic Years",
    credits: "90 Semester Credit Hours",
    priorCredential: "bachelor's degree",
  },
  DBA: {
    duration: "3 Years (Standard Track)",
    durationYears: "3 Academic Years",
    credits: "180 Semester Credit Hours",
    priorCredential: "master's degree",
  },
};

export function resolveProgramInfo(programName: string): ProgramInfo {
  const name = programName.toLowerCase();
  let code = "PRG";
  if (name.includes("dba") || name.includes("doctor")) code = "DBA";
  else if (name.includes("mba") || name.includes("master")) code = "MBA";
  else if (name.includes("bba") || name.includes("bachelor")) code = "BBA";
  const info = PROGRAMS[code] ?? {
    duration: "Self-Paced (Standard Track)",
    durationYears: "Self-Paced",
    credits: "As per program framework",
    priorCredential: "prior qualification",
  };
  return { code, ...info };
}

/**
 * Which accreditation body validates the enrollment letter for a programme.
 * IEAC letters are issued only for BBA/MBA/DBA programmes; every other
 * programme (certificates, diplomas, etc.) gets the EAHEA letter.
 */
export function letterValidatorFor(programName: string): "ieac" | "eahea" {
  return resolveProgramInfo(programName).code === "PRG" ? "eahea" : "ieac";
}

export const ACCREDITATIONS: Array<{ title: string; body: string }> = [
  {
    title: "International Education Accreditation Council (IEAC) Accreditation:",
    body: "Central Global University is fully accredited by the Council, confirming compliance with comprehensive global standards for academic governance, rigorous course curriculum, and student support metrics.",
  },
  {
    title: "European Agency for Higher Education Accreditation (EAHEA) Accreditation:",
    body: "CGU is fully accredited by the Agency and has been awarded a prestigious 3-Star Quality Rating, reflecting outstanding institutional governance, student support services, and curriculum alignment with European Higher Education Area (EHEA) standards.",
  },
  {
    title:
      "International Association for Quality Assurance in Pre-Tertiary & Higher Education (QAHE) Accreditation:",
    body: "Officially accredited by the Association, confirming that CGU consistently adheres to international quality assurance benchmarks.",
  },
  {
    title: "International Academic Recognition Council (IARC) Registration:",
    body: "Globally approved and registered as an Organisational Member under the Council, Austria (Registration No. 83462026AU).",
  },
  {
    title: "European Council of Leading Business Schools (ECLBS) Membership:",
    body: "CGU is a recognized institutional member of the Council, reinforcing our integration into European business education networks.",
  },
  {
    title: "United States Distance Learning Association (USDLA) Membership:",
    body: "Holds active Institutional Membership with the Association, meeting global frameworks for digital pedagogies, modern distance teaching tools, and accessible, student-centered e-learning frameworks.",
  },
];
