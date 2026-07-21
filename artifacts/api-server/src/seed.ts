import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
  materialProgressTable,
  assignmentsTable,
  submissionsTable,
  examsTable,
  paymentPlansTable,
} from "@workspace/db";

// Served from our own object storage via /api/storage/objects/... — the old
// Google sample bucket (gtv-videos-bucket) now returns 403 for public access.
const SAMPLE_VIDEO = "/objects/videos/sample-lecture.mp4";
const SAMPLE_PDF =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

interface ModuleSeed {
  title: string;
  description?: string;
  credits?: number; // ECTS; defaults to 7.5
  year: number;
  semester: number;
  assignmentTitle: string;
  assignmentTask: string;
}

/**
 * Official assignment specifications (format, weight/length, evaluation
 * benchmarks) keyed by module code, taken from the CGU assessment syllabi.
 */
const ASSIGNMENT_SPECS: Record<
  string,
  { format: string; length: string; benchmarks: string[] }
> = {
  // BBA — Year 1
  BUS110: {
    format: "Executive Briefing & Communication Plan",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Professionalism, clarity, tone, and appropriate structural layout of executive-level office memos.",
      "Strategic viability of the multichannel communication deployment blueprint.",
    ],
  },
  MGT120: {
    format: "Comprehensive Organizational Audit",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Accurate conceptual application of the POLC matrix to real-world management.",
      "Critical quality of structural management recommendations.",
    ],
  },
  ACC130: {
    format: "Financial Statement Construction Portfolio",
    length: "100% / Ledger Balancing + 1,000 Words",
    benchmarks: [
      "Absolute structural and numerical balancing accuracy across financial sheets.",
      "Compliant implementation of fundamental double-entry principles.",
    ],
  },
  BUS140: {
    format: "Digital Commerce Platform Blueprint",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Technical feasibility of payment gateways, inventory sync architectures, and compliance models.",
      "Integration effectiveness of user acquisition and security metrics.",
    ],
  },
  ECO150: {
    format: "Micro & Macro Market Impact Report",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Proper structural deployment of supply-demand curves and economic variables.",
      "Data-driven evaluation of policy interventions on market equilibrium.",
    ],
  },
  FIN160: {
    format: "Corporate Capital Budgeting Case Analysis",
    length: "100% / 1,500 Words + Excel Models",
    benchmarks: [
      "Mathematical precision in discounting future cash flows and tracking hurdle rates.",
      "Logical justification of capital-allocation choices under fiscal limits.",
    ],
  },
  MKT170: {
    format: "Strategic Marketing Mix Portfolio (4Ps)",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Depth and accuracy of market segment targeting criteria.",
      "Strategic alignment across positioning statements and pricing models.",
    ],
  },
  HRM180: {
    format: "Workforce Optimization & Retention Strategy",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Alignment of compensation strategies with modern organizational behavior principles.",
      "Legal and ethical compliance of proposed labor and productivity metrics.",
    ],
  },
  // BBA — Year 2
  ACT210: {
    format: "Corporate Financial Statement Analysis",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Accuracy of calculated ratio formulas (Quick ratio, ROE, Debt-to-Equity).",
      "Insightfulness of the structural commentary regarding operational weaknesses.",
    ],
  },
  MGT220: {
    format: "Process Mapping & Quality Optimization Report",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Correct structural use of workflow diagramming and capacity constraints.",
      "Viability and direct cost-benefit calculation of the optimized process layout.",
    ],
  },
  BUS230: {
    format: "Start-up Pitch Deck & Feasibility Report",
    length: "100% / 2,500 Words",
    benchmarks: [
      "Realism and structural integrity of market penetration and financial modeling assumptions.",
      "Clarity and persuasiveness of the underlying competitive advantage statement.",
    ],
  },
  BUS240: {
    format: "Corporate ESG Transformation Strategy",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Actionable, metrics-driven balance between corporate profits and environmental targets.",
      "Thorough understanding of regulatory sustainability frameworks and compliance rules.",
    ],
  },
  FIN250: {
    format: "IFRS Compliance Evaluation Framework",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Accurate technical references and interpretation of explicit IFRS rules.",
      "Precision in adjusting accounting entries to reconcile compliance errors.",
    ],
  },
  MGT260: {
    format: "Global Supply Network Optimization Model",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Mathematical precision in inventory planning and logistics safety stock metrics.",
      "Strategic depth of the multi-modal risk management backup network.",
    ],
  },
  MKT270: {
    format: "International Market Campaign Localization Deck",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Academic mastery in leveraging Hofstede's index metrics to reshape marketing messaging.",
      "Avoidance of ethnocentric blind spots and cultural missteps in advertising design.",
    ],
  },
  MGT280: {
    format: "Enterprise IT Architecture Plan",
    length: "100% / 1,500 Words",
    benchmarks: [
      "Logical cohesion of data flows between isolated enterprise software platforms.",
      "Adequacy of information access controls and modern cybersecurity frameworks.",
    ],
  },
  // BBA — Year 3
  IBM310: {
    format: "Global Entry Strategy Paper",
    length: "100% / 2,200 Words",
    benchmarks: [
      "Depth of real-world regulatory risk assessment for the target country.",
      "Strategic alignment of the chosen corporate vehicle with local market realities.",
    ],
  },
  IBM320: {
    format: "Cross-Border Human Capital Framework",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Sophistication of expatriate support systems and cost mitigation planning.",
      "Adherence to international labor standards and regional regulatory requirements.",
    ],
  },
  IBM330: {
    format: "PESTLE Macro-Environmental Audit",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Analytical depth across macro pillars (Political, Economic, Social, Technological, Legal, Environmental).",
      "Viability of proposed risk hedging and long-term asset security recommendations.",
    ],
  },
  IBM340: {
    format: "Trade Balance & FX Exposure Analysis",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Correct application of international trade theories (e.g., comparative advantage, Heckscher-Ohlin).",
      "Technical accuracy in calculating currency risk exposures and hedging solutions.",
    ],
  },
  IBM350: {
    format: "Global Brand Positioning Portfolio",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Strategic logic behind decisions to standardize or adapt specific brand components.",
      "Design effectiveness of cross-border promotional frameworks.",
    ],
  },
  IBM360: {
    format: "Global Trade Compliance & Logistics Manifest",
    length: "100% / 1,800 Words",
    benchmarks: [
      "Flawless application of Incoterms 2020 definitions and corresponding liability transfers.",
      "Completeness and statutory compliance of the generated cross-border documentation.",
    ],
  },
  IBM370: {
    format: "Trade Protectionism Impact Thesis",
    length: "100% / 2,000 Words",
    benchmarks: [
      "Quality of data-driven analysis tracking the economic friction caused by trade barriers.",
      "Strategic value of alternative sourcing and supplier reorganization configurations.",
    ],
  },
  IBM380: {
    format: "Strategic Business Plan & Defense Thesis",
    length: "100% / 5,000 Words + Presentation",
    benchmarks: [
      "Advanced synthesis of financial, operational, marketing, and human capital theories.",
      "Methodological rigor, empirical evidence depth, and executive-level oral defense clarity.",
    ],
  },
  // MBA — graduate Application-Oriented Assignments (AOA)
  MBA510: {
    format: "Global Market Entry Strategy Dossier",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Depth of regulatory, political, and market-access risk assessment for the target region.",
      "Strategic alignment of the chosen entry vehicle (FDI, JV, licensing, alliance) with corporate objectives.",
    ],
  },
  MBA520: {
    format: "Lean Operations & Quality Optimization Audit",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Quantitative tracing of cycle times, capacity constraints, and process bottlenecks.",
      "Viability and cost-benefit calculation of the optimized Lean/Six Sigma process layout.",
    ],
  },
  MBA530: {
    format: "Executive Communication & Change Briefing Plan",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Professionalism, clarity, and structural quality of executive-level communications.",
      "Strategic viability of the multichannel corporate communication deployment blueprint.",
    ],
  },
  MBA540: {
    format: "Enterprise Digital Commerce Architecture",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Technical feasibility of payment gateways, inventory sync architectures, and compliance models.",
      "Integration effectiveness of customer acquisition, analytics, and security frameworks.",
    ],
  },
  MBA550: {
    format: "Macro & Micro Market Impact Analysis",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Proper structural deployment of supply-demand modelling and economic variables.",
      "Data-driven evaluation of policy interventions on market equilibrium.",
    ],
  },
  MBA560: {
    format: "Corporate ESG Transformation Strategy",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Actionable, metrics-driven balance between corporate profits and environmental targets.",
      "Thorough understanding of regulatory sustainability frameworks and GRI compliance rules.",
    ],
  },
  MBA570: {
    format: "Venture Blueprint & Investor Feasibility Study",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Realism and structural integrity of market penetration and financial modeling assumptions.",
      "Clarity and persuasiveness of the underlying competitive advantage statement.",
    ],
  },
  MBA580: {
    format: "Enterprise Information Architecture Plan",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Logical cohesion of data flows between enterprise software platforms (CRM, ERP, BI).",
      "Adequacy of information governance, access controls, and cybersecurity frameworks.",
    ],
  },
  MBA590: {
    format: "Strategic Workforce & Talent Architecture",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Alignment of compensation and retention strategies with organizational behavior principles.",
      "Legal and ethical compliance of proposed labor and performance metrics.",
    ],
  },
  MBA600: {
    format: "Corporate Capital Budgeting & Valuation Case",
    length: "100% / 3,500 Words + Financial Models",
    benchmarks: [
      "Mathematical precision in discounting future cash flows and tracking hurdle rates.",
      "Logical justification of capital-allocation choices under fiscal constraints.",
    ],
  },
  MBA610: {
    format: "Integrated Strategic Marketing Portfolio",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Depth and accuracy of market segment targeting and positioning criteria.",
      "Strategic alignment across brand positioning, channels, and pricing models.",
    ],
  },
  MBA620: {
    format: "Executive Organizational Strategy Audit",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Accurate application of the POLC and corporate governance frameworks to a live organization.",
      "Critical quality of structural management recommendations.",
    ],
  },
  MBA630: {
    format: "Global Supply Network Optimization Model",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Mathematical precision in inventory planning and logistics safety stock metrics.",
      "Strategic depth of the multi-tier risk management and supplier redundancy network.",
    ],
  },
  MBA640: {
    format: "Corporate Financial Statement Construction & Analysis",
    length: "100% / 3,500 Words + Ledger Workings",
    benchmarks: [
      "Structural and numerical accuracy across constructed financial statements.",
      "Insightfulness of comparative ratio analysis and operational commentary.",
    ],
  },
  MBA650: {
    format: "IFRS Compliance Evaluation Framework",
    length: "100% / 3,500 Words",
    benchmarks: [
      "Accurate technical references and interpretation of explicit IFRS rules.",
      "Precision in adjusting accounting entries to reconcile compliance errors.",
    ],
  },
  MBA690: {
    format: "Empirical Business Thesis & Viva Voce Defense",
    length: "100% / 12,000 – 15,000 Words",
    benchmarks: [
      "Methodological rigor, clarity of data validation, and depth of literature integration.",
      "Practical corporate value of findings and performance under cross-examination by the board.",
    ],
  },
  // DBA — doctoral milestones
  RBL810: {
    format: "Mixed-Methods Research Proposal & Data Analysis Strategy",
    length: "100% / Formal Research Proposal",
    benchmarks: [
      "Critical problem formulation with operational hypotheses and research questions.",
      "Robust research instrumentation and a structured analytical triangulation strategy.",
    ],
  },
  RBL820: {
    format: "Critical Systematic Literature Review & Theoretical Framework",
    length: "100% / Systematic Review (30+ peer-reviewed articles)",
    benchmarks: [
      "Exhaustive synthesized literature matrix indexing methodologies, variables, and limitations.",
      "Theoretical justification mapping established paradigms onto the study's conceptual model.",
    ],
  },
  RBL830: {
    format: "Applied Pilot Study & Industry Specialization Paper",
    length: "100% / Pilot Study + Specialization Review",
    benchmarks: [
      "Localized specialization analysis of sector risks, policy dynamics, and operational pain points.",
      "Methodological soundness of pilot execution and instrument refinement strategy.",
    ],
  },
  DSSR980: {
    format: "The Doctoral Dissertation (Progressive Milestones)",
    length: "100% / Five-Chapter Dissertation Manuscript",
    benchmarks: [
      "Completion of IRB ethics clearance, fieldwork, and raw dataset submission milestones.",
      "Quality of the five-chapter manuscript and actionable practitioner recommendations.",
    ],
  },
  VIVA920: {
    format: "Oral Defense Presentation & Academic Defense Dossier",
    length: "100% / 20-Minute Defense + 3-Page Executive Dossier",
    benchmarks: [
      "Comprehensive justification of empirical models, research ethics, and conclusions under cross-examination.",
      "Polish and practitioner value of the defense deck and executive briefing dossier.",
    ],
  },
};

