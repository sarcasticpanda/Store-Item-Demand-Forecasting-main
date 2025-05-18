"""
Quick model training script - bypasses Jupyter kernel issues
Trains LightGBM model with basic feature engineering
"""
import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from src.modelling_utils import create_time_series_features, time_series_split
from src.artifacts_utils import save_object

print("="*60)
print("Starting Quick Model Training")
print("="*60)

# 1. Load data
print("\n[1/6] Loading data...")
df_raw = pd.read_csv('input/train.csv')
df_raw['date'] = pd.to_datetime(df_raw['date'])
df_raw.set_index('date', inplace=True)
df_raw.sort_values(by=['date', 'store', 'item'], inplace=True)
print(f"✓ Loaded {len(df_raw):,} rows from {df_raw.index.min()} to {df_raw.index.max()}")

# 2. Feature Engineering
print("\n[2/6] Creating time series features...")
TARGET = 'sales'
TO_SORT = ['store', 'item', 'date']
TO_GROUP = ['store', 'item']
lags = [91, 98, 105, 112, 119, 126, 182, 364, 546, 728]
windows = [365, 546, 730]
weights = [0.95, 0.9, 0.8, 0.7, 0.5]

df_features = create_time_series_features(
    df_raw, TARGET, TO_SORT, TO_GROUP,
    lags=lags, windows=windows, weights=weights, min_periods=30,
    date_related=True, lag=True, log_transformation=True,
    roll=True, ewm=True, roll_mean=True, roll_std=True, roll_min=True, roll_max=True
)
df_features.sort_values(by=['date', 'store', 'item'], inplace=True)
print(f"✓ Created {df_features.shape[1]} features (including {len(lags)} lags, rolling windows, EWM)")

# 3. Train-Test Split
print("\n[3/6] Splitting data...")
CUTOFF_DATE = '2025-06-30'   # train on 2021-2025H1, test on 2025H2
train, test = time_series_split(df_features, CUTOFF_DATE)
X_train = train.drop(columns=['sales'])
y_train = train['sales']
X_test = test.drop(columns=['sales'])
y_test = test['sales']
print(f"✓ Train: {X_train.shape}, Test: {X_test.shape}")

# 4. Train Model (using reasonable defaults, skip hyperparameter tuning)
print("\n[4/6] Training LightGBM model...")
print("(Using default hyperparameters - skipping Optuna tuning to save time)")

best_params = {
    'objective': 'regression',
    'metric': 'rmse',
    'n_estimators': 500,  # Reduced from 1000 for faster training
    'verbosity': -1,
    'learning_rate': 0.01,
    'num_leaves': 100,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_data_in_leaf': 50,
    'random_state': 42
}

lgb_reg = LGBMRegressor(**best_params)
lgb_reg.fit(X_train, y_train)
print("✓ Model trained successfully")

# 5. Quick Evaluation
print("\n[5/6] Evaluating model...")
y_pred = lgb_reg.predict(X_test)

# Convert from log scale
y_test_actual = np.expm1(y_test)
y_pred_actual = np.expm1(y_pred)

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

mae = mean_absolute_error(y_test_actual, y_pred_actual)
rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred_actual))
r2 = r2_score(y_test_actual, y_pred_actual)

print(f"✓ MAE: {mae:.2f}")
print(f"✓ RMSE: {rmse:.2f}")
print(f"✓ R²: {r2:.4f}")

# 6. Save Model
print("\n[6/6] Saving model...")
os.makedirs('models', exist_ok=True)
model_path = os.path.join('models', 'lgb_reg.pkl')
save_object(model_path, lgb_reg)
print(f"✓ Model saved to: {model_path}")

print("\n" + "="*60)
print("MODEL TRAINING COMPLETE!")
print("="*60)
print(f"Final Performance:")
print(f"  • MAE:  {mae:.2f} (predictions off by ~{mae:.1f} units on average)")
print(f"  • RMSE: {rmse:.2f}")
print(f"  • R²:   {r2:.4f} ({r2*100:.1f}% variance explained)")
print(f"\nModel saved and ready for deployment!")
print("="*60)
