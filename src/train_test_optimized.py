import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, confusion_matrix, accuracy_score, precision_score, recall_score
from sklearn.model_selection import RandomizedSearchCV
import matplotlib.pyplot as plt
import seaborn as sns

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
df['rolling_24h'] = df.groupby(['store','item'])['sales'].rolling(window=24,min_periods=1).mean().shift(1).reset_index(level=[0,1],drop=True)
df['sales_same_hour_yesterday'] = df.groupby(['store','item'])['sales'].shift(24)

# New advanced features
df['rolling_7d'] = df.groupby(['store','item'])['sales'].rolling(window=7,min_periods=1).mean().shift(1).reset_index(level=[0,1],drop=True)
df['same_hour_last_week'] = df.groupby(['store','item'])['sales'].shift(7)

# Dummy business features (replace with real if available)
df['store_zone'] = df['store'] % 5  # Dummy: 5 zones
df['product_category'] = df['item'] % 10  # Dummy: 10 categories
df['promo_strength'] = np.random.randint(0, 3, size=len(df))  # Dummy: 0, 1, 2

# Business features (dummy for now)
df['is_payday'] = (df['date'].dt.day == 1).astype(int)
df['temp'] = 25  # Dummy temperature
df['rain_flag'] = 0  # Dummy rain
df['promo_active'] = 0  # Dummy promo
df['festival_flag'] = 0  # Dummy festival

df['stock_left'] = 100 # Dummy stock

# Drop rows with missing lag features (first few rows per group)
df = df.dropna()

# Chronological split (80% train, 20% test)

# Strict time-based split: train = Jan–Oct, test = Nov
train = df[df['date'].dt.month < 11]
test = df[df['date'].dt.month == 11]

# Features and target
feature_cols = [
    'hour','day_of_week','is_weekend','month','store','item',
    'last_hour_sales','last_day_sales','rolling_3h','rolling_24h','sales_same_hour_yesterday',
    'rolling_7d','same_hour_last_week',
    'is_payday','temp','rain_flag','promo_active','festival_flag','stock_left',
    'store_zone','product_category','promo_strength'
]

# Cap extreme sales values (outlier handling)
train['sales_capped'] = train['sales'].clip(upper=train['sales'].quantile(0.99))
test['sales_capped'] = test['sales'].clip(upper=train['sales'].quantile(0.99))

# Log-transform target variable
train['sales_log'] = np.log1p(train['sales_capped'])
test['sales_log'] = np.log1p(test['sales_capped'])

X_train = train[feature_cols]
y_train = train['sales_log']
X_test = test[feature_cols]
y_test = test['sales_log']

# Hyperparameter tuning
param_dist = {
    'n_estimators': [200, 500, 1000, 1500],
    'max_depth': [6, 10, 15, 20],
    'learning_rate': [0.005, 0.01, 0.05, 0.1],
    'subsample': [0.7, 0.8, 0.9, 1.0],
    'num_leaves': [31, 64, 128, 256],
    'colsample_bytree': [0.6, 0.8, 1.0],
    'class_weight': ['balanced', None]
}
model = LGBMRegressor(random_state=42)
search = RandomizedSearchCV(model, param_distributions=param_dist, n_iter=10, scoring='neg_mean_squared_error', cv=3, verbose=1, n_jobs=-1)
search.fit(X_train, y_train)

best_model = search.best_estimator_
print('Best params:', search.best_params_)

# Predict
y_pred = best_model.predict(X_test)

# Feature importance
importances = best_model.feature_importances_
feat_imp_df = pd.DataFrame({'feature': feature_cols, 'importance': importances})
feat_imp_df = feat_imp_df.sort_values('importance', ascending=False)
feat_imp_df.to_csv('reports/feature_importance_tuned.csv', index=False)
print('Top feature importances:')
print(feat_imp_df.head(10))

# Regression metrics
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f'RMSE: {rmse:.4f}')
print(f'MAE: {mae:.4f}')
print(f'R2: {r2:.4f}')

# Classification metrics
threshold = np.median(y_train)
y_test_bin = (y_test > threshold).astype(int)
y_pred_bin = (y_pred > threshold).astype(int)
cm = confusion_matrix(y_test_bin, y_pred_bin)
acc = accuracy_score(y_test_bin, y_pred_bin)
prec = precision_score(y_test_bin, y_pred_bin)
rec = recall_score(y_test_bin, y_pred_bin)
print(f'Accuracy: {acc:.4f}')
print(f'Precision: {prec:.4f}')
print(f'Recall: {rec:.4f}')
print('Confusion Matrix:')
print(cm)

plt.figure(figsize=(5,4))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix (High/Low Sales)')
plt.tight_layout()
plt.savefig('reports/confusion_matrix_tuned.png')
plt.close()

# Error analysis by product, store, hour
errors = pd.DataFrame({'actual': y_test, 'predicted': y_pred, 'product': test['item'], 'store': test['store'], 'hour': test['hour']})
errors['abs_error'] = np.abs(errors['actual'] - errors['predicted'])
err_prod = errors.groupby('product')['abs_error'].mean().sort_values(ascending=False)
err_store = errors.groupby('store')['abs_error'].mean().sort_values(ascending=False)
err_hour = errors.groupby('hour')['abs_error'].mean().sort_values(ascending=False)
err_prod.to_csv('reports/error_by_product.csv')
err_store.to_csv('reports/error_by_store.csv')
err_hour.to_csv('reports/error_by_hour.csv')

# Save predictions
errors.to_csv('reports/predictions_eval_tuned.csv', index=False)
print('Full analysis, tuning, and error breakdown complete.')
