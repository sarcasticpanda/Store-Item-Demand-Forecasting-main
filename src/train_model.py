import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Load processed data
train = pd.read_csv('input/train_processed.csv')
test = pd.read_csv('input/test_processed.csv')

# Target column
TARGET = 'sales'

# Features: drop columns not useful for prediction
exclude_cols = ['date', 'sales', 'user_id', 'product_id', 'product_name', 'aisle', 'department', 'id']
X_train = train.drop(columns=[col for col in exclude_cols if col in train.columns])
y_train = train[TARGET]
X_test = test.drop(columns=[col for col in exclude_cols if col in test.columns])

# Train LightGBM model
model = LGBMRegressor(n_estimators=1000, learning_rate=0.01, num_leaves=64, random_state=42, verbose=-1)
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Save model
joblib.dump(model, 'models/lgbm_model.joblib')

# Evaluate (if test has target)
if TARGET in test.columns:
    y_test = test[TARGET]
    print('RMSE:', np.sqrt(mean_squared_error(y_test, y_pred)))
    print('MAE:', mean_absolute_error(y_test, y_pred))
    print('R2:', r2_score(y_test, y_pred))
else:
    print('Prediction complete. Test set does not have ground truth sales.')

# Save predictions
pd.DataFrame({'prediction': y_pred}).to_csv('reports/predictions.csv', index=False)
print('Model training and prediction complete.')
