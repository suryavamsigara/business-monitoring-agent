"""
Seed the Business Pulse Agent database with the same synthetic business
foundation as Part 1 (Marketplace Performance Copilot), recreated here with
a fixed random seed so the demo story is deterministic. All data is
clearly synthetic/demo data - not real Neeman's data.

Usage:
    python scripts/seed_database.py
"""
import sys
import os
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import Base, engine, SessionLocal
from app.models.business_models import Product, Marketplace, SalesDaily, Inventory, CompetitorPrice
from app.models import agent_models  # noqa: F401 - ensures Part 2 tables are created
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository

random.seed(42)

TODAY = date(2026, 8, 18)
NUM_DAYS = 90
START_DATE = TODAY - timedelta(days=NUM_DAYS - 1)

MARKETPLACES = ["Amazon", "Myntra", "Flipkart", "Ajio"]

CATEGORIES = {
    "Running": ["Runner Pro", "Trailblazer X", "Marathon Edge", "SwiftStride", "PulseRunner"],
    "Sneakers": ["Everyday Sneaker", "Urban Canvas", "StreetForm", "CloudStep", "NeoWalk"],
    "Slip-ons": ["EcoRunner", "PureSlip", "BreezeOn", "CasualGlide", "SoftStep"],
    "Loafers": ["Heritage Loafer", "OfficeEase", "ClassicWeave", "TerraLoafer"],
    "Sandals": ["SummerDrift", "CoastalWalk", "TrailSandal", "OpenAir"],
    "Casual": ["DailyWear", "WeekendCasual", "ComfortWalk", "UrbanFlex", "EasyStep"],
}
ADJECTIVES = ["Aero", "Terra", "Luma", "Verde", "Nova", "Reef", "Solis", "Bloom", "Drift", "Arc"]


