import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
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
  paymentPlansTable,
} from "@workspace/db";

const SAMPLE_VIDEO =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_PDF =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

interface ModuleSeed {
  title: string;
  description?: string;
  year: number;
  semester: number;
  assignmentTitle: string;
  assignmentTask: string;
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
  {
    title: "MGT510 — Managerial Accounting",
    year: 1,
    semester: 1,
    assignmentTitle: "Strategic Cost Optimization Audit",
    assignmentTask:
      "Analyze a multi-departmental corporate cost sheet. Map operational overheads using Activity-Based Costing (ABC), isolate financial variances under standard budgeting, and build a rolling quarterly projection model identifying direct cost-containment measures for senior executives.",
  },
  {
    title: "MGT520 — Managing Business Strategy",
    year: 1,
    semester: 1,
    assignmentTitle: "Corporate Competitive Realignment Thesis",
    assignmentTask:
      "Select a global organization facing digital disruption. Complete a thorough macro-environmental audit using PESTLE, Porter's Five Forces, and VRIO models. Formulate a 5-year corporate turnaround roadmap covering defensive diversification or joint-venture restructuring options.",
  },
  {
    title: "MGT530 — Human Capital Management",
    year: 1,
    semester: 1,
    assignmentTitle: "Institutional Restructuring & Culture Transformation Blueprint",
    assignmentTask:
      "Address a post-merger integration scenario involving conflicting organizational cultures and executive attrition. Design a global human capital development architecture covering succession planning, global compensation alignment, performance KPI systems, and workforce change mitigation models.",
  },
  {
    title: "MGT540 — Marketing Management",
    year: 1,
    semester: 1,
    assignmentTitle: "International Market Disruptive Expansion Matrix",
    assignmentTask:
      "Develop an entry strategy for a high-value consumer product or enterprise service expanding into a highly saturated global marketplace. Formulate data-driven customer acquisition metrics, multi-channel pricing strategies, and automated digital tracking pipelines.",
  },
  {
    title: "MGT550 — Managing Operations",
    year: 1,
    semester: 2,
    assignmentTitle: "Lean Supply Chain Value-Stream Architecture",
    assignmentTask:
      "Deconstruct an international manufacturing or fulfillment operation experiencing supply delays. Build a current-state Value Stream Map (VSM). Identify and remove process waste using Lean Six Sigma methodologies, and establish a digital supply chain network plan.",
  },
  {
    title: "MGT560 — Leading Organisation",
    year: 1,
    semester: 2,
    assignmentTitle: "Executive Leadership & Governance Strategy Report",
    assignmentTask:
      "Evaluate the leadership breakdowns behind a major corporate ethical failure. Apply contemporary ethical framework models to diagnose governance flaws and build a long-term corporate compliance architecture complete with board oversight protocols.",
  },
  {
    title: "MGT570 — Financial Management",
    year: 1,
    semester: 2,
    assignmentTitle: "Corporate Mergers & Capital Restructuring Model",
    assignmentTask:
      "Execute a formal financial valuation of a target company for acquisition. Calculate Free Cash Flow to Firm (FCFF), Weighted Average Cost of Capital (WACC), and enterprise valuation under different growth scenarios. Provide strategic recommendations on financing the purchase using debt vs. equity mix models.",
  },
  {
    title: "MGT580 — Project Management",
    year: 1,
    semester: 2,
    assignmentTitle: "Enterprise Project Management Office (PMO) Charter",
    assignmentTask:
      "Construct a comprehensive Project Charter for an enterprise transformation initiative. Outline Work Breakdown Structures (WBS), analyze critical path timelines, map out resource allocation plans, and design a quantitative risk log complete with specific mitigation responses.",
  },
  {
    title: "MGT590 — Action Research Project (Thesis/Dissertation Framework)",
    description:
      "Graduate capstone milestone (30 ECTS): an expansive action-oriented research capstone project defended via Viva Voce.",
    year: 1,
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
    year: 1,
    semester: 1,
    assignmentTitle: "Critical Systematic Literature Review & Theoretical Framework",
    assignmentTask:
      "Conduct a highly rigorous, systematic review of at least 30 peer-reviewed, high-impact journal articles from the last five years on macro-level corporate strategy or organizational behavior. Produce a synthesized literature matrix, a conceptual framework exposing an unaddressed research gap, and definitive theoretical justification.",
  },
  {
    title: "RBL830 — Scholarly Engagement II",
    description:
      "Involves localized, applied research and literature exploration tailored into advanced specializations such as global marketing strategy, corporate governance, or supply chain dynamics.",
    year: 1,
    semester: 1,
    assignmentTitle: "Applied Pilot Study & Industry Specialization Paper",
    assignmentTask:
      "Narrow focus into the candidate's elected specialization track (e.g., Strategic Management, Finance, Governance, or Marketing) and perform an isolated pilot study or advanced comparative industry case study. Deliver a specialization review, a pilot execution report (3–5 expert interviews or a restricted dataset), and an instrument refinement strategy.",
  },
  {
    title: "DSSR980 — Doctorate Thesis",
    description:
      "The substantive developmental, drafting, and investigative phase dedicated to executing and finalizing the primary practitioner-oriented independent research project.",
    year: 1,
    semester: 2,
    assignmentTitle: "The Doctoral Dissertation (Progressive Milestones)",
    assignmentTask:
      "Execute the core data gathering and drafting of the primary independent research project through a sequence of formal milestones: Institutional Review Board (IRB) ethics clearance, fieldwork and raw dataset submission, and a complete five-chapter dissertation draft with actionable practical recommendations for corporate practitioners.",
  },
  {
    title: "VIVA920 — Viva Voce (Oral Defense)",
    description:
      "The conclusive formal presentation and rigorous defense of the doctoral thesis before an appointed academic and professional examination board.",
    year: 1,
    semester: 2,
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
        "An advanced postgraduate degree (90 ECTS, ACBSP Candidacy) with 8 core management modules plus an action-oriented research capstone, engineered for managers and executives driving organizational change.",
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

  // Reset curriculum so subjects/materials/assignments match the current plan.
  // No DB-level FK constraints exist, so clear dependents first to avoid orphans.
  await db.delete(submissionsTable);
  await db.delete(assignmentsTable);
  await db.delete(materialProgressTable);
  await db.delete(studyMaterialsTable);
  await db.delete(subjectsTable);

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

  for (const course of allCourses) {
    const curriculum = programCurricula[course.slug];

    if (curriculum) {
      // Real CGU program: seed modules as subjects + one assignment each.
      // No study materials are seeded — modules start with empty video slots.
      for (let i = 0; i < curriculum.length; i++) {
        const mod = curriculum[i];
        const [subject] = await db
          .insert(subjectsTable)
          .values({
            courseId: course.id,
            title: mod.title,
            description: mod.description ?? null,
            year: mod.year,
            semester: mod.semester,
            orderIndex: i + 1,
          })
          .returning();
        subjectCount++;

        await db.insert(assignmentsTable).values({
          subjectId: subject.id,
          title: mod.assignmentTitle,
          description: mod.assignmentTask,
          dueDate: dueDateForIndex(i),
          maxScore: 100,
        });
        assignmentCount++;
      }
      continue;
    }

    // Original sample courses keep the generic plan with demo materials.
    for (let i = 0; i < sampleSubjectPlan.length; i++) {
      const plan = sampleSubjectPlan[i];
      const [subject] = await db
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
      subjectCount++;

      await db.insert(studyMaterialsTable).values([
        {
          subjectId: subject.id,
          title: `${plan.title} — Video Lecture`,
          type: "video",
          url: SAMPLE_VIDEO,
          durationMinutes: 10,
          orderIndex: 1,
        },
        {
          subjectId: subject.id,
          title: `${plan.title} — Lecture Notes (PDF)`,
          type: "pdf",
          url: SAMPLE_PDF,
          orderIndex: 2,
        },
        {
          subjectId: subject.id,
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