/** Compose the full assignment description from task text + official spec. */
function assignmentDescription(mod: ModuleSeed): string {
  const code = mod.title.split(" — ")[0]?.trim() ?? "";
  const spec = ASSIGNMENT_SPECS[code];
  if (!spec) return mod.assignmentTask;
  const parts = [
    `Format: ${spec.format} | Weight / Length: ${spec.length}`,
    `Assignment Task:\n${mod.assignmentTask}`,
    `Evaluation Benchmarks:\n${spec.benchmarks.map((b) => `• ${b}`).join("\n")}`,
  ];
  return parts.join("\n\n");
}

const BBA_MODULES: ModuleSeed[] = [
  // Year 1
  {
    title: "BUS110 — Business Communication",
    year: 1,
    semester: 1,
    assignmentTitle: "Executive Briefing & Communication Plan",
    assignmentTask:
      "Draft a formal internal Executive Briefing Memo addressing an organizational shift (e.g., a corporate move to permanent hybrid work structures). Outline the explicit internal communications framework needed to smooth over worker friction, mitigate message distortion across departments, and coordinate remote personnel.",
  },
  {
    title: "MGT120 — Managing Business",
    year: 1,
    semester: 1,
    assignmentTitle: "Comprehensive Organizational Audit",
    assignmentTask:
      "Select an active international corporation and execute a strategic audit using the POLC framework (Planning, Organizing, Leading, Controlling). Critique how their corporate governance structure aligns with modern volatile operating realities.",
  },
  {
    title: "ACC130 — Accounting Principles I",
    year: 1,
    semester: 1,
    assignmentTitle: "Financial Statement Construction Portfolio",
    assignmentTask:
      "Given a raw 12-month unadjusted transaction ledger for an early-stage company, process journal entries, post to ledger accounts, adjust balances, and construct a complete Income Statement, Balance Sheet, and Cash Flow Statement.",
  },
  {
    title: "BUS140 — E-Commerce",
    year: 1,
    semester: 1,
    assignmentTitle: "Digital Commerce Platform Blueprint",
    assignmentTask:
      "Design a technical and operational architecture document for migrating a traditional brick-and-mortar storefront into an omni-channel e-commerce brand. Address infrastructure hosting, UI/UX pathways, secure API gateways, and regional data protection standards (GDPR/CCPA).",
  },
  {
    title: "ECO150 — Principles of Economics",
    year: 1,
    semester: 2,
    assignmentTitle: "Micro & Macro Market Impact Report",
    assignmentTask:
      "Analyze a specific market sector (e.g., automotive, renewable energy) and map out structural adjustments triggered by changing variables: inflation rates, shifting price elasticity of demand, and newly imposed government tariff barriers.",
  },
  {
    title: "FIN160 — Principles of Finance",
    year: 1,
    semester: 2,
    assignmentTitle: "Corporate Capital Budgeting Case Analysis",
    assignmentTask:
      "Examine competing multi-year investment options for an expanding manufacturing enterprise. Calculate and compare the Net Present Value (NPV), Internal Rate of Return (IRR), and Payback Periods to advise senior executives on the best path forward.",
  },
  {
    title: "MKT170 — Principles of Marketing",
    year: 1,
    semester: 2,
    assignmentTitle: "Strategic Marketing Mix Portfolio (4Ps)",
    assignmentTask:
      "Develop a comprehensive marketing launch strategy for an innovative product entering a competitive sector. Provide precise target market segment profiles (demographic, psychographic) and map out an integrated 4Ps framework.",
  },
  {
    title: "HRM180 — Human Resource Management",
    year: 1,
    semester: 2,
    assignmentTitle: "Workforce Optimization & Retention Strategy",
    assignmentTask:
      "Analyze a major corporate case study dealing with high employee attrition and low morale. Design an end-to-end human capital recovery blueprint covering revamped recruitment pipelines, equity-driven reward systems, and remote performance tracking frameworks.",
  },
  // Year 2
  {
    title: "ACT210 — Accounting Principles II",
    year: 2,
    semester: 1,
    assignmentTitle: "Corporate Financial Statement Analysis",
    assignmentTask:
      "Obtain the audited annual financial reports of two publicly-traded companies within the same sector. Conduct an exhaustive comparative analysis utilizing liquidity, profitability, leverage, and efficiency ratios to score their financial health.",
  },
  {
    title: "MGT220 — Operations Management",
    year: 2,
    semester: 1,
    assignmentTitle: "Process Mapping & Quality Optimization Report",
    assignmentTask:
      "Evaluate an operational production line or service workflow to isolate efficiency bottlenecks. Apply Lean manufacturing or Six Sigma concepts to eliminate waste, optimize cycle times, and introduce proactive quality control loops.",
  },
  {
    title: "BUS230 — Entrepreneurship",
    year: 2,
    semester: 1,
    assignmentTitle: "Start-up Pitch Deck & Feasibility Report",
    assignmentTask:
      "Formulate an original, scalable business concept and construct a comprehensive investor-ready commercial blueprint. Include value proposition design, customer acquisition costs, break-even thresholds, and a 3-year funding road map.",
  },
  {
    title: "BUS240 — Sustainable Business Practices",
    year: 2,
    semester: 1,
    assignmentTitle: "Corporate ESG Transformation Strategy",
    assignmentTask:
      "Audit a heavily resource-dependent business and build an Environmental, Social, and Governance (ESG) pivot model. Address carbon emission downscaling, circular supply chains, and transparent reporting metrics using global GRI standards.",
  },
  {
    title: "FIN250 — Financial Reporting",
    year: 2,
    semester: 2,
    assignmentTitle: "IFRS Compliance Evaluation Framework",
    assignmentTask:
      "Deconstruct complex corporate transactions involving revenue recognition, asset impairment, or lease treatments. Evaluate these cases to ensure strict compliance with International Financial Reporting Standards (IFRS) guidelines.",
  },
  {
    title: "MGT260 — Logistics and Supply Chain Management",
    year: 2,
    semester: 2,
    assignmentTitle: "Global Supply Network Optimization Model",
    assignmentTask:
      "Map out and analyze a cross-border distribution network suffering from geopolitical bottlenecks or port congestion. Calculate optimal inventory positions using Economic Order Quantity (EOQ) variables and establish risk mitigation paths.",
  },
  {
    title: "MKT270 — Cross-Cultural Marketing",
    year: 2,
    semester: 2,
    assignmentTitle: "International Market Campaign Localization Deck",
    assignmentTask:
      "Take a consumer brand originating in a Western market and adjust its advertising and visual portfolio for successful deployment in a distinct cultural environment (e.g., East Asia or the Middle East). Apply Hofstede's Cultural Dimensions framework.",
  },
  {
    title: "MGT280 — Business Information Management",
    year: 2,
    semester: 2,
    assignmentTitle: "Enterprise IT Architecture Plan",
    assignmentTask:
      "Design an integrated information technology infrastructure configuration for an expanding medium enterprise. Map data pipelines between CRM, ERP, and localized database layers, ensuring data integrity and outlining cybersecurity defense patterns.",
  },
  // Year 3
  {
    title: "IBM310 — International Business Management",
    year: 3,
    semester: 1,
    assignmentTitle: "Global Entry Strategy Paper",
    assignmentTask:
      "Formulate a market entry strategy for an enterprise seeking expansion into an unfamiliar region. Critically choose between FDI (Foreign Direct Investment), joint ventures, licensing models, or strategic alliances based on local market access barriers.",
  },
  {
    title: "IBM330 — International Business Environment",
    year: 3,
    semester: 1,
    assignmentTitle: "PESTLE Macro-Environmental Audit",
    assignmentTask:
      "Conduct an intensive macroeconomic assessment of a country experiencing high socio-political or fiscal shifts. Utilize an expanded PESTLE analytical framework to determine risk values for long-term corporate asset investment.",
  },
  {
    title: "IBM340 — International Economics",
    year: 3,
    semester: 1,
    assignmentTitle: "Trade Balance & FX Exposure Analysis",
    assignmentTask:
      "Analyze how a specific nation's balance of payments and currency valuations respond to changing interest rates and central bank interventions. Model the resulting financial exposures for international businesses importing raw inputs from that area.",
  },
  {
    title: "IBM350 — International Marketing",
    year: 3,
    semester: 1,
    assignmentTitle: "Global Brand Positioning Portfolio",
    assignmentTask:
      "Formulate a unified international marketing initiative across three distinct geographic regions. Detail your standardizing vs. adapting product parameters, global pricing parity configurations, and unified digital channel marketing approaches.",
  },
  {
    title: "IBM360 — Import and Export Management",
    year: 3,
    semester: 2,
    assignmentTitle: "Global Trade Compliance & Logistics Manifest",
    assignmentTask:
      "Draft an end-to-end operational export manifest for transporting a complex cargo category across international borders. Define exact Incoterms, customs declarations, tariff classifications, letters of credit, and compliance protocols.",
  },
  {
    title: "IBM370 — International Trade and Contemporary Issues",
    year: 3,
    semester: 2,
    assignmentTitle: "Trade Protectionism Impact Thesis",
    assignmentTask:
      "Critically examine the operational fallouts from active regional trade disputes or protectionist shifts (e.g., bilateral tariff escalations). Detail the downstream adjustments required for organizational networks sourcing items from impacted regions.",
  },
  {
    title: "IBM320 — Managing International Workforce",
    year: 3,
    semester: 2,
    assignmentTitle: "Cross-Border Human Capital Framework",
    assignmentTask:
      "Design a comprehensive global human resources policy framework governing international assignment lifecycles. Address expat compensation models, cross-cultural training programs, global compliance tracking, and structured repatriation processes.",
  },
  {
    title: "IBM380 — International Business Management Capstone Project",
    year: 3,
    semester: 2,
    assignmentTitle: "Strategic Business Plan & Defense Thesis",
    assignmentTask:
      "Synthesize your business education into an expansive, independent research thesis. Identify a critical strategic problem within a real international organization, conduct rigorous competitive audits (Porter's Five Forces, financial metrics), and construct an actionable multi-year corporate turnaround plan.",
  },
];

