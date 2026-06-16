export type WorkspaceLinkRule = {
  source: string;
  target: string;
  linkType: string;
  description: string;
};

export const WORKSPACE_LINK_RULES: WorkspaceLinkRule[] = [
  { source: "ws01_products", target: "ws04_product_profitability", linkType: "product_financial_input", description: "WS01 products feed WS04 product profitability." },
  { source: "ws01_products", target: "ws06_bcg_items", linkType: "portfolio_product_input", description: "WS01 products feed WS06 BCG." },
  { source: "ws02_pestel_factors", target: "ws05_swot_items", linkType: "external_factor_input", description: "WS02 PESTEL opportunities/threats feed WS05 SWOT." },
  { source: "ws02_porter_analyses", target: "ws07_risk_scores", linkType: "risk_signal", description: "WS02 Porter force scores feed WS07 risk scoring." },
  { source: "ws03_ife_factors", target: "ws05_swot_items", linkType: "internal_factor_input", description: "WS03 IFE outputs feed WS05 SWOT." },
  { source: "ws03_vrio_resources", target: "ws05_swot_items", linkType: "internal_factor_input", description: "WS03 VRIO outputs feed WS05 SWOT." },
  { source: "ws04_pl_records", target: "ws07_decision_runs", linkType: "financial_input", description: "WS04 P&L data feeds WS07 Decision Engine." },
  { source: "ws05_swot_items", target: "ws07_decision_runs", linkType: "synthesis_input", description: "WS05 synthesis feeds WS07." },
  { source: "ws05_strategic_themes", target: "ws08_bsc_objectives", linkType: "strategy_input", description: "WS05 themes feed WS08." },
  { source: "ws07_strategic_priorities", target: "ws08_bsc_objectives", linkType: "priority_to_objective_input", description: "WS07 priorities feed WS08 BSC." },
  { source: "ws08_bsc_objectives", target: "ws09_okrs", linkType: "objective_to_okr_input", description: "WS08 objectives feed WS09 OKRs." },
  { source: "ws09_okrs", target: "ws10_kpi_readings", linkType: "execution_to_performance_input", description: "WS09 OKRs feed WS10 KPI tracking." },
  { source: "ws10_review_notes", target: "ws12_memory_entries", linkType: "memory_source", description: "WS10 reviews and decisions feed WS12 Strategic Memory." }
];

export function inferLinkRule(sourceTable: string, targetTable: string) {
  return WORKSPACE_LINK_RULES.find((rule) => rule.source === sourceTable && rule.target === targetTable);
}

