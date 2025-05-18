"""
Run once: python seed.py
Seeds MongoDB with Blinkit-style stores, products, and inventory.
Item IDs 1-50 and store IDs 1-10 match the Kaggle training data exactly.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from datetime import datetime, timezone
from core.database import get_db


# 50 products mapped 1:1 to item_ids (model uses numeric id, name is display only)
PRODUCTS = {
    # Dairy (1-10)
    1:  ("Amul Milk 500ml",        "dairy",     35),
    2:  ("Amul Butter 100g",       "dairy",     55),
    3:  ("Amul Paneer 200g",       "dairy",     85),
    4:  ("Nestle Dahi 400g",       "dairy",     45),
    5:  ("Mother Dairy Lassi 200ml","dairy",    30),
    6:  ("Britannia Cheese Slice", "dairy",     95),
    7:  ("Amul Gold Milk 1L",      "dairy",     65),
    8:  ("Nandini Milk 1L",        "dairy",     60),
    9:  ("Epigamia Greek Yogurt",  "dairy",    110),
    10: ("Go Cheese 200g",         "dairy",     90),
    # Staples (11-20)
    11: ("Aashirvaad Atta 5kg",    "staples",  280),
    12: ("India Gate Basmati 1kg", "staples",  180),
    13: ("Saffola Gold Oil 1L",    "staples",  200),
    14: ("Tata Salt 1kg",          "staples",   25),
    15: ("MDH Rajma 500g",         "staples",   80),
    16: ("Haldiram Moong Dal 500g","staples",   75),
    17: ("Fortune Sunflower Oil 1L","staples", 160),
    18: ("Daawat Basmati 5kg",     "staples",  450),
    19: ("Tata Sampann Chana Dal", "staples",   65),
    20: ("Catch Jeera Powder 100g","staples",   50),
    # Snacks (21-30)
    21: ("Lays Classic Salted 52g","snacks",    20),
    22: ("Maggi Noodles 70g",      "snacks",    14),
    23: ("Britannia Good Day 100g","snacks",    30),
    24: ("Parle-G 100g",           "snacks",    10),
    25: ("Kurkure Masala Munch 80g","snacks",   20),
    26: ("Lays Magic Masala 52g",  "snacks",    20),
    27: ("Hide & Seek 100g",       "snacks",    35),
    28: ("Haldiram Bhujia 200g",   "snacks",    75),
    29: ("Bikaji Aloo Bhujia 200g","snacks",    65),
    30: ("Too Yumm Multigrain 30g","snacks",    10),
    # Beverages (31-40)
    31: ("Coca-Cola 750ml",        "beverages", 45),
    32: ("Sprite 750ml",           "beverages", 45),
    33: ("Tropicana Orange 1L",    "beverages", 90),
    34: ("Real Mango Juice 1L",    "beverages", 85),
    35: ("Red Bull 250ml",         "beverages",125),
    36: ("Bisleri Water 1L",       "beverages", 20),
    37: ("Kinley Soda 750ml",      "beverages", 30),
    38: ("Appy Fizz 250ml",        "beverages", 25),
    39: ("Maaza Mango 600ml",      "beverages", 35),
    40: ("Mountain Dew 750ml",     "beverages", 45),
    # HPC / Personal Care (41-50)
    41: ("Surf Excel 500g",        "hpc",      120),
    42: ("Ariel 500g",             "hpc",      135),
    43: ("Dettol Handwash 250ml",  "hpc",       90),
    44: ("Colgate MaxFresh 150g",  "hpc",       55),
    45: ("Head & Shoulders 340ml", "hpc",      320),
    46: ("Lux Soap 100g",          "hpc",       45),
    47: ("Gillette Mach3 Blade",   "hpc",      210),
    48: ("Dove Body Wash 200ml",   "hpc",      280),
    49: ("Whisper Ultra 7s",       "hpc",       75),
    50: ("Pampers Small 22ct",     "hpc",      580),
}

# 10 Blinkit dark store locations mapped 1:1 to store_ids
STORES = {
    1:  ("Blinkit Koramangala",    "Bengaluru",   "HSR-Koramangala"),
    2:  ("Blinkit Indiranagar",    "Bengaluru",   "Indiranagar"),
    3:  ("Blinkit Bandra",         "Mumbai",      "Bandra West"),
    4:  ("Blinkit Andheri",        "Mumbai",      "Andheri East"),
    5:  ("Blinkit Sector 29",      "Gurgaon",     "Sector 29"),
    6:  ("Blinkit Cyber City",     "Gurgaon",     "DLF Cyber City"),
    7:  ("Blinkit Jubilee Hills",  "Hyderabad",   "Jubilee Hills"),
    8:  ("Blinkit Anna Nagar",     "Chennai",     "Anna Nagar"),
    9:  ("Blinkit Salt Lake",      "Kolkata",     "Salt Lake Sector V"),
    10: ("Blinkit Connaught Place","Delhi",       "CP / Rajiv Chowk"),
}


def classify_sku(avg_sales: float, cv: float, p25: float, p75: float) -> str:
    if cv < 0.30:
        return "essential"
    if avg_sales >= p75:
        return "fast"
    if avg_sales <= p25:
        return "slow"
    return "premium"


def seed():
    db = get_db()
    print("Connected to MongoDB")

    train_path = os.path.join(os.path.dirname(__file__), "..", "input", "train.csv")
    df = pd.read_csv(train_path, parse_dates=["date"])
    print(f"Loaded {len(df):,} rows from train.csv")

    # --- Stores ---
    store_stats = df.groupby("store")["sales"].agg(["mean", "std"]).reset_index()
    store_stats.columns = ["store_id", "avg_daily_sales", "std_sales"]
    p33 = store_stats["avg_daily_sales"].quantile(0.33)
    p66 = store_stats["avg_daily_sales"].quantile(0.66)

    def store_tier(avg):
        if avg >= p66: return "high"
        if avg >= p33: return "medium"
        return "low"

    stores = []
    for _, row in store_stats.iterrows():
        sid = int(row["store_id"])
        name, city, location = STORES.get(sid, (f"Blinkit Store {sid}", "India", "—"))
        stores.append({
            "_id": sid,
            "name": name,
            "city": city,
            "location": location,
            "performance_tier": store_tier(row["avg_daily_sales"]),
            "avg_daily_sales": round(float(row["avg_daily_sales"]), 2),
            "std_sales": round(float(row["std_sales"]), 2),
        })

    db.stores.drop()
    db.stores.insert_many(stores)
    print(f"Seeded {len(stores)} stores")

    # --- Items with SKU segmentation ---
    item_stats = df.groupby("item")["sales"].agg(["mean", "std"]).reset_index()
    item_stats.columns = ["item_id", "avg_daily_sales", "std_sales"]
    item_stats["cv"] = item_stats["std_sales"] / item_stats["avg_daily_sales"]
    p25 = item_stats["avg_daily_sales"].quantile(0.25)
    p75 = item_stats["avg_daily_sales"].quantile(0.75)

    items = []
    for _, row in item_stats.iterrows():
        iid = int(row["item_id"])
        seg = classify_sku(row["avg_daily_sales"], row["cv"], p25, p75)
        prod_name, category, unit_cost = PRODUCTS.get(iid, (f"Item {iid}", "general", 50))
        items.append({
            "_id": iid,
            "name": prod_name,
            "category": category,
            "sku_segment": seg,
            "avg_daily_sales": round(float(row["avg_daily_sales"]), 2),
            "sales_std": round(float(row["std_sales"]), 2),
            "cv": round(float(row["cv"]), 3),
            "unit_cost": float(unit_cost),
        })

    db.items.drop()
    db.items.insert_many(items)
    print(f"Seeded {len(items)} items")

    # --- Inventory defaults ---
    # Realistic dark store mix: ~40% at-risk, ~60% healthy
    np.random.seed(42)
    inventory = []
    item_map = {i["_id"]: i for i in items}

    LEAD_TIMES = {"fast": 1, "essential": 1, "slow": 2, "premium": 3}

    for store_id in range(1, 11):
        for item_id in range(1, 51):
            item = item_map[item_id]
            avg = item["avg_daily_sales"]
            seg = item["sku_segment"]
            lead_time = LEAD_TIMES.get(seg, 2)

            r = np.random.random()
            if r < 0.08:
                days = np.random.uniform(0, 1.0)       # ~8% stockout/nearly-out
            elif r < 0.22:
                days = np.random.uniform(1.0, 2.5)     # ~14% critical
            elif r < 0.40:
                days = np.random.uniform(2.5, 4.5)     # ~18% at reorder point
            else:
                days = np.random.uniform(5, 12)        # ~60% healthy

            stock = min(int(avg * days), 300)
            inventory.append({
                "store_id": store_id,
                "item_id": item_id,
                "current_stock": stock,
                "lead_time_days": lead_time,
                "unit_cost": item.get("unit_cost", 50.0),
                "holding_cost_pct": 0.25,
                "ordering_cost": 50.0,
                "last_updated": datetime.now(timezone.utc),
            })

    db.inventory.drop()
    db.inventory.insert_many(inventory)
    db.inventory.create_index([("store_id", 1), ("item_id", 1)], unique=True)
    print(f"Seeded {len(inventory)} inventory records")

    db.reorder_alerts.drop()
    db.predictions.drop()
    db.retraining_logs.drop()
    db.user_sales.drop()
    db.reorder_alerts.create_index([("store_id", 1), ("item_id", 1), ("status", 1)])
    db.predictions.create_index([("store_id", 1), ("item_id", 1), ("forecast_date", 1)])
    db.user_sales.create_index([("store_id", 1), ("item_id", 1), ("date", 1)])
    print("Cleared alerts, predictions, retraining_logs, user_sales — indexes created")
    print("\nSeed complete.")

if __name__ == "__main__":
    seed()
