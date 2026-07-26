// Mirrors the pryces-api FastAPI schemas. All monetary/Decimal fields arrive as
// JSON strings — keep them as strings here and parse only at the formatting edge.

export interface PortfolioSummary {
    name: string;
    base_currency: string;
    transaction_count: number;
}

export interface Position {
    symbol: string;
    name?: string | null;
    quantity: string;
    avg_cost: string;
    price: string;
    currency: string;
    value_base: string;
    cost_base: string;
    unrealized_pnl_base: string;
    realized_pnl_base: string;
    lifetime_pnl_base: string;
    total_return_pct: string;
    lifetime_return_pct?: string | null;
    broker?: string | null;
}

export interface TransactionRow {
    id: string;
    date: string;
    type: string;
    symbol: string;
    quantity?: string | null;
    price?: string | null;
    amount?: string | null;
    fee: string;
    currency: string;
    broker?: string | null;
    portfolio?: string | null;
}

// Body for hand-adding or editing a transaction (POST manual / PATCH).
export interface TransactionInput {
    date: string;
    type: string;
    symbol: string;
    currency: string;
    quantity?: string | null;
    price?: string | null;
    amount?: string | null;
    fee?: string | null;
}

export interface ClosedPosition {
    symbol: string;
    name?: string | null;
    currency: string;
    realized_pnl_base: string;
    cost_basis_sold_base: string;
    realized_return_pct: string;
    hold_period_days?: number | null;
    broker?: string | null;
}

export interface ManualAsset {
    name: string;
    asset_type: string;
    value_base: string;
}

export interface Portfolio {
    base_currency: string;
    positions: Position[];
    manual_assets: ManualAsset[];
    closed_positions: ClosedPosition[];
    positions_value: string;
    manual_value: string;
    total_value: string;
    total_cost: string;
    total_unrealized_pnl: string;
    total_realized_pnl: string;
    total_profit: string;
    total_return_pct: string;
    xirr_pct?: string | null;
    twr_pct?: string | null;
}

export interface CreatePortfolioBody {
    base_currency: string;
    name?: string | null;
}

export interface PortfolioBreakdownItem {
    name: string;
    base_currency: string;
    total_value: string;
    total_profit: string;
    total_return_pct: string;
}

export interface Overview {
    portfolio: Portfolio;
    breakdown: PortfolioBreakdownItem[];
}

export interface ImportDataResult {
    portfolios_created: number;
    portfolios_merged: number;
    portfolios_skipped: number;
    transactions_added: number;
    transactions_skipped: number;
    manual_assets_replaced: number;
    warnings: string[];
}

export interface ImportResult {
    broker: string;
    parsed: number;
    inserted: number;
    duplicates: number;
    unresolved_symbols: string[];
    warnings: string[];
}
