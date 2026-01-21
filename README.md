
# Blinkit Store Item Demand Forecasting

<img src="reports/store_img.avif" width=800px height=350px>

# 1. Project Description
This project forecasts item demand for Blinkit stores using advanced time series and machine learning techniques. The solution predicts sales for 50 items across 10 stores for a three-month period, leveraging 5 years of historical sales data. The workflow is tailored for Blinkit’s rapid delivery and inventory optimization needs.

Key improvements and modifications:
- Adapted for Blinkit’s business context and SKU/store structure.
- Enhanced feature engineering and model tuning for retail/quick-commerce.
- Added classification metrics (confusion matrix, recall, precision, accuracy) to evaluate high/low demand prediction.
- All results, metrics, and financial scenarios are presented for Blinkit’s operational use.

# 2. Technologies and Tools
Python (Pandas, Numpy, Matplotlib, Seaborn, Scikit-Learn, Statsmodels, Optuna, LightGBM), Jupyter Notebook, Git & GitHub, Anaconda, Visual Studio Code.

# 3. Project Structure
- **input/**: Raw and processed input data
- **models/**: Saved model artifacts
- **notebooks/**: EDA and modelling notebooks
- **reports/**: Visualizations, metrics, and result CSVs
- **src/**: All project scripts (feature engineering, training, evaluation, etc.)
- **requirements.txt, setup.py, README.md**: Environment, packaging, and documentation

# 4. Business Problem & Objectives
Blinkit needs to optimize inventory and meet customer demand across 10 stores and 50 SKUs. The project aims to:
1. Uncover actionable sales insights (seasonality, trends, demand spikes)
2. Build a robust model to forecast 3 months of sales for all items/stores
3. Provide financial and operational scenarios for inventory and supply chain planning
4. Evaluate not just regression metrics, but also classification metrics for high/low demand (confusion matrix, recall, precision, accuracy)

# 5. Solution Pipeline
The project follows the CRISP-DM framework:
1. Business understanding
2. Data understanding
3. Data preparation
4. Modelling
5. Evaluation (including classification metrics)
6. Deployment

See notebooks for step-by-step details.

# 6. Main Business Insights
1. Sales show a strong upward trend and clear seasonality (peaks in July, weekends)
2. Top stores (2, 3, 8) and top items (15, 28) drive most sales; stores 5, 6, 7 and item 5 underperform
3. Demand patterns are consistent with Blinkit’s quick-commerce cycles

**Visualizations:**
![](reports/sales_time.png)
![](reports/sales_day.png)
![](reports/sales_store.png)
![](reports/sales_item.png)

# 7. Modelling & Metrics
1. Data sorted by date, store, and item. Chronological train-test split (3 months for test, simulating production)
2. Time series decomposition (trend, seasonality, residuals) for feature engineering
3. Extensive feature engineering: date, lag, rolling, exponentially weighted features, log-transform target
4. Time series cross-validation (expanding window)
5. Model: LightGBM (fast, robust to missing values, non-linear relationships)
6. Feature selection (RFE), hyperparameter tuning (Optuna)
7. **Metrics:**
	 - Regression: MAE = 6.1, RMSE = 7.97, R2 = 0.92, MAPE = 13.3%
	 - **Classification (High/Low Demand):**
		 - Confusion Matrix, Accuracy, Precision, Recall (see reports/confusion_matrix.png)

|        | Model    | MAE     | MAPE    | RMSE   | R2     |
|--------|----------|---------|---------|--------|--------|
| Results| LightGBM | 6.0979  | 13.2891 | 7.9741 | 0.9221 |

**Classification Example:**
![](reports/confusion_matrix.png)

**Visualizations:**
![](reports/actual_pred_graph_lgb.png)
![](reports/residuals_dist_lgb.png)
![](reports/actual_pred_lgb.png)
![](reports/feature_importances.png)

# 8. Financial Results
The next 3-month sales are presented per store, per store/item, and for the total company, including error, forecasted sum, average, and best/worst scenarios. All results are tailored for Blinkit’s operational planning.

| Store | Total predicted sales | Average predicted sales (daily) | Daily MAE | Worst avg sales (daily) | Best avg sales (daily) | Worst total sales | Best total sales |
|-------|-----------------------|-------------------------------|-----------|------------------------|-----------------------|-------------------|-----------------|
| 1     | 232105                | 2496                          | 56        | 2440                   | 2552                  | 226910            | 237299          |
| 2     | 326805                | 3514                          | 70        | 3444                   | 3584                  | 320337            | 333274          |
| ...   | ...                   | ...                           | ...       | ...                    | ...                   | ...               | ...             |

**Total:**

| Overall total predicted sales | Overall avg sales (daily) | Overall daily MAE | Worst avg sales (daily) | Best avg sales (daily) | Worst total sales | Best total sales |
|------------------------------|--------------------------|-------------------|------------------------|-----------------------|-------------------|-----------------|
| 2559998                      | 27527                    | 404               | 27123                  | 27931                 | 2522455           | 2597542          |

git clone https://github.com/allmeidaapedro/Store-Item-Demand-Forecasting.git
cd Store-Item-Demand-Forecasting
python -m venv venv
source venv/bin/activate  # On Windows, use 'venv\Scripts\activate'
pip install -r requirements.txt
jupyter notebook
deactivate
# 9. Running the Project Locally
**Requirements:**
- Python 3.11+
- pip
- Git
- Jupyter

**Setup:**
1. Clone the repo:
	```
	git clone https://github.com/sarcasticpanda/Store-Item-Demand-Forecasting.git
	```
2. `cd Store-Item-Demand-Forecasting`
3. Create and activate a virtual environment:
	- Windows: `python -m venv venv && venv\Scripts\activate`
	- Mac/Linux: `python3 -m venv venv && source venv/bin/activate`
4. Install dependencies:
	```
	pip install -r requirements.txt
	```
5. Start Jupyter:
	```
	jupyter notebook
	```
6. Open and run the notebooks in the `notebooks/` folder.
7. Deactivate the environment when done: `deactivate`

# 10. Dataset
Source: [Kaggle Demand Forecasting Competition](https://www.kaggle.com/competitions/demand-forecasting-kernels-only/overview)

# 11. Contact
- GitHub: [sarcasticpanda](https://github.com/sarcasticpanda)
- Email: saubhagyakashyap44@gmail.com
