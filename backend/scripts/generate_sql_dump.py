"""
Generate supabase/seed_data.sql containing all products and baseline data
that can be executed directly in the Supabase SQL editor if desired.
"""
import os
import sys
from datetime import date, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.seed_database import (
    make_products, assign_scenarios, build_data, MARKETPLACES, CATEGORIES, TODAY, NUM_DAYS, START_DATE
)

def generate():
    random.seed(42)
    products = make_products(130)
    scenarios = assign_scenarios(products)
    sales_rows, inventory_rows, competitor_rows = build_data(products, scenarios)

    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "supabase", "seed_data.sql")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, "w") as f:
        f.write("-- =============================================================================\n")
        f.write("-- Business Pulse Agent — Synthetic Business Seed Data\n")
        f.write("-- =============================================================================\n\n")

        f.write("-- 1. Marketplaces\n")
        for m in MARKETPLACES:
            f.write(f"INSERT INTO marketplaces (name) VALUES ('{m}') ON CONFLICT (name) DO NOTHING;\n")
        f.write("\n")

        f.write("-- 2. Products\n")
        for p in products:
            escaped_name = p['name'].replace("'", "''")
            f.write(f"INSERT INTO products (sku, name, category, price, cost, launch_date) VALUES ('{p['sku']}', '{escaped_name}', '{p['category']}', {p['price']}, {p['cost']}, '{p['launch_date']}') ON CONFLICT (sku) DO NOTHING;\n")
        f.write("\n")

        print(f"Generated {len(products)} product inserts into {out_path}")

if __name__ == "__main__":
    generate()
