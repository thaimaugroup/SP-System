import type { WorkspaceDefinition } from "@/types/workspace";

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    code: "WS01",
    name: "Business Foundation",
    shortName: "Foundation",
    purpose: "Define vision, mission, business model, products, customers, and strategic context.",
    iconName: "Building2",
    upstream: [],
    downstream: ["WS02", "WS04", "WS06", "WS07"],
    modules: [
      { label: "Vision & Mission", table: "ws01_vision_mission", description: "North star statements." },
      { label: "Core Values", table: "ws01_core_values", description: "Operating principles." },
      { label: "Products", table: "ws01_products", description: "Product and service portfolio." },
      { label: "Customer Segments", table: "ws01_customer_segments", description: "Customer segment master." }
    ]
  },
  {
    code: "WS02",
    name: "External Intelligence",
    shortName: "External",
    purpose: "Capture PESTEL, competitors, markets, trends, customer intelligence, and scenarios.",
    iconName: "Radar",
    upstream: ["WS01"],
    downstream: ["WS05", "WS07"],
    modules: [
      { label: "PESTEL Factors", table: "ws02_pestel_factors", description: "External opportunities and threats." },
      { label: "Porter Analyses", table: "ws02_porter_analyses", description: "Five forces analysis." },
      { label: "Competitors", table: "ws02_competitors", description: "Competitor intelligence." },
      { label: "Trends", table: "ws02_trends", description: "Market and technology trends." }
    ]
  },
  {
    code: "WS03",
    name: "Internal Intelligence",
    shortName: "Internal",
    purpose: "Assess IFE, EFE, VRIO, capabilities, value chain, maturity, and organizational health.",
    iconName: "Network",
    upstream: ["WS01"],
    downstream: ["WS05", "WS11"],
    modules: [
      { label: "IFE Factors", table: "ws03_ife_factors", description: "Strengths and weaknesses." },
      { label: "VRIO Resources", table: "ws03_vrio_resources", description: "Strategic resource advantage." },
      { label: "Capabilities", table: "ws03_capabilities", description: "Capability maturity." },
      { label: "Value Chain", table: "ws03_value_chain_activities", description: "Activity performance." }
    ]
  },
  {
    code: "WS04",
    name: "Financial Intelligence",
    shortName: "Financial",
    purpose: "Capture P&L, revenue, costs, profitability, cash flow, and investment data.",
    iconName: "LineChart",
    upstream: ["WS01"],
    downstream: ["WS06", "WS07"],
    modules: [
      { label: "P&L Records", table: "ws04_pl_records", description: "Monthly financial performance." },
      { label: "Product Profitability", table: "ws04_product_profitability", description: "Product economics linked to WS01." },
      { label: "Cash Flow", table: "ws04_cash_flow_records", description: "Cash flow signals." },
      { label: "Investment Analyses", table: "ws04_investment_analyses", description: "Capex and ROI cases." }
    ]
  },
  {
    code: "WS05",
    name: "Strategic Synthesis",
    shortName: "Synthesis",
    purpose: "Synthesize SWOT, TOWS, strategic themes, opportunities, and risks from upstream evidence.",
    iconName: "GitMerge",
    upstream: ["WS02", "WS03", "WS04"],
    downstream: ["WS07", "WS08"],
    modules: [
      { label: "SWOT Analyses", table: "ws05_swot_analyses", description: "Synthesis containers." },
      { label: "SWOT Items", table: "ws05_swot_items", description: "Approved SWOT items." },
      { label: "TOWS Strategies", table: "ws05_tows_strategies", description: "Strategy options." },
      { label: "Strategic Themes", table: "ws05_strategic_themes", description: "Prioritized themes." }
    ]
  },
  {
    code: "WS06",
    name: "Portfolio & Growth",
    shortName: "Portfolio",
    purpose: "Analyze BCG, Ansoff, GE McKinsey, Blue Ocean, ERRC, and lifecycle options.",
    iconName: "LayoutGrid",
    upstream: ["WS01", "WS04"],
    downstream: ["WS07", "WS08"],
    modules: [
      { label: "BCG Items", table: "ws06_bcg_items", description: "Market growth and relative share." },
      { label: "Ansoff Options", table: "ws06_ansoff_options", description: "Growth vector options." },
      { label: "GE McKinsey", table: "ws06_ge_mckinsey_items", description: "Portfolio attractiveness." },
      { label: "Lifecycle", table: "ws06_product_lifecycle_items", description: "Product lifecycle signals." }
    ]
  },
  {
    code: "WS07",
    name: "AI Strategic Decision Engine",
    shortName: "Decision Engine",
    purpose: "Score opportunities, risks, priorities, and strategic decisions with linked evidence.",
    iconName: "BrainCircuit",
    upstream: ["WS01", "WS02", "WS03", "WS04", "WS05", "WS06"],
    downstream: ["WS08", "WS12"],
    modules: [
      { label: "Decision Runs", table: "ws07_decision_runs", description: "Decision scoring runs." },
      { label: "Risk Scores", table: "ws07_risk_scores", description: "Risk scoring." },
      { label: "Strategic Priorities", table: "ws07_strategic_priorities", description: "Approved ranked priorities." },
      { label: "Scoring Weights", table: "ws07_scoring_weights", description: "Criteria weights." }
    ]
  },
  {
    code: "WS08",
    name: "Strategy Mapping",
    shortName: "Mapping",
    purpose: "Translate priorities into Balanced Scorecard objectives and strategy map edges.",
    iconName: "Workflow",
    upstream: ["WS05", "WS07"],
    downstream: ["WS09"],
    modules: [
      { label: "BSC Cycles", table: "ws08_bsc_cycles", description: "Balanced scorecard cycles." },
      { label: "BSC Objectives", table: "ws08_bsc_objectives", description: "Objective library." },
      { label: "Strategy Map Edges", table: "ws08_strategy_map_edges", description: "Causal links." }
    ]
  },
  {
    code: "WS09",
    name: "Execution Management",
    shortName: "Execution",
    purpose: "Manage OKRs, key results, initiatives, projects, tasks, RACI, and risks.",
    iconName: "ListChecks",
    upstream: ["WS08"],
    downstream: ["WS10"],
    modules: [
      { label: "OKRs", table: "ws09_okrs", description: "Execution objectives." },
      { label: "Key Results", table: "ws09_key_results", description: "Measurable results." },
      { label: "Initiatives", table: "ws09_initiatives", description: "Strategic initiatives." },
      { label: "Projects", table: "ws09_projects", description: "Delivery workstreams." }
    ]
  },
  {
    code: "WS10",
    name: "Performance Management",
    shortName: "Performance",
    purpose: "Track KPIs, readings, dashboards, review cycles, and management notes.",
    iconName: "Gauge",
    upstream: ["WS09"],
    downstream: ["WS07", "WS12"],
    modules: [
      { label: "KPIs", table: "ws10_kpis", description: "KPI definitions." },
      { label: "KPI Readings", table: "ws10_kpi_readings", description: "Actuals and variance." },
      { label: "Review Cycles", table: "ws10_review_cycles", description: "Performance reviews." },
      { label: "Review Notes", table: "ws10_review_notes", description: "Decisions and actions." }
    ]
  },
  {
    code: "WS11",
    name: "Organization Design",
    shortName: "Organization",
    purpose: "Manage roles, competencies, org design scenarios, and succession plans.",
    iconName: "UsersRound",
    upstream: ["WS03", "WS07"],
    downstream: ["WS09", "WS12"],
    modules: [
      { label: "Roles", table: "ws11_roles", description: "Strategic role catalog." },
      { label: "Competencies", table: "ws11_competencies", description: "Capability requirements." },
      { label: "Org Scenarios", table: "ws11_org_design_scenarios", description: "Operating model options." },
      { label: "Succession Plans", table: "ws11_succession_plans", description: "Critical role continuity." }
    ]
  },
  {
    code: "WS12",
    name: "Strategic Memory",
    shortName: "Memory",
    purpose: "Capture memory entries, decision records, lessons learned, playbooks, and embeddings.",
    iconName: "Archive",
    upstream: ["WS07", "WS10", "WS11"],
    downstream: ["WS02", "WS07"],
    modules: [
      { label: "Memory Entries", table: "ws12_memory_entries", description: "Institutional memory." },
      { label: "Decision Records", table: "ws12_decision_records", description: "Decision archive." },
      { label: "Lessons Learned", table: "ws12_lessons_learned", description: "Reusable lessons." },
      { label: "Playbooks", table: "ws12_playbooks", description: "Repeatable strategy practices." }
    ]
  }
];

export const WORKSPACE_BY_CODE = Object.fromEntries(WORKSPACES.map((workspace) => [workspace.code, workspace]));

export const ALLOWED_TARGET_TABLES = new Set(
  WORKSPACES.flatMap((workspace) => workspace.modules.map((module) => module.table))
);

export function getWorkspaceByTable(table: string) {
  return WORKSPACES.find((workspace) => workspace.modules.some((module) => module.table === table));
}

