import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Load data
train_path = 'input/train.csv'
df = pd.read_csv(train_path)
df['date'] = pd.to_datetime(df['date'])

# --- Feature Engineering ---
df['hour'] = 12  # No hour info in date, so set to default (midday)
df['day_of_week'] = df['date'].dt.dayofweek

df['is_weekend'] = df['day_of_week'].isin([5,6]).astype(int)
df['month'] = df['date'].dt.month

df = df.sort_values(['store','item','date'])

# Lag features (past sales)
df['last_hour_sales'] = df.groupby(['store','item'])['sales'].shift(1)
df['last_day_sales'] = df.groupby(['store','item'])['sales'].shift(24)
df['rolling_3h'] = df.groupby(['store','item'])['sales'].rolling(window=3,min_periods=1).mean().shift(1).reset_index(level=[0,1],drop=True)
df['rolling_6h'] = df.groupby(['store','item'])['sales'].rolling(window=6,min_periods=1).mean().shift(1).reset_index(level=[0,1],drop=True)

# Example business features (dummy for now)
df['is_festival'] = 0  # Replace with actual festival logic if available
df['is_promo'] = 0     # Replace with actual promo logic if available
df['rain'] = 0         # Replace with weather data if available
df['stock_left'] = 100 # Replace with actual stock data if available

# Drop rows with missing lag features (first few rows per group)
df = df.dropna()

# Chronological split (80% train, 20% test)
split_idx = int(len(df) * 0.8)
train = df.iloc[:split_idx]
test = df.iloc[split_idx:]

# Features and target
feature_cols = [
    'hour','day_of_week','is_weekend','month','store','item',
    'last_hour_sales','last_day_sales','rolling_3h','rolling_6h',
    'is_festival','is_promo','rain','stock_left'
]
X_train = train[feature_cols]
y_train = train['sales']
X_test = test[feature_cols]
y_test = test['sales']

# Train model
model = LGBMRegressor(n_estimators=1000, learning_rate=0.01, num_leaves=64, random_state=42, verbose=-1)
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Metrics
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f'RMSE: {rmse:.4f}')
print(f'MAE: {mae:.4f}')
print(f'R2: {r2:.4f}')

# Save predictions
pd.DataFrame({'date': test['date'], 'store': test['store'], 'item': test['item'], 'actual': y_test, 'predicted': y_pred}).to_csv('reports/predictions_eval.csv', index=False)
print('Training, testing, and evaluation complete.')
