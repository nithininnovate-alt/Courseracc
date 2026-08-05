--
-- PostgreSQL database dump
--

\restrict Cbclab8dOLPagfvUUHortF7EtiRWxfHadGAs1RZGw249XxNWRSeBmDlNYQcgp3J

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (94, 175, 'PESTLE Macro-Environmental Audit', 'Format: PESTLE Macro-Environmental Audit | Weight / Length: 100% / 2,000 Words

Assignment Task:
Conduct an intensive macroeconomic assessment of a country experiencing high socio-political or fiscal shifts. Utilize an expanded PESTLE analytical framework to determine risk values for long-term corporate asset investment.

Evaluation Benchmarks:
• Analytical depth across macro pillars (Political, Economic, Social, Technological, Legal, Environmental).
• Viability of proposed risk hedging and long-term asset security recommendations.', '2026-09-14 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (116, 197, 'Empirical Business Thesis & Viva Voce Defense', 'Format: Empirical Business Thesis & Viva Voce Defense | Weight / Length: 100% / 12,000 – 15,000 Words

Assignment Task:
Conduct an independent, empirical action-research study addressing a deep operational, strategic, or systemic problem in your current industry domain. Gather real-world primary or secondary data, apply advanced qualitative or quantitative analysis techniques, and formulate an extensive operational solution model. Deliver a written academic thesis alongside a real-time oral presentation defense (Viva Voce) to the CGU academic board.

Evaluation Benchmarks:
• Methodological rigor, clarity of data validation, and depth of literature integration.
• Practical corporate value of findings and performance under cross-examination by the board.', '2026-08-17 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (77, 158, 'Executive Briefing & Communication Plan', 'Format: Executive Briefing & Communication Plan | Weight / Length: 100% / 1,500 Words

Assignment Task:
Draft a formal internal Executive Briefing Memo addressing an organizational shift (e.g., a corporate move to permanent hybrid work structures). Outline the explicit internal communications framework needed to smooth over worker friction, mitigate message distortion across departments, and coordinate remote personnel.

Evaluation Benchmarks:
• Professionalism, clarity, tone, and appropriate structural layout of executive-level office memos.
• Strategic viability of the multichannel communication deployment blueprint.', '2026-01-19 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (78, 159, 'Comprehensive Organizational Audit', 'Format: Comprehensive Organizational Audit | Weight / Length: 100% / 2,000 Words

Assignment Task:
Select an active international corporation and execute a strategic audit using the POLC framework (Planning, Organizing, Leading, Controlling). Critique how their corporate governance structure aligns with modern volatile operating realities.

Evaluation Benchmarks:
• Accurate conceptual application of the POLC matrix to real-world management.
• Critical quality of structural management recommendations.', '2026-02-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (79, 160, 'Financial Statement Construction Portfolio', 'Format: Financial Statement Construction Portfolio | Weight / Length: 100% / Ledger Balancing + 1,000 Words

Assignment Task:
Given a raw 12-month unadjusted transaction ledger for an early-stage company, process journal entries, post to ledger accounts, adjust balances, and construct a complete Income Statement, Balance Sheet, and Cash Flow Statement.

Evaluation Benchmarks:
• Absolute structural and numerical balancing accuracy across financial sheets.
• Compliant implementation of fundamental double-entry principles.', '2026-02-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (80, 161, 'Digital Commerce Platform Blueprint', 'Format: Digital Commerce Platform Blueprint | Weight / Length: 100% / 1,500 Words

Assignment Task:
Design a technical and operational architecture document for migrating a traditional brick-and-mortar storefront into an omni-channel e-commerce brand. Address infrastructure hosting, UI/UX pathways, secure API gateways, and regional data protection standards (GDPR/CCPA).

Evaluation Benchmarks:
• Technical feasibility of payment gateways, inventory sync architectures, and compliance models.
• Integration effectiveness of user acquisition and security metrics.', '2026-03-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (81, 162, 'Micro & Macro Market Impact Report', 'Format: Micro & Macro Market Impact Report | Weight / Length: 100% / 1,800 Words

Assignment Task:
Analyze a specific market sector (e.g., automotive, renewable energy) and map out structural adjustments triggered by changing variables: inflation rates, shifting price elasticity of demand, and newly imposed government tariff barriers.

Evaluation Benchmarks:
• Proper structural deployment of supply-demand curves and economic variables.
• Data-driven evaluation of policy interventions on market equilibrium.', '2026-03-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (83, 164, 'Strategic Marketing Mix Portfolio (4Ps)', 'Format: Strategic Marketing Mix Portfolio (4Ps) | Weight / Length: 100% / 2,000 Words

Assignment Task:
Develop a comprehensive marketing launch strategy for an innovative product entering a competitive sector. Provide precise target market segment profiles (demographic, psychographic) and map out an integrated 4Ps framework.

Evaluation Benchmarks:
• Depth and accuracy of market segment targeting criteria.
• Strategic alignment across positioning statements and pricing models.', '2026-04-13 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (84, 165, 'Workforce Optimization & Retention Strategy', 'Format: Workforce Optimization & Retention Strategy | Weight / Length: 100% / 1,500 Words

Assignment Task:
Analyze a major corporate case study dealing with high employee attrition and low morale. Design an end-to-end human capital recovery blueprint covering revamped recruitment pipelines, equity-driven reward systems, and remote performance tracking frameworks.

Evaluation Benchmarks:
• Alignment of compensation strategies with modern organizational behavior principles.
• Legal and ethical compliance of proposed labor and productivity metrics.', '2026-04-27 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (85, 166, 'Corporate Financial Statement Analysis', 'Format: Corporate Financial Statement Analysis | Weight / Length: 100% / 2,000 Words

Assignment Task:
Obtain the audited annual financial reports of two publicly-traded companies within the same sector. Conduct an exhaustive comparative analysis utilizing liquidity, profitability, leverage, and efficiency ratios to score their financial health.

Evaluation Benchmarks:
• Accuracy of calculated ratio formulas (Quick ratio, ROE, Debt-to-Equity).
• Insightfulness of the structural commentary regarding operational weaknesses.', '2026-05-11 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (86, 167, 'Process Mapping & Quality Optimization Report', 'Format: Process Mapping & Quality Optimization Report | Weight / Length: 100% / 1,800 Words

Assignment Task:
Evaluate an operational production line or service workflow to isolate efficiency bottlenecks. Apply Lean manufacturing or Six Sigma concepts to eliminate waste, optimize cycle times, and introduce proactive quality control loops.

Evaluation Benchmarks:
• Correct structural use of workflow diagramming and capacity constraints.
• Viability and direct cost-benefit calculation of the optimized process layout.', '2026-05-25 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (87, 168, 'Start-up Pitch Deck & Feasibility Report', 'Format: Start-up Pitch Deck & Feasibility Report | Weight / Length: 100% / 2,500 Words

Assignment Task:
Formulate an original, scalable business concept and construct a comprehensive investor-ready commercial blueprint. Include value proposition design, customer acquisition costs, break-even thresholds, and a 3-year funding road map.

Evaluation Benchmarks:
• Realism and structural integrity of market penetration and financial modeling assumptions.
• Clarity and persuasiveness of the underlying competitive advantage statement.', '2026-06-08 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (88, 169, 'Corporate ESG Transformation Strategy', 'Format: Corporate ESG Transformation Strategy | Weight / Length: 100% / 1,500 Words

Assignment Task:
Audit a heavily resource-dependent business and build an Environmental, Social, and Governance (ESG) pivot model. Address carbon emission downscaling, circular supply chains, and transparent reporting metrics using global GRI standards.

Evaluation Benchmarks:
• Actionable, metrics-driven balance between corporate profits and environmental targets.
• Thorough understanding of regulatory sustainability frameworks and compliance rules.', '2026-06-22 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (89, 170, 'IFRS Compliance Evaluation Framework', 'Format: IFRS Compliance Evaluation Framework | Weight / Length: 100% / 1,800 Words

Assignment Task:
Deconstruct complex corporate transactions involving revenue recognition, asset impairment, or lease treatments. Evaluate these cases to ensure strict compliance with International Financial Reporting Standards (IFRS) guidelines.

Evaluation Benchmarks:
• Accurate technical references and interpretation of explicit IFRS rules.
• Precision in adjusting accounting entries to reconcile compliance errors.', '2026-07-06 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (90, 171, 'Global Supply Network Optimization Model', 'Format: Global Supply Network Optimization Model | Weight / Length: 100% / 2,000 Words

Assignment Task:
Map out and analyze a cross-border distribution network suffering from geopolitical bottlenecks or port congestion. Calculate optimal inventory positions using Economic Order Quantity (EOQ) variables and establish risk mitigation paths.

Evaluation Benchmarks:
• Mathematical precision in inventory planning and logistics safety stock metrics.
• Strategic depth of the multi-modal risk management backup network.', '2026-07-20 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (91, 172, 'International Market Campaign Localization Deck', 'Format: International Market Campaign Localization Deck | Weight / Length: 100% / 1,500 Words

Assignment Task:
Take a consumer brand originating in a Western market and adjust its advertising and visual portfolio for successful deployment in a distinct cultural environment (e.g., East Asia or the Middle East). Apply Hofstede''s Cultural Dimensions framework.

Evaluation Benchmarks:
• Academic mastery in leveraging Hofstede''s index metrics to reshape marketing messaging.
• Avoidance of ethnocentric blind spots and cultural missteps in advertising design.', '2026-08-03 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (92, 173, 'Enterprise IT Architecture Plan', 'Format: Enterprise IT Architecture Plan | Weight / Length: 100% / 1,500 Words

Assignment Task:
Design an integrated information technology infrastructure configuration for an expanding medium enterprise. Map data pipelines between CRM, ERP, and localized database layers, ensuring data integrity and outlining cybersecurity defense patterns.

Evaluation Benchmarks:
• Logical cohesion of data flows between isolated enterprise software platforms.
• Adequacy of information access controls and modern cybersecurity frameworks.', '2026-08-17 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (93, 174, 'Global Entry Strategy Paper', 'Format: Global Entry Strategy Paper | Weight / Length: 100% / 2,200 Words

Assignment Task:
Formulate a market entry strategy for an enterprise seeking expansion into an unfamiliar region. Critically choose between FDI (Foreign Direct Investment), joint ventures, licensing models, or strategic alliances based on local market access barriers.

Evaluation Benchmarks:
• Depth of real-world regulatory risk assessment for the target country.
• Strategic alignment of the chosen corporate vehicle with local market realities.', '2026-08-31 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (95, 176, 'Trade Balance & FX Exposure Analysis', 'Format: Trade Balance & FX Exposure Analysis | Weight / Length: 100% / 1,800 Words

Assignment Task:
Analyze how a specific nation''s balance of payments and currency valuations respond to changing interest rates and central bank interventions. Model the resulting financial exposures for international businesses importing raw inputs from that area.

Evaluation Benchmarks:
• Correct application of international trade theories (e.g., comparative advantage, Heckscher-Ohlin).
• Technical accuracy in calculating currency risk exposures and hedging solutions.', '2026-09-28 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (96, 177, 'Global Brand Positioning Portfolio', 'Format: Global Brand Positioning Portfolio | Weight / Length: 100% / 2,000 Words

Assignment Task:
Formulate a unified international marketing initiative across three distinct geographic regions. Detail your standardizing vs. adapting product parameters, global pricing parity configurations, and unified digital channel marketing approaches.

Evaluation Benchmarks:
• Strategic logic behind decisions to standardize or adapt specific brand components.
• Design effectiveness of cross-border promotional frameworks.', '2026-10-12 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (97, 178, 'Global Trade Compliance & Logistics Manifest', 'Format: Global Trade Compliance & Logistics Manifest | Weight / Length: 100% / 1,800 Words

Assignment Task:
Draft an end-to-end operational export manifest for transporting a complex cargo category across international borders. Define exact Incoterms, customs declarations, tariff classifications, letters of credit, and compliance protocols.

Evaluation Benchmarks:
• Flawless application of Incoterms 2020 definitions and corresponding liability transfers.
• Completeness and statutory compliance of the generated cross-border documentation.', '2026-10-26 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (98, 179, 'Trade Protectionism Impact Thesis', 'Format: Trade Protectionism Impact Thesis | Weight / Length: 100% / 2,000 Words

Assignment Task:
Critically examine the operational fallouts from active regional trade disputes or protectionist shifts (e.g., bilateral tariff escalations). Detail the downstream adjustments required for organizational networks sourcing items from impacted regions.

Evaluation Benchmarks:
• Quality of data-driven analysis tracking the economic friction caused by trade barriers.
• Strategic value of alternative sourcing and supplier reorganization configurations.', '2026-11-09 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (99, 180, 'Cross-Border Human Capital Framework', 'Format: Cross-Border Human Capital Framework | Weight / Length: 100% / 1,800 Words

Assignment Task:
Design a comprehensive global human resources policy framework governing international assignment lifecycles. Address expat compensation models, cross-cultural training programs, global compliance tracking, and structured repatriation processes.

Evaluation Benchmarks:
• Sophistication of expatriate support systems and cost mitigation planning.
• Adherence to international labor standards and regional regulatory requirements.', '2026-11-23 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (100, 181, 'Strategic Business Plan & Defense Thesis', 'Format: Strategic Business Plan & Defense Thesis | Weight / Length: 100% / 5,000 Words + Presentation

Assignment Task:
Synthesize your business education into an expansive, independent research thesis. Identify a critical strategic problem within a real international organization, conduct rigorous competitive audits (Porter''s Five Forces, financial metrics), and construct an actionable multi-year corporate turnaround plan.

Evaluation Benchmarks:
• Advanced synthesis of financial, operational, marketing, and human capital theories.
• Methodological rigor, empirical evidence depth, and executive-level oral defense clarity.', '2026-12-07 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (101, 182, 'Global Market Entry Strategy Dossier', 'Format: Global Market Entry Strategy Dossier | Weight / Length: 100% / 3,500 Words

Assignment Task:
Formulate a market entry strategy for an enterprise seeking expansion into an unfamiliar region. Critically choose between FDI (Foreign Direct Investment), joint ventures, licensing models, or strategic alliances based on local market access barriers and corporate objectives.

Evaluation Benchmarks:
• Depth of regulatory, political, and market-access risk assessment for the target region.
• Strategic alignment of the chosen entry vehicle (FDI, JV, licensing, alliance) with corporate objectives.', '2026-01-19 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (102, 183, 'Lean Operations & Quality Optimization Audit', 'Format: Lean Operations & Quality Optimization Audit | Weight / Length: 100% / 3,500 Words

Assignment Task:
Evaluate an operational production line or service workflow to isolate efficiency bottlenecks. Apply Lean manufacturing or Six Sigma concepts to eliminate waste, optimize cycle times, and introduce proactive quality control loops.

Evaluation Benchmarks:
• Quantitative tracing of cycle times, capacity constraints, and process bottlenecks.
• Viability and cost-benefit calculation of the optimized Lean/Six Sigma process layout.', '2026-02-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (103, 184, 'Executive Communication & Change Briefing Plan', 'Format: Executive Communication & Change Briefing Plan | Weight / Length: 100% / 3,500 Words

Assignment Task:
Draft a formal Executive Briefing addressing a major organizational shift. Outline the internal communications framework needed to mitigate message distortion across departments, manage stakeholder friction, and coordinate distributed teams.

Evaluation Benchmarks:
• Professionalism, clarity, and structural quality of executive-level communications.
• Strategic viability of the multichannel corporate communication deployment blueprint.', '2026-02-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (104, 185, 'Enterprise Digital Commerce Architecture', 'Format: Enterprise Digital Commerce Architecture | Weight / Length: 100% / 3,500 Words

Assignment Task:
Design a technical and operational architecture for migrating a traditional enterprise into an omni-channel e-commerce brand. Address infrastructure hosting, UI/UX pathways, secure API gateways, and regional data protection standards (GDPR/CCPA).

Evaluation Benchmarks:
• Technical feasibility of payment gateways, inventory sync architectures, and compliance models.
• Integration effectiveness of customer acquisition, analytics, and security frameworks.', '2026-03-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (105, 186, 'Macro & Micro Market Impact Analysis', 'Format: Macro & Micro Market Impact Analysis | Weight / Length: 100% / 3,500 Words

Assignment Task:
Analyze a specific market sector and map out structural adjustments triggered by changing variables: inflation rates, shifting price elasticity of demand, and newly imposed government tariff barriers.

Evaluation Benchmarks:
• Proper structural deployment of supply-demand modelling and economic variables.
• Data-driven evaluation of policy interventions on market equilibrium.', '2026-03-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (106, 187, 'Corporate ESG Transformation Strategy', 'Format: Corporate ESG Transformation Strategy | Weight / Length: 100% / 3,500 Words

Assignment Task:
Audit a heavily resource-dependent business and build an Environmental, Social, and Governance (ESG) pivot model. Address carbon emission downscaling, circular supply chains, and transparent reporting metrics using global GRI standards.

Evaluation Benchmarks:
• Actionable, metrics-driven balance between corporate profits and environmental targets.
• Thorough understanding of regulatory sustainability frameworks and GRI compliance rules.', '2026-03-30 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (107, 188, 'Venture Blueprint & Investor Feasibility Study', 'Format: Venture Blueprint & Investor Feasibility Study | Weight / Length: 100% / 3,500 Words

Assignment Task:
Formulate an original, scalable business concept and construct a comprehensive investor-ready commercial blueprint. Include value proposition design, customer acquisition costs, break-even thresholds, and a 3-year funding road map.

Evaluation Benchmarks:
• Realism and structural integrity of market penetration and financial modeling assumptions.
• Clarity and persuasiveness of the underlying competitive advantage statement.', '2026-04-13 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (108, 189, 'Enterprise Information Architecture Plan', 'Format: Enterprise Information Architecture Plan | Weight / Length: 100% / 3,500 Words

Assignment Task:
Design an integrated information technology infrastructure configuration for an expanding enterprise. Map data pipelines between CRM, ERP, and localized database layers, ensuring data integrity and outlining cybersecurity defense patterns.

Evaluation Benchmarks:
• Logical cohesion of data flows between enterprise software platforms (CRM, ERP, BI).
• Adequacy of information governance, access controls, and cybersecurity frameworks.', '2026-04-27 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (109, 190, 'Strategic Workforce & Talent Architecture', 'Format: Strategic Workforce & Talent Architecture | Weight / Length: 100% / 3,500 Words

Assignment Task:
Analyze a corporate case study dealing with high employee attrition and low morale. Design an end-to-end human capital recovery blueprint covering revamped recruitment pipelines, equity-driven reward systems, and remote performance tracking frameworks.

Evaluation Benchmarks:
• Alignment of compensation and retention strategies with organizational behavior principles.
• Legal and ethical compliance of proposed labor and performance metrics.', '2026-05-11 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (110, 191, 'Corporate Capital Budgeting & Valuation Case', 'Format: Corporate Capital Budgeting & Valuation Case | Weight / Length: 100% / 3,500 Words + Financial Models

Assignment Task:
Examine competing multi-year investment options for an expanding enterprise. Calculate and compare the Net Present Value (NPV), Internal Rate of Return (IRR), and Payback Periods to advise senior executives on the best path forward.

Evaluation Benchmarks:
• Mathematical precision in discounting future cash flows and tracking hurdle rates.
• Logical justification of capital-allocation choices under fiscal constraints.', '2026-05-25 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (111, 192, 'Integrated Strategic Marketing Portfolio', 'Format: Integrated Strategic Marketing Portfolio | Weight / Length: 100% / 3,500 Words

Assignment Task:
Develop a comprehensive marketing launch strategy for an innovative product entering a competitive sector. Provide precise target market segment profiles (demographic, psychographic) and map out an integrated 4Ps framework.

Evaluation Benchmarks:
• Depth and accuracy of market segment targeting and positioning criteria.
• Strategic alignment across brand positioning, channels, and pricing models.', '2026-06-08 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (112, 193, 'Executive Organizational Strategy Audit', 'Format: Executive Organizational Strategy Audit | Weight / Length: 100% / 3,500 Words

Assignment Task:
Select an active international corporation and execute a strategic audit using the POLC framework (Planning, Organizing, Leading, Controlling). Critique how their corporate governance structure aligns with modern volatile operating realities.

Evaluation Benchmarks:
• Accurate application of the POLC and corporate governance frameworks to a live organization.
• Critical quality of structural management recommendations.', '2026-06-22 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (113, 194, 'Global Supply Network Optimization Model', 'Format: Global Supply Network Optimization Model | Weight / Length: 100% / 3,500 Words

Assignment Task:
Map out and analyze a cross-border distribution network suffering from geopolitical bottlenecks or port congestion. Calculate optimal inventory positions using Economic Order Quantity (EOQ) variables and establish risk mitigation paths.

Evaluation Benchmarks:
• Mathematical precision in inventory planning and logistics safety stock metrics.
• Strategic depth of the multi-tier risk management and supplier redundancy network.', '2026-07-06 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (114, 195, 'Corporate Financial Statement Construction & Analysis', 'Format: Corporate Financial Statement Construction & Analysis | Weight / Length: 100% / 3,500 Words + Ledger Workings

Assignment Task:
Given a raw unadjusted transaction ledger, process journal entries and construct complete financial statements; then conduct a comparative ratio analysis (liquidity, profitability, leverage, efficiency) against a publicly-traded peer to score financial health.

Evaluation Benchmarks:
• Structural and numerical accuracy across constructed financial statements.
• Insightfulness of comparative ratio analysis and operational commentary.', '2026-07-20 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (115, 196, 'IFRS Compliance Evaluation Framework', 'Format: IFRS Compliance Evaluation Framework | Weight / Length: 100% / 3,500 Words

Assignment Task:
Deconstruct complex corporate transactions involving revenue recognition, asset impairment, or lease treatments. Evaluate these cases to ensure strict compliance with International Financial Reporting Standards (IFRS) guidelines.

Evaluation Benchmarks:
• Accurate technical references and interpretation of explicit IFRS rules.
• Precision in adjusting accounting entries to reconcile compliance errors.', '2026-08-03 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (117, 198, 'Mixed-Methods Research Proposal & Data Analysis Strategy', 'Format: Mixed-Methods Research Proposal & Data Analysis Strategy | Weight / Length: 100% / Formal Research Proposal

Assignment Task:
Develop a comprehensive formal research proposal focusing on a specific complex, structural, or operational challenge within a modern enterprise ecosystem. Architect both an empirical quantitative approach (e.g., structural equation modeling or multi-variable regression) and an inductive qualitative approach (e.g., thematic analysis from semi-structured executive interviews), including problem formulation, research instrumentation, and an analytical triangulation strategy.

Evaluation Benchmarks:
• Critical problem formulation with operational hypotheses and research questions.
• Robust research instrumentation and a structured analytical triangulation strategy.', '2026-01-19 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (118, 199, 'Critical Systematic Literature Review & Theoretical Framework', 'Format: Critical Systematic Literature Review & Theoretical Framework | Weight / Length: 100% / Systematic Review (30+ peer-reviewed articles)

Assignment Task:
Conduct a highly rigorous, systematic review of at least 30 peer-reviewed, high-impact journal articles from the last five years on macro-level corporate strategy or organizational behavior. Produce a synthesized literature matrix, a conceptual framework exposing an unaddressed research gap, and definitive theoretical justification.

Evaluation Benchmarks:
• Exhaustive synthesized literature matrix indexing methodologies, variables, and limitations.
• Theoretical justification mapping established paradigms onto the study''s conceptual model.', '2026-02-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (119, 200, 'Applied Pilot Study & Industry Specialization Paper', 'Format: Applied Pilot Study & Industry Specialization Paper | Weight / Length: 100% / Pilot Study + Specialization Review

Assignment Task:
Narrow focus into the candidate''s elected specialization track (e.g., Strategic Management, Finance, Governance, or Marketing) and perform an isolated pilot study or advanced comparative industry case study. Deliver a specialization review, a pilot execution report (3–5 expert interviews or a restricted dataset), and an instrument refinement strategy.

Evaluation Benchmarks:
• Localized specialization analysis of sector risks, policy dynamics, and operational pain points.
• Methodological soundness of pilot execution and instrument refinement strategy.', '2026-02-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (120, 201, 'The Doctoral Dissertation (Progressive Milestones)', 'Format: The Doctoral Dissertation (Progressive Milestones) | Weight / Length: 100% / Five-Chapter Dissertation Manuscript

Assignment Task:
Execute the core data gathering and drafting of the primary independent research project through a sequence of formal milestones: Institutional Review Board (IRB) ethics clearance, fieldwork and raw dataset submission, and a complete five-chapter dissertation draft with actionable practical recommendations for corporate practitioners.

Evaluation Benchmarks:
• Completion of IRB ethics clearance, fieldwork, and raw dataset submission milestones.
• Quality of the five-chapter manuscript and actionable practitioner recommendations.', '2026-03-02 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (121, 202, 'Oral Defense Presentation & Academic Defense Dossier', 'Format: Oral Defense Presentation & Academic Defense Dossier | Weight / Length: 100% / 20-Minute Defense + 3-Page Executive Dossier

Assignment Task:
Prepare, deliver, and defend the final completed dissertation before an officially appointed Academic and Professional Examination Board. Produce a concise 20-minute defense presentation slide deck and a 3-page executive briefing dossier delineating practitioner solutions and strategic policy impacts.

Evaluation Benchmarks:
• Comprehensive justification of empirical models, research ethics, and conclusions under cross-examination.
• Polish and practitioner value of the defense deck and executive briefing dossier.', '2026-03-16 23:59:00+00', 100, NULL);
INSERT INTO public.assignments (id, subject_id, title, description, due_date, max_score, instructions_url) VALUES (82, 163, 'Corporate Capital Budgeting Case Analysis', 'Format: Corporate Capital Budgeting Case Analysis | Weight / Length: 100% / 1,500 Words + Excel Models

Assignment Task:
Examine competing multi-year investment options for an expanding manufacturing enterprise. Calculate and compare the Net Present Value (NPV), Internal Rate of Return (IRR), and Payback Periods to advise senior executives on the best path forward.

Evaluation Benchmarks:
• Mathematical precision in discounting future cash flows and tracking hurdle rates.
• Logical justification of capital-allocation choices under fiscal limits.', '2026-03-30 23:59:00+00', 100, NULL);


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (1, 'BSc Computer Science', 'bsc-computer-science', 'A comprehensive undergraduate program covering algorithms, systems, AI and software engineering.', 'undergraduate', 144, 4800.00, NULL, '2026-06-27 20:25:56.536943+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (2, 'MBA in Global Management', 'mba-global-management', 'A postgraduate business program focused on leadership, strategy and international markets.', 'postgraduate', 96, 9600.00, NULL, '2026-06-27 20:25:56.536943+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (3, 'Diploma in Data Analytics', 'diploma-data-analytics', 'A practical diploma covering statistics, SQL, visualization and business intelligence.', 'diploma', 48, 2400.00, NULL, '2026-06-27 20:25:56.536943+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (4, 'Certificate in Digital Marketing', 'certificate-digital-marketing', 'A short certificate program on SEO, content, paid media and analytics.', 'certificate', 12, 0.00, NULL, '2026-06-27 20:25:56.536943+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (38, 'Bachelor of Business Administration (BBA)', 'bba-business-administration', 'A comprehensive, internationally aligned undergraduate curriculum (180 ECTS, ACBSP Candidacy) developing strategic leadership, analytical precision, and mastery across 24 core corporate modules over three academic years.', 'undergraduate', 144, 4500.00, NULL, '2026-07-04 23:12:08.158511+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (39, 'Master of Business Administration (MBA)', 'mba-business-administration', 'An advanced postgraduate degree (90 ECTS, ACBSP Candidacy) spanning 16 modules across two academic years — core executive frameworks, advanced specialization, and a Master Thesis / Capstone Research Project defended via Viva Voce.', 'postgraduate', 72, 4000.00, NULL, '2026-07-04 23:12:08.158511+00');
INSERT INTO public.courses (id, title, slug, description, level, duration_weeks, price, thumbnail_url, created_at) VALUES (40, 'Doctor of Business Administration (DBA)', 'dba-business-administration', 'A practitioner-oriented doctoral program (180 ECTS) of five doctoral-level modules spanning advanced research methodology, scholarly engagement, an independent thesis, and a formal Viva Voce defense.', 'doctorate', 120, 5000.00, NULL, '2026-07-04 23:12:08.158511+00');


--
-- Data for Name: payment_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (19, 38, 'one-time', 'Pay in full', 1, 4500.00, 4500.00, 0, '2026-07-07 13:25:03.432153+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (20, 38, 'installment', '3-month plan', 3, 1600.00, 4800.00, 1, '2026-07-07 13:25:03.432153+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (21, 38, 'installment', '6-month plan', 6, 900.00, 5400.00, 2, '2026-07-07 13:25:03.432153+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (22, 39, 'one-time', 'Pay in full', 1, 4000.00, 4000.00, 0, '2026-07-07 13:25:03.438582+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (23, 39, 'installment', '2-month plan', 2, 2100.00, 4200.00, 1, '2026-07-07 13:25:03.438582+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (24, 39, 'installment', '4-month plan', 4, 1200.00, 4800.00, 2, '2026-07-07 13:25:03.438582+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (25, 40, 'one-time', 'Pay in full', 1, 5000.00, 5000.00, 0, '2026-07-07 13:25:03.44466+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (26, 40, 'installment', '3-month plan', 3, 1800.00, 5400.00, 1, '2026-07-07 13:25:03.44466+00');
INSERT INTO public.payment_plans (id, course_id, type, name, installment_count, installment_amount, total_amount, order_index, created_at) VALUES (27, 40, 'installment', '6-month plan', 6, 1000.00, 6000.00, 2, '2026-07-07 13:25:03.44466+00');


--
-- Data for Name: study_materials; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (127, 152, 'Advanced Practice — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.051582+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (130, 153, 'Capstone — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.073939+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (97, 142, 'Foundations — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.897797+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (100, 143, 'Core Principles — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.905552+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (103, 144, 'Advanced Practice — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.914321+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (106, 145, 'Capstone — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.925168+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (109, 146, 'Foundations — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.931609+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (112, 147, 'Core Principles — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.939305+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (115, 148, 'Advanced Practice — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.950151+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (118, 149, 'Capstone — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.957725+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (99, 142, 'Foundations — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.897797+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (102, 143, 'Core Principles — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.905552+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (105, 144, 'Advanced Practice — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.914321+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (108, 145, 'Capstone — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.925168+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (111, 146, 'Foundations — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.931609+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (114, 147, 'Core Principles — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.939305+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (117, 148, 'Advanced Practice — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.950151+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (120, 149, 'Capstone — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.957725+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (123, 150, 'Foundations — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:35.963532+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (126, 151, 'Core Principles — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.014133+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (129, 152, 'Advanced Practice — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.051582+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (132, 153, 'Capstone — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.073939+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (121, 150, 'Foundations — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:35.963532+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (124, 151, 'Core Principles — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.014133+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (98, 142, 'Foundations — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.897797+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (101, 143, 'Core Principles — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.905552+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (104, 144, 'Advanced Practice — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.914321+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (107, 145, 'Capstone — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.925168+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (110, 146, 'Foundations — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.931609+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (113, 147, 'Core Principles — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.939305+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (116, 148, 'Advanced Practice — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.950151+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (119, 149, 'Capstone — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.957725+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (122, 150, 'Foundations — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:35.963532+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (125, 151, 'Core Principles — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.014133+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (128, 152, 'Advanced Practice — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.051582+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (131, 153, 'Capstone — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.073939+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (135, 154, 'Foundations — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.088179+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (138, 155, 'Core Principles — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.098117+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (141, 156, 'Advanced Practice — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.103767+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (144, 157, 'Capstone — Reading Summary', 'text', NULL, 'Review the key concepts covered in this module and complete the practice questions before moving on.', NULL, '2026-07-07 13:17:36.112685+00', 3);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (133, 154, 'Foundations — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.088179+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (136, 155, 'Core Principles — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.098117+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (139, 156, 'Advanced Practice — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.103767+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (142, 157, 'Capstone — Video Lecture', 'video', '/objects/videos/sample-lecture.mp4', NULL, 10, '2026-07-07 13:17:36.112685+00', 1);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (134, 154, 'Foundations — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.088179+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (137, 155, 'Core Principles — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.098117+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (140, 156, 'Advanced Practice — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.103767+00', 2);
INSERT INTO public.study_materials (id, subject_id, title, type, url, content, duration_minutes, created_at, order_index) VALUES (143, 157, 'Capstone — Lecture Notes (PDF)', 'pdf', '/objects/docs/sample-lecture-notes.pdf', NULL, NULL, '2026-07-07 13:17:36.112685+00', 2);


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (142, 1, 'Foundations', 'Introductory module establishing core concepts.', 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (143, 1, 'Core Principles', 'Building blocks and essential theory for the program.', 2, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (144, 1, 'Advanced Practice', 'Applied module with hands-on coursework.', 3, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (145, 1, 'Capstone', 'Final project demonstrating mastery.', 4, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (146, 2, 'Foundations', 'Introductory module establishing core concepts.', 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (147, 2, 'Core Principles', 'Building blocks and essential theory for the program.', 2, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (148, 2, 'Advanced Practice', 'Applied module with hands-on coursework.', 3, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (149, 2, 'Capstone', 'Final project demonstrating mastery.', 4, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (150, 3, 'Foundations', 'Introductory module establishing core concepts.', 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (151, 3, 'Core Principles', 'Building blocks and essential theory for the program.', 2, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (152, 3, 'Advanced Practice', 'Applied module with hands-on coursework.', 3, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (153, 3, 'Capstone', 'Final project demonstrating mastery.', 4, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (154, 4, 'Foundations', 'Introductory module establishing core concepts.', 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (155, 4, 'Core Principles', 'Building blocks and essential theory for the program.', 2, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (156, 4, 'Advanced Practice', 'Applied module with hands-on coursework.', 3, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (157, 4, 'Capstone', 'Final project demonstrating mastery.', 4, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (158, 38, 'BUS110 — Business Communication', NULL, 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (159, 38, 'MGT120 — Managing Business', NULL, 2, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (160, 38, 'ACC130 — Accounting Principles I', NULL, 3, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (161, 38, 'BUS140 — E-Commerce', NULL, 4, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (162, 38, 'ECO150 — Principles of Economics', NULL, 5, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (163, 38, 'FIN160 — Principles of Finance', NULL, 6, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (164, 38, 'MKT170 — Principles of Marketing', NULL, 7, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (165, 38, 'HRM180 — Human Resource Management', NULL, 8, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (166, 38, 'ACT210 — Accounting Principles II', NULL, 9, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (167, 38, 'MGT220 — Operations Management', NULL, 10, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (168, 38, 'BUS230 — Entrepreneurship', NULL, 11, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (169, 38, 'BUS240 — Sustainable Business Practices', NULL, 12, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (170, 38, 'FIN250 — Financial Reporting', NULL, 13, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (171, 38, 'MGT260 — Logistics and Supply Chain Management', NULL, 14, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (172, 38, 'MKT270 — Cross-Cultural Marketing', NULL, 15, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (173, 38, 'MGT280 — Business Information Management', NULL, 16, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (174, 38, 'IBM310 — International Business Management', NULL, 17, 3, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (175, 38, 'IBM330 — International Business Environment', NULL, 18, 3, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (176, 38, 'IBM340 — International Economics', NULL, 19, 3, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (177, 38, 'IBM350 — International Marketing', NULL, 20, 3, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (178, 38, 'IBM360 — Import and Export Management', NULL, 21, 3, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (179, 38, 'IBM370 — International Trade and Contemporary Issues', NULL, 22, 3, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (180, 38, 'IBM320 — Managing International Workforce', NULL, 23, 3, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (181, 38, 'IBM380 — International Business Management Capstone Project', NULL, 24, 3, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (182, 39, 'MBA510 — International Business Management', NULL, 1, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (183, 39, 'MBA520 — Operations Management', NULL, 2, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (184, 39, 'MBA530 — Business Communication', NULL, 3, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (185, 39, 'MBA540 — E-Commerce', NULL, 4, 1, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (186, 39, 'MBA550 — Principles of Economics', NULL, 5, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (187, 39, 'MBA560 — Sustainable Business Practices', NULL, 6, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (188, 39, 'MBA570 — Entrepreneurship', NULL, 7, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (189, 39, 'MBA580 — Business Information Management', NULL, 8, 1, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (190, 39, 'MBA590 — Human Resource Management', NULL, 9, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (191, 39, 'MBA600 — Principles of Finance', NULL, 10, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (192, 39, 'MBA610 — Principles of Marketing', NULL, 11, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (193, 39, 'MBA620 — Managing Business', NULL, 12, 2, 1, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (194, 39, 'MBA630 — Logistics and Supply Chain Management', NULL, 13, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (195, 39, 'MBA640 — Accounting Principles I & II', NULL, 14, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (196, 39, 'MBA650 — Financial Reporting', NULL, 15, 2, 2, 7.5);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (197, 39, 'MBA690 — Master Thesis / Capstone Research Project', 'Graduate capstone milestone (30 ECTS): an independent empirical research thesis defended via Viva Voce before the CGU academic board.', 16, 2, 2, 30);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (198, 40, 'RBL810 — Research Methodology: Quantitative & Qualitative Analyses', 'Focuses on advanced research tools, rigorous research design, data analysis paradigms, and sophisticated methodologies explicitly geared toward solving complex, practical corporate problems.', 1, 1, 1, 30);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (199, 40, 'RBL820 — Scholarly Engagement I', 'Focuses on developing an extensive, critical literature review, identifying specific research gaps, and constructing contemporary theoretical frameworks of competitive business strategy.', 2, 1, 2, 15);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (200, 40, 'RBL830 — Scholarly Engagement II', 'Involves localized, applied research and literature exploration tailored into advanced specializations such as global marketing strategy, corporate governance, or supply chain dynamics.', 3, 2, 1, 15);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (201, 40, 'DSSR980 — Doctorate Thesis', 'The substantive developmental, drafting, and investigative phase dedicated to executing and finalizing the primary practitioner-oriented independent research project.', 4, 2, 2, 90);
INSERT INTO public.subjects (id, course_id, title, description, order_index, year, semester, credits) VALUES (202, 40, 'VIVA920 — Viva Voce (Oral Defense)', 'The conclusive formal presentation and rigorous defense of the doctoral thesis before an appointed academic and professional examination board.', 5, 3, 1, 30);


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assignments_id_seq', 122, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 62, true);


--
-- Name: payment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_plans_id_seq', 27, true);


--
-- Name: study_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.study_materials_id_seq', 144, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 203, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Cbclab8dOLPagfvUUHortF7EtiRWxfHadGAs1RZGw249XxNWRSeBmDlNYQcgp3J