const MBA_MODULES: ModuleSeed[] = [
  // Year 1 — Core Executive Frameworks
  {
    title: "MBA510 — International Business Management",
    year: 1,
    semester: 1,
    assignmentTitle: "Global Market Entry Strategy Dossier",
    assignmentTask:
      "Formulate a market entry strategy for an enterprise seeking expansion into an unfamiliar region. Critically choose between FDI (Foreign Direct Investment), joint ventures, licensing models, or strategic alliances based on local market access barriers and corporate objectives.",
  },
  {
    title: "MBA520 — Operations Management",
    year: 1,
    semester: 1,
    assignmentTitle: "Lean Operations & Quality Optimization Audit",
    assignmentTask:
      "Evaluate an operational production line or service workflow to isolate efficiency bottlenecks. Apply Lean manufacturing or Six Sigma concepts to eliminate waste, optimize cycle times, and introduce proactive quality control loops.",
  },
  {
    title: "MBA530 — Business Communication",
    year: 1,
    semester: 1,
    assignmentTitle: "Executive Communication & Change Briefing Plan",
    assignmentTask:
      "Draft a formal Executive Briefing addressing a major organizational shift. Outline the internal communications framework needed to mitigate message distortion across departments, manage stakeholder friction, and coordinate distributed teams.",
  },
  {
    title: "MBA540 — E-Commerce",
    year: 1,
    semester: 1,
    assignmentTitle: "Enterprise Digital Commerce Architecture",
    assignmentTask:
      "Design a technical and operational architecture for migrating a traditional enterprise into an omni-channel e-commerce brand. Address infrastructure hosting, UI/UX pathways, secure API gateways, and regional data protection standards (GDPR/CCPA).",
  },
  {
    title: "MBA550 — Principles of Economics",
    year: 1,
    semester: 2,
    assignmentTitle: "Macro & Micro Market Impact Analysis",
    assignmentTask:
      "Analyze a specific market sector and map out structural adjustments triggered by changing variables: inflation rates, shifting price elasticity of demand, and newly imposed government tariff barriers.",
  },
  {
    title: "MBA560 — Sustainable Business Practices",
    year: 1,
    semester: 2,
    assignmentTitle: "Corporate ESG Transformation Strategy",
    assignmentTask:
      "Audit a heavily resource-dependent business and build an Environmental, Social, and Governance (ESG) pivot model. Address carbon emission downscaling, circular supply chains, and transparent reporting metrics using global GRI standards.",
  },
  {
    title: "MBA570 — Entrepreneurship",
    year: 1,
    semester: 2,
    assignmentTitle: "Venture Blueprint & Investor Feasibility Study",
    assignmentTask:
      "Formulate an original, scalable business concept and construct a comprehensive investor-ready commercial blueprint. Include value proposition design, customer acquisition costs, break-even thresholds, and a 3-year funding road map.",
  },
  {
    title: "MBA580 — Business Information Management",
    year: 1,
    semester: 2,
    assignmentTitle: "Enterprise Information Architecture Plan",
    assignmentTask:
      "Design an integrated information technology infrastructure configuration for an expanding enterprise. Map data pipelines between CRM, ERP, and localized database layers, ensuring data integrity and outlining cybersecurity defense patterns.",
  },
  // Year 2 — Advanced Specialization & Research
  {
    title: "MBA590 — Human Resource Management",
    year: 2,
    semester: 1,
    assignmentTitle: "Strategic Workforce & Talent Architecture",
    assignmentTask:
      "Analyze a corporate case study dealing with high employee attrition and low morale. Design an end-to-end human capital recovery blueprint covering revamped recruitment pipelines, equity-driven reward systems, and remote performance tracking frameworks.",
  },
  {
    title: "MBA600 — Principles of Finance",
    year: 2,
    semester: 1,
    assignmentTitle: "Corporate Capital Budgeting & Valuation Case",
    assignmentTask:
      "Examine competing multi-year investment options for an expanding enterprise. Calculate and compare the Net Present Value (NPV), Internal Rate of Return (IRR), and Payback Periods to advise senior executives on the best path forward.",
  },
  {
    title: "MBA610 — Principles of Marketing",
    year: 2,
    semester: 1,
    assignmentTitle: "Integrated Strategic Marketing Portfolio",
    assignmentTask:
      "Develop a comprehensive marketing launch strategy for an innovative product entering a competitive sector. Provide precise target market segment profiles (demographic, psychographic) and map out an integrated 4Ps framework.",
  },
  {
    title: "MBA620 — Managing Business",
    year: 2,
    semester: 1,
    assignmentTitle: "Executive Organizational Strategy Audit",
    assignmentTask:
      "Select an active international corporation and execute a strategic audit using the POLC framework (Planning, Organizing, Leading, Controlling). Critique how their corporate governance structure aligns with modern volatile operating realities.",
  },
  {
    title: "MBA630 — Logistics and Supply Chain Management",
    year: 2,
    semester: 2,
    assignmentTitle: "Global Supply Network Optimization Model",
    assignmentTask:
      "Map out and analyze a cross-border distribution network suffering from geopolitical bottlenecks or port congestion. Calculate optimal inventory positions using Economic Order Quantity (EOQ) variables and establish risk mitigation paths.",
  },
  {
    title: "MBA640 — Accounting Principles I & II",
    year: 2,
    semester: 2,
    assignmentTitle: "Corporate Financial Statement Construction & Analysis",
    assignmentTask:
      "Given a raw unadjusted transaction ledger, process journal entries and construct complete financial statements; then conduct a comparative ratio analysis (liquidity, profitability, leverage, efficiency) against a publicly-traded peer to score financial health.",
  },
  {
    title: "MBA650 — Financial Reporting",
    year: 2,
    semester: 2,
    assignmentTitle: "IFRS Compliance Evaluation Framework",
    assignmentTask:
      "Deconstruct complex corporate transactions involving revenue recognition, asset impairment, or lease treatments. Evaluate these cases to ensure strict compliance with International Financial Reporting Standards (IFRS) guidelines.",
  },
  {
    title: "MBA690 — Master Thesis / Capstone Research Project",
    description:
      "Graduate capstone milestone (30 ECTS): an independent empirical research thesis defended via Viva Voce before the CGU academic board.",
    credits: 30,
    year: 2,
    semester: 2,
    assignmentTitle: "Empirical Business Thesis & Viva Voce Defense",
    assignmentTask:
      "Conduct an independent, empirical action-research study addressing a deep operational, strategic, or systemic problem in your current industry domain. Gather real-world primary or secondary data, apply advanced qualitative or quantitative analysis techniques, and formulate an extensive operational solution model. Deliver a written academic thesis alongside a real-time oral presentation defense (Viva Voce) to the CGU academic board.",
  },
];

