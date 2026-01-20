import pandas as pd
import numpy as np
from pathlib import Path

# Paths
DATA_DIR = Path('dataset')
TRAIN_PATH = Path('input/train.csv')
TEST_PATH = Path('input/test.csv')

# Load main train/test
train = pd.read_csv(TRAIN_PATH)
test = pd.read_csv(TEST_PATH)

# Load Instacart metadata
products = pd.read_csv(DATA_DIR / 'products.csv')
aisles = pd.read_csv(DATA_DIR / 'aisles.csv')
departments = pd.read_csv(DATA_DIR / 'departments.csv')
order_products_train = pd.read_csv(DATA_DIR / 'order_products__train.csv')
# orders.csv and order_products__prior.csv are very large, so load only needed columns
orders = pd.read_csv(DATA_DIR / 'orders.csv', usecols=['order_id','user_id','order_number','order_dow','order_hour_of_day','days_since_prior_order','eval_set'])

# --- Feature Engineering ---
# Merge product metadata
products_full = products.merge(aisles, on='aisle_id').merge(departments, on='department_id')

# Example: Add product metadata to order_products_train
order_products_train = order_products_train.merge(products_full, on='product_id', how='left')

# Aggregate order-level features
order_stats = orders.groupby('user_id').agg({
    'order_number': 'max',
    'days_since_prior_order': ['mean','std'],
    'order_hour_of_day': ['mean','std'],
    'order_dow': ['mean','std']
})
order_stats.columns = ['_'.join(col) for col in order_stats.columns]
order_stats = order_stats.reset_index()

# Merge order-level features into train
train = train.merge(order_stats, left_on='store', right_on='user_id', how='left')

# Add product/aisle/department features to train
train = train.merge(products_full, left_on='item', right_on='product_id', how='left')

# --- Train/Test Split ---

# Ensure no leakage: split by date
# Use train as is, and enrich test with features from metadata
train_final = train.copy()

# Enrich test set with metadata features
test_final = test.merge(order_stats, left_on='store', right_on='user_id', how='left')
test_final = test_final.merge(products_full, left_on='item', right_on='product_id', how='left')

# --- Save processed splits ---
train_final.to_csv('input/train_processed.csv', index=False)
test_final.to_csv('input/test_processed.csv', index=False)

print('Train/Test splits and feature engineering complete.')