def make_products(n_target=130):
    products = []
    sku_counter = 2000
    names_used = set()
    for cat, bases in CATEGORIES.items():
        per_cat = max(1, n_target // len(CATEGORIES))
        for i in range(per_cat):
            base = random.choice(bases)
            adj = random.choice(ADJECTIVES)
            name = f"{adj} {base}" if random.random() < 0.6 else base
            suffix = f" {random.randint(2,9)}" if name in names_used else ""
            full_name = f"{name}{suffix}"
            names_used.add(full_name)
            sku_counter += 1
            price = round(random.uniform(1499, 6999), -1) + 9
            cost = round(price * random.uniform(0.45, 0.65), 0)
            launch_date = TODAY - timedelta(days=random.randint(30, 700))
            products.append({
                "sku": f"BPA-{sku_counter}", "name": full_name, "category": cat,
                "price": float(price), "cost": float(cost), "launch_date": launch_date,
            })
    return products


def daily_series(base_visits, base_conv, trend=0.0, noise=0.12, conv_shift_from=None, conv_shift_pct=0.0,
                  visit_shift_from=None, visit_shift_pct=0.0, dip_day=None, dip_severity=0.0):
    visits, convs = [], []
    for d in range(NUM_DAYS):
        v = base_visits * (1 + trend * d / NUM_DAYS) * (1 + random.uniform(-noise, noise))
        c = base_conv * (1 + random.uniform(-noise * 0.6, noise * 0.6))
        if visit_shift_from is not None and d >= visit_shift_from:
            v *= (1 + visit_shift_pct)
        if conv_shift_from is not None and d >= conv_shift_from:
            c *= (1 + conv_shift_pct)
        if dip_day is not None and abs(d - dip_day) <= 2:
            v *= (1 - dip_severity)
        visits.append(max(0, v))
        convs.append(max(0.001, min(c, 0.35)))
    return visits, convs


def assign_scenarios(products):
    """Embed the 6 required Part 2 anomaly scenarios into named products."""
    scenarios = {}

    def pick(cat, idx=0):
        cands = [p for p in products if p["category"] == cat]
        return cands[idx % len(cands)]

    # Scenario 1: Revenue decline on one marketplace (Amazon)
    for i in range(3):
        p = pick("Sneakers", i)
        scenarios[p["sku"]] = {
            "marketplace": "Amazon", "mkt_trend": -0.32,
            "conv_shift_from": 60, "conv_shift_pct": -0.18,
        }
    pick("Sneakers", 0)["name"] = "Everyday Sneaker"

    # Scenario 2: Conversion decline, traffic stable
    p = pick("Slip-ons", 0)
    scenarios[p["sku"]] = {
        "trend": 0.03, "conv_shift_from": 58, "conv_shift_pct": -0.35,
    }
    p["name"] = "EcoRunner"

    # Scenario 3: Stock-out risk on a high-selling product
    p = pick("Running", 0)
    scenarios[p["sku"]] = {"trend": 0.25, "start_stock": 320, "velocity_override": 36, "stockout_risk": True}
    p["name"] = "Runner Pro"

    # Scenario 4: Return rate spike
    p = pick("Loafers", 0)
    scenarios[p["sku"]] = {"return_rate": 0.175}
    p["name"] = "Heritage Loafer"

    # Scenario 5: Excess inventory
    p = pick("Sandals", 0)
    scenarios[p["sku"]] = {"excess_inventory": True, "start_stock": 1300, "velocity_override": 11, "trend": -0.02}
    p["name"] = "CoastalWalk"

    # Scenario 6: Sudden sales anomaly on a normally stable product
    p = pick("Casual", 1)
    scenarios[p["sku"]] = {
        "trend": 0.0, "dip_day": NUM_DAYS - 5, "dip_severity": 0.72,
        "conv_shift_from": NUM_DAYS - 5, "conv_shift_pct": -0.5,
    }
    p["name"] = "DailyWear"

    return scenarios


def build_data(products, scenarios):
    sales_rows, inventory_rows, competitor_rows = [], [], []

    for p in products:
        p_scn = scenarios.get(p["sku"], {})
        cat_base_conv = {
            "Running": 0.045, "Sneakers": 0.05, "Slip-ons": 0.055,
            "Loafers": 0.04, "Sandals": 0.05, "Casual": 0.048,
        }[p["category"]]

        active_mkts = random.sample(MARKETPLACES, k=random.choice([1, 2, 2, 3]))
        if p_scn.get("marketplace") and p_scn["marketplace"] not in active_mkts:
            active_mkts.append(p_scn["marketplace"])

        base_stock = p_scn.get("start_stock", random.randint(200, 900))
        stock = {m: base_stock // len(active_mkts) for m in active_mkts}

        for mkt in active_mkts:
            base_visits = random.uniform(20, 140)
            trend = p_scn.get("trend", random.uniform(-0.05, 0.15))
            mkt_trend = p_scn.get("mkt_trend", trend) if p_scn.get("marketplace") == mkt else trend

            visits, convs = daily_series(
                base_visits, cat_base_conv, trend=mkt_trend,
                conv_shift_from=p_scn.get("conv_shift_from"), conv_shift_pct=p_scn.get("conv_shift_pct", 0.0),
                visit_shift_from=p_scn.get("visit_shift_from"), visit_shift_pct=p_scn.get("visit_shift_pct", 0.0),
                dip_day=p_scn.get("dip_day"), dip_severity=p_scn.get("dip_severity", 0.0),
            )
            return_rate = p_scn.get("return_rate", random.uniform(0.03, 0.09))
            our_price = p["price"]
            comp_avg = our_price * random.uniform(0.9, 1.05)
            comp_min = comp_avg * random.uniform(0.85, 0.97)
            velocity_override = p_scn.get("velocity_override")

            for d in range(NUM_DAYS):
                day = START_DATE + timedelta(days=d)
                v = visits[d]
                c = convs[d]
                impressions = int(v * random.uniform(3.5, 6))
                clicks = int(v * random.uniform(0.9, 1.1))
                visits_i = int(v)
                orders = int(v * c)
                units = orders + int(orders * random.uniform(0, 0.15))
                if velocity_override is not None:
                    units = max(0, int(velocity_override * random.uniform(0.85, 1.15)))
                    orders = max(0, int(units * random.uniform(0.85, 1.0)))
                revenue = round(units * our_price * random.uniform(0.97, 1.0), 2)
                returns = int(units * return_rate)
                ad_spend = round(clicks * random.uniform(4, 9), 2)

                sales_rows.append({
                    "date": day, "sku": p["sku"], "marketplace": mkt, "impressions": impressions,
                    "clicks": clicks, "visits": visits_i, "orders": max(orders, 0), "units_sold": max(units, 0),
                    "revenue": max(revenue, 0), "returns": max(returns, 0), "ad_spend": max(ad_spend, 0),
                })

                stock[mkt] = max(0, stock[mkt] - units)
                incoming = 0
                if p_scn.get("stockout_risk") and d >= NUM_DAYS - 10:
                    incoming = 0
                elif random.random() < 0.05:
                    incoming = random.randint(50, 150)
                    stock[mkt] += incoming
                if p_scn.get("excess_inventory"):
                    stock[mkt] = p_scn.get("start_stock", 1300)

                inventory_rows.append({"date": day, "sku": p["sku"], "marketplace": mkt,
                                        "stock": stock[mkt], "incoming_stock": incoming})

                if d % 7 == 0:
                    competitor_rows.append({"date": day, "sku": p["sku"], "marketplace": mkt,
                                             "our_price": round(our_price, 2),
                                             "competitor_avg_price": round(comp_avg, 2),
                                             "competitor_min_price": round(comp_min, 2)})

    return sales_rows, inventory_rows, competitor_rows


def main():
    print(f"Seeding Business Pulse Agent database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        mkt_objs = {}
        for name in MARKETPLACES:
            m = Marketplace(name=name)
            db.add(m)
            mkt_objs[name] = m
        db.flush()

        product_dicts = make_products(130)
        scenarios = assign_scenarios(product_dicts)

        product_objs = {}
        for pd_ in product_dicts:
            prod = Product(sku=pd_["sku"], name=pd_["name"], category=pd_["category"],
                            price=pd_["price"], cost=pd_["cost"], launch_date=pd_["launch_date"])
            db.add(prod)
            product_objs[pd_["sku"]] = prod
        db.flush()
        print(f"Created {len(product_objs)} products across {len(mkt_objs)} marketplaces")

        sales_rows, inventory_rows, competitor_rows = build_data(product_dicts, scenarios)

        print(f"Generating {len(sales_rows)} daily sales rows...")
        for r in sales_rows:
            db.add(SalesDaily(date=r["date"], product_id=product_objs[r["sku"]].id,
                               marketplace_id=mkt_objs[r["marketplace"]].id, impressions=r["impressions"],
                               clicks=r["clicks"], visits=r["visits"], orders=r["orders"],
                               units_sold=r["units_sold"], revenue=r["revenue"], returns=r["returns"],
                               ad_spend=r["ad_spend"]))

        print(f"Generating {len(inventory_rows)} inventory rows...")
        for r in inventory_rows:
            db.add(Inventory(date=r["date"], product_id=product_objs[r["sku"]].id,
                              marketplace_id=mkt_objs[r["marketplace"]].id, stock=r["stock"],
                              incoming_stock=r["incoming_stock"]))

        print(f"Generating {len(competitor_rows)} competitor price rows...")
        for r in competitor_rows:
            db.add(CompetitorPrice(date=r["date"], product_id=product_objs[r["sku"]].id,
                                    marketplace_id=mkt_objs[r["marketplace"]].id, our_price=r["our_price"],
                                    competitor_avg_price=r["competitor_avg_price"],
                                    competitor_min_price=r["competitor_min_price"]))
        db.commit()

        MonitoringRuleRepository(db).ensure_defaults()
        print("Monitoring rules initialized.")
        print("Seeding complete. Run the agent via POST /api/agent/run or the scheduler.")
    finally:
        db.close()


if __name__ == "__main__":
    main()