const DBA_MODULES: ModuleSeed[] = [
  {
    title: "RBL810 — Research Methodology: Quantitative & Qualitative Analyses",
    description:
      "Focuses on advanced research tools, rigorous research design, data analysis paradigms, and sophisticated methodologies explicitly geared toward solving complex, practical corporate problems.",
    credits: 30,
    year: 1,
    semester: 1,
    assignmentTitle: "Mixed-Methods Research Proposal & Data Analysis Strategy",
    assignmentTask:
      "Develop a comprehensive formal research proposal focusing on a specific complex, structural, or operational challenge within a modern enterprise ecosystem. Architect both an empirical quantitative approach (e.g., structural equation modeling or multi-variable regression) and an inductive qualitative approach (e.g., thematic analysis from semi-structured executive interviews), including problem formulation, research instrumentation, and an analytical triangulation strategy.",
  },
  {
    title: "RBL820 — Scholarly Engagement I",
    description:
      "Focuses on developing an extensive, critical literature review, identifying specific research gaps, and constructing contemporary theoretical frameworks of competitive business strategy.",
    credits: 15,
    year: 1,
    semester: 2,
    assignmentTitle: "Critical Systematic Literature Review & Theoretical Framework",
    assignmentTask:
      "Conduct a highly rigorous, systematic review of at least 30 peer-reviewed, high-impact journal articles from the last five years on macro-level corporate strategy or organizational behavior. Produce a synthesized literature matrix, a conceptual framework exposing an unaddressed research gap, and definitive theoretical justification.",
  },
  {
    title: "RBL830 — Scholarly Engagement II",
    description:
      "Involves localized, applied research and literature exploration tailored into advanced specializations such as global marketing strategy, corporate governance, or supply chain dynamics.",
    credits: 15,
    year: 2,
    semester: 1,
    assignmentTitle: "Applied Pilot Study & Industry Specialization Paper",
    assignmentTask:
      "Narrow focus into the candidate's elected specialization track (e.g., Strategic Management, Finance, Governance, or Marketing) and perform an isolated pilot study or advanced comparative industry case study. Deliver a specialization review, a pilot execution report (3–5 expert interviews or a restricted dataset), and an instrument refinement strategy.",
  },
  {
    title: "DSSR980 — Doctorate Thesis",
    description:
      "The substantive developmental, drafting, and investigative phase dedicated to executing and finalizing the primary practitioner-oriented independent research project.",
    credits: 90,
    year: 2,
    semester: 2,
    assignmentTitle: "The Doctoral Dissertation (Progressive Milestones)",
    assignmentTask:
      "Execute the core data gathering and drafting of the primary independent research project through a sequence of formal milestones: Institutional Review Board (IRB) ethics clearance, fieldwork and raw dataset submission, and a complete five-chapter dissertation draft with actionable practical recommendations for corporate practitioners.",
  },
  {
    title: "VIVA920 — Viva Voce (Oral Defense)",
    description:
      "The conclusive formal presentation and rigorous defense of the doctoral thesis before an appointed academic and professional examination board.",
    credits: 30,
    year: 3,
    semester: 1,
    assignmentTitle: "Oral Defense Presentation & Academic Defense Dossier",
    assignmentTask:
      "Prepare, deliver, and defend the final completed dissertation before an officially appointed Academic and Professional Examination Board. Produce a concise 20-minute defense presentation slide deck and a 3-page executive briefing dossier delineating practitioner solutions and strategic policy impacts.",
  },
];

