-- =============================================================================
-- Business Pulse Agent — Complete Supabase PostgreSQL Schema
-- =============================================================================

-- 1. Marketplaces Table
CREATE TABLE IF NOT EXISTS marketplaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    launch_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS ix_products_category ON products(category);

-- 3. Sales Daily Table
CREATE TABLE IF NOT EXISTS sales_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    visits INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units_sold INTEGER DEFAULT 0,
    revenue DOUBLE PRECISION DEFAULT 0,
    returns INTEGER DEFAULT 0,
    ad_spend DOUBLE PRECISION DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_sales_daily_date ON sales_daily(date);
CREATE INDEX IF NOT EXISTS ix_sales_daily_product_id ON sales_daily(product_id);
CREATE INDEX IF NOT EXISTS ix_sales_daily_marketplace_id ON sales_daily(marketplace_id);
CREATE INDEX IF NOT EXISTS ix_sales_date_product_mkt ON sales_daily(date, product_id, marketplace_id);

-- 4. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    stock INTEGER DEFAULT 0,
    incoming_stock INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_inventory_date ON inventory(date);
CREATE INDEX IF NOT EXISTS ix_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS ix_inventory_marketplace_id ON inventory(marketplace_id);

-- 5. Competitor Prices Table
CREATE TABLE IF NOT EXISTS competitor_prices (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
    our_price DOUBLE PRECISION NOT NULL,
    competitor_avg_price DOUBLE PRECISION NOT NULL,
    competitor_min_price DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_competitor_prices_date ON competitor_prices(date);
CREATE INDEX IF NOT EXISTS ix_competitor_prices_product_id ON competitor_prices(product_id);
CREATE INDEX IF NOT EXISTS ix_competitor_prices_marketplace_id ON competitor_prices(marketplace_id);

-- 6. Monitoring Rules Table
CREATE TABLE IF NOT EXISTS monitoring_rules (
    id SERIAL PRIMARY KEY,
    kpi_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    threshold_type VARCHAR(100) NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium',
    cooldown_minutes INTEGER DEFAULT 120,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS ix_monitoring_rules_kpi_name ON monitoring_rules(kpi_name);

-- 7. Agent Runs Table
CREATE TABLE IF NOT EXISTS agent_runs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50) DEFAULT 'Running',
    kpis_checked INTEGER DEFAULT 0,
    anomalies_detected INTEGER DEFAULT 0,
    alerts_created INTEGER DEFAULT 0,
    trigger VARCHAR(100) DEFAULT 'manual',
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 8. Agent Steps Table
CREATE TABLE IF NOT EXISTS agent_steps (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50) DEFAULT 'Running',
    duration_ms INTEGER,
    output_summary TEXT,
    step_metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_agent_steps_run_id ON agent_steps(run_id);

-- 9. Anomalies Table
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    kpi_name VARCHAR(100) NOT NULL,
    detected_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    actual_value DOUBLE PRECISION NOT NULL,
    expected_value DOUBLE PRECISION NOT NULL,
    deviation_pct DOUBLE PRECISION NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    entity_type VARCHAR(100),
    entity_id INTEGER,
    marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,
    detection_method VARCHAR(100) NOT NULL,
    anomaly_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS ix_anomalies_kpi_name ON anomalies(kpi_name);
CREATE INDEX IF NOT EXISTS ix_anomalies_detected_at ON anomalies(detected_at);

-- 10. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    anomaly_id INTEGER NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    kpi_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_name VARCHAR(255),
    marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,
    severity VARCHAR(50) NOT NULL,
    actual_value DOUBLE PRECISION NOT NULL,
    expected_value DOUBLE PRECISION NOT NULL,
    deviation_pct DOUBLE PRECISION NOT NULL,
    estimated_impact DOUBLE PRECISION,
    summary TEXT NOT NULL,
    evidence JSONB DEFAULT '[]'::jsonb,
    contributors JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    confidence DOUBLE PRECISION DEFAULT 0.5,
    ai_mode VARCHAR(50) DEFAULT 'llm',
    status VARCHAR(50) DEFAULT 'New',
    dedup_key VARCHAR(255) NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    last_detected_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    acknowledged_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    dismissed_at TIMESTAMP WITHOUT TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_alerts_kpi_name ON alerts(kpi_name);
CREATE INDEX IF NOT EXISTS ix_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS ix_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS ix_alerts_dedup_key ON alerts(dedup_key);

-- =============================================================================
-- Initial Default Monitoring Rules
-- =============================================================================
INSERT INTO monitoring_rules (kpi_name, enabled, threshold_type, threshold_value, severity, cooldown_minutes)
VALUES
    ('revenue', true, 'rolling_baseline', 0.10, 'High', 120),
    ('orders', true, 'rolling_baseline', 0.12, 'High', 120),
    ('avg_order_value', true, 'rolling_baseline', 0.15, 'Medium', 120),
    ('conversion_rate', true, 'compound', 0.15, 'High', 120),
    ('return_rate', true, 'relative_change', 0.25, 'Medium', 120),
    ('marketplace_revenue', true, 'rolling_baseline', 0.15, 'High', 120),
    ('inventory_days', true, 'threshold', 0.20, 'Critical', 60),
    ('sales_velocity', true, 'rolling_baseline', 0.25, 'Medium', 120)
ON CONFLICT DO NOTHING;

-- Initial Marketplaces
INSERT INTO marketplaces (name)
VALUES ('Amazon'), ('Myntra'), ('Flipkart'), ('Ajio')
ON CONFLICT DO NOTHING;