const programCurricula: Record<string, ModuleSeed[]> = {
  "bba-business-administration": BBA_MODULES,
  "mba-business-administration": MBA_MODULES,
  "dba-business-administration": DBA_MODULES,
};

async function main() {
  const superadminPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? "superadmin123";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  await db
    .insert(usersTable)
    .values([
      {
        username: "superadmin",
        passwordHash: await bcrypt.hash(superadminPassword, 10),
        email: "superadmin@centralglobal.edu",
        firstName: "System",
        lastName: "Owner",
        role: "superadmin",
      },
      {
        username: "admin",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        email: "admin@centralglobal.edu",
        firstName: "Registrar",
        lastName: "Office",
        role: "admin",
      },
    ])
    .onConflictDoNothing({ target: usersTable.username });

  const courseSeed = [
    {
      title: "BSc Computer Science",
      slug: "bsc-computer-science",
      description:
        "A comprehensive undergraduate program covering algorithms, systems, AI and software engineering.",
      level: "undergraduate",
      durationWeeks: 144,
      price: "4800.00",
      thumbnailUrl: null,
    },
    {
      title: "MBA in Global Management",
      slug: "mba-global-management",
      description:
        "A postgraduate business program focused on leadership, strategy and international markets.",
      level: "postgraduate",
      durationWeeks: 96,
      price: "9600.00",
      thumbnailUrl: null,
    },
    {
      title: "Diploma in Data Analytics",
      slug: "diploma-data-analytics",
      description:
        "A practical diploma covering statistics, SQL, visualization and business intelligence.",
      level: "diploma",
      durationWeeks: 48,
      price: "2400.00",
      thumbnailUrl: null,
    },
    {
      title: "Certificate in Digital Marketing",
      slug: "certificate-digital-marketing",
      description:
        "A short certificate program on SEO, content, paid media and analytics.",
      level: "certificate",
      durationWeeks: 12,
      price: "0.00",
      thumbnailUrl: null,
    },
    {
      title: "Bachelor of Business Administration (BBA)",
      slug: "bba-business-administration",
      description:
        "A comprehensive, internationally aligned undergraduate curriculum (180 ECTS, ACBSP Candidacy) developing strategic leadership, analytical precision, and mastery across 24 core corporate modules over three academic years.",
      level: "undergraduate",
      durationWeeks: 144,
      price: "4500.00",
      thumbnailUrl: null,
    },
    {
      title: "Master of Business Administration (MBA)",
      slug: "mba-business-administration",
      description:
        "An advanced postgraduate degree (90 ECTS, ACBSP Candidacy) spanning 16 modules across two academic years — core executive frameworks, advanced specialization, and a Master Thesis / Capstone Research Project defended via Viva Voce.",
      level: "postgraduate",
      durationWeeks: 72,
      price: "4000.00",
      thumbnailUrl: null,
    },
    {
      title: "Doctor of Business Administration (DBA)",
      slug: "dba-business-administration",
      description:
        "A practitioner-oriented doctoral program (180 ECTS) of five doctoral-level modules spanning advanced research methodology, scholarly engagement, an independent thesis, and a formal Viva Voce defense.",
      level: "doctorate",
      durationWeeks: 120,
      price: "5000.00",
      thumbnailUrl: null,
    },
  ];

  await db
    .insert(coursesTable)
    .values(courseSeed)
    .onConflictDoNothing({ target: coursesTable.slug });

  // Keep course metadata in sync on re-seed (e.g. price/level/description changes).
  for (const c of courseSeed) {
    await db
      .update(coursesTable)
      .set({
        title: c.title,
        description: c.description,
        level: c.level,
        durationWeeks: c.durationWeeks,
        price: c.price,
      })
      .where(eq(coursesTable.slug, c.slug));
  }

  const allCourses = await db.select().from(coursesTable);

  // Curriculum seeding is upsert-based (keyed by module code / title) so that
  // existing subject IDs — and any exams, results, and submissions attached to
  // them — are preserved across re-runs. Stale subjects are only removed when
  // they carry no academic history.

  // Generic curriculum for the original sample courses (with demo materials).
  const sampleSubjectPlan = [
    {
      year: 1,
      semester: 1,
      title: "Foundations",
      description: "Introductory module establishing core concepts.",
    },
    {
      year: 1,
      semester: 2,
      title: "Core Principles",
      description: "Building blocks and essential theory for the program.",
    },
    {
      year: 2,
      semester: 1,
      title: "Advanced Practice",
      description: "Applied module with hands-on coursework.",
    },
    {
      year: 2,
      semester: 2,
      title: "Capstone",
      description: "Final project demonstrating mastery.",
    },
  ];

  const assignmentBaseDate = new Date("2026-01-19T23:59:00Z");
  const dueDateForIndex = (idx: number) => {
    const d = new Date(assignmentBaseDate);
    d.setDate(d.getDate() + idx * 14);
    return d;
  };

  let subjectCount = 0;
  let materialCount = 0;
  let assignmentCount = 0;

  // Natural key for a module: its code prefix ("MBA510 — X" -> "MBA510"),
  // falling back to the full title for untitled/sample modules.
  const moduleKey = (title: string) => title.split(" — ")[0].trim();

  /** True when a subject has attached academic history (exams or submissions). */
  const subjectHasHistory = async (subjectId: number): Promise<boolean> => {
    const exams = await db
      .select({ id: examsTable.id })
      .from(examsTable)
      .where(eq(examsTable.subjectId, subjectId));
    if (exams.length > 0) return true;
    const assignments = await db
      .select({ id: assignmentsTable.id })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.subjectId, subjectId));
    if (assignments.length === 0) return false;
    const submissions = await db
      .select({ id: submissionsTable.id })
      .from(submissionsTable)
      .where(
        inArray(
          submissionsTable.assignmentId,
          assignments.map((a) => a.id),
        ),
      );
    return submissions.length > 0;
  };

  /** Remove a subject with no history, along with its dependents. */
  const removeSubject = async (subjectId: number) => {
    const assignments = await db
      .select({ id: assignmentsTable.id })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.subjectId, subjectId));
    if (assignments.length > 0) {
      await db.delete(assignmentsTable).where(
        inArray(
          assignmentsTable.id,
          assignments.map((a) => a.id),
        ),
      );
    }
    const materials = await db
      .select({ id: studyMaterialsTable.id })
      .from(studyMaterialsTable)
      .where(eq(studyMaterialsTable.subjectId, subjectId));
    if (materials.length > 0) {
      await db.delete(materialProgressTable).where(
        inArray(
          materialProgressTable.materialId,
          materials.map((m) => m.id),
        ),
      );
      await db
        .delete(studyMaterialsTable)
        .where(eq(studyMaterialsTable.subjectId, subjectId));
    }
    await db.delete(subjectsTable).where(eq(subjectsTable.id, subjectId));
  };

  /** Upsert the single seeded assignment for a subject. */
  const upsertAssignment = async (
    subjectId: number,
    title: string,
    description: string,
    dueDate: Date,
  ) => {
    const existing = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.subjectId, subjectId));
    if (existing.length > 0) {
      await db
        .update(assignmentsTable)
        .set({ title, description, dueDate, maxScore: 100 })
        .where(eq(assignmentsTable.id, existing[0].id));
    } else {
      await db.insert(assignmentsTable).values({
        subjectId,
        title,
        description,
        dueDate,
        maxScore: 100,
      });
    }
    assignmentCount++;
  };

  for (const course of allCourses) {
    const curriculum = programCurricula[course.slug];
    const existingSubjects = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.courseId, course.id));
    const existingByKey = new Map(
      existingSubjects.map((sub) => [moduleKey(sub.title), sub]),
    );

    if (curriculum) {
      // Real CGU program: upsert modules as subjects + one assignment each.
      // No study materials are seeded — modules start with empty video slots.
      const plannedKeys = new Set(curriculum.map((m) => moduleKey(m.title)));
      for (let i = 0; i < curriculum.length; i++) {
        const mod = curriculum[i];
        const key = moduleKey(mod.title);
        const existing = existingByKey.get(key);
        let subjectId: number;
        if (existing) {
          await db
            .update(subjectsTable)
            .set({
              title: mod.title,
              description: mod.description ?? null,
              credits: mod.credits ?? 7.5,
              year: mod.year,
              semester: mod.semester,
              orderIndex: i + 1,
            })
            .where(eq(subjectsTable.id, existing.id));
          subjectId = existing.id;
        } else {
          const [created] = await db
            .insert(subjectsTable)
            .values({
              courseId: course.id,
              title: mod.title,
              description: mod.description ?? null,
              credits: mod.credits ?? 7.5,
              year: mod.year,
              semester: mod.semester,
              orderIndex: i + 1,
            })
            .returning();
          subjectId = created.id;
        }
        subjectCount++;

        await upsertAssignment(
          subjectId,
          mod.assignmentTitle,
          assignmentDescription(mod),
          dueDateForIndex(i),
        );
      }

      // Retire subjects no longer in the official plan — but only when they
      // carry no exams or submissions, so historical records stay intact.
      for (const sub of existingSubjects) {
        if (plannedKeys.has(moduleKey(sub.title))) continue;
        if (await subjectHasHistory(sub.id)) continue;
        await removeSubject(sub.id);
      }
      continue;
    }

    // Original sample courses keep the generic plan with demo materials.
    for (let i = 0; i < sampleSubjectPlan.length; i++) {
      const plan = sampleSubjectPlan[i];
      const existing = existingByKey.get(moduleKey(plan.title));
      let subjectId: number;
      if (existing) {
        await db
          .update(subjectsTable)
          .set({
            title: plan.title,
            description: plan.description,
            year: plan.year,
            semester: plan.semester,
            orderIndex: i + 1,
          })
          .where(eq(subjectsTable.id, existing.id));
        subjectId = existing.id;
      } else {
        const [created] = await db
          .insert(subjectsTable)
          .values({
            courseId: course.id,
            title: plan.title,
            description: plan.description,
            year: plan.year,
            semester: plan.semester,
            orderIndex: i + 1,
          })
          .returning();
        subjectId = created.id;
      }
      subjectCount++;

      // Seed demo materials only when the subject has none yet.
      const materials = await db
        .select({ id: studyMaterialsTable.id })
        .from(studyMaterialsTable)
        .where(eq(studyMaterialsTable.subjectId, subjectId));
      if (materials.length === 0) {
        await db.insert(studyMaterialsTable).values([
          {
            subjectId,
            title: `${plan.title} — Video Lecture`,
            type: "video",
            url: SAMPLE_VIDEO,
            durationMinutes: 10,
            orderIndex: 1,
          },
          {
            subjectId,
            title: `${plan.title} — Lecture Notes (PDF)`,
            type: "pdf",
            url: SAMPLE_PDF,
            orderIndex: 2,
          },
          {
            subjectId,
            title: `${plan.title} — Reading Summary`,
            type: "text",
            content:
              "Review the key concepts covered in this module and complete the practice questions before moving on.",
            orderIndex: 3,
          },
        ]);
        materialCount += 3;
      }
    }
  }

  // Payment plans for the three flagship CGU programs. Idempotent: clear the
  // plans for these courses, then re-insert. Does not touch payment records.
  const planSeed: Record<
    string,
    Array<{
      type: "one-time" | "installment";
      name: string;
      installmentCount: number;
      installmentAmount: number;
    }>
  > = {
    "bba-business-administration": [
      { type: "one-time", name: "Pay in full", installmentCount: 1, installmentAmount: 4500 },
      { type: "installment", name: "3-month plan", installmentCount: 3, installmentAmount: 1600 },
      { type: "installment", name: "6-month plan", installmentCount: 6, installmentAmount: 900 },
    ],
    "mba-business-administration": [
      { type: "one-time", name: "Pay in full", installmentCount: 1, installmentAmount: 4000 },
      { type: "installment", name: "2-month plan", installmentCount: 2, installmentAmount: 2100 },
      { type: "installment", name: "4-month plan", installmentCount: 4, installmentAmount: 1200 },
    ],
    "dba-business-administration": [
      { type: "one-time", name: "Pay in full", installmentCount: 1, installmentAmount: 5000 },
      { type: "installment", name: "3-month plan", installmentCount: 3, installmentAmount: 1800 },
      { type: "installment", name: "6-month plan", installmentCount: 6, installmentAmount: 1000 },
    ],
  };

  let planCount = 0;
  for (const course of allCourses) {
    const plans = planSeed[course.slug];
    if (!plans) continue;
    await db
      .delete(paymentPlansTable)
      .where(eq(paymentPlansTable.courseId, course.id));
    await db.insert(paymentPlansTable).values(
      plans.map((p, i) => ({
        courseId: course.id,
        type: p.type,
        name: p.name,
        installmentCount: p.installmentCount,
        installmentAmount: String(p.installmentAmount),
        totalAmount: String(p.installmentAmount * p.installmentCount),
        orderIndex: i,
      })),
    );
    planCount += plans.length;
  }

  console.log("Seed complete.");
  console.log(`  superadmin / ${superadminPassword}`);
  console.log(`  admin / ${adminPassword}`);
  console.log(`  courses: ${allCourses.length}`);
  console.log(`  subjects inserted: ${subjectCount}`);
  console.log(`  materials inserted: ${materialCount}`);
  console.log(`  payment plans inserted: ${planCount}`);
  console.log(`  assignments inserted: ${assignmentCount}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
