# CDC PLACES Health Data

This directory contains health data fetched from the CDC PLACES (Local Data for Better Health) dataset for the multi-platform dashboard project.

## Data Source

**CDC PLACES: Local Data for Better Health**
- API Endpoint: https://data.cdc.gov/resource/swc5-untb.json
- Documentation: https://www.cdc.gov/places/index.html
- Dataset: County-level health outcomes, prevention measures, and risk behaviors

## Files

### Raw Data
- `cdc_places_health_data.csv` - Complete dataset with all health measures
- `state_health_summary.csv` - State-level aggregations for executive dashboards
- `top_counties_detailed.csv` - Top 1000 counties by population for detailed analysis
- `dataset_metadata.json` - Dataset documentation and statistics

### Scripts
- `fetch_cdc_data.py` - Python script to fetch and process CDC data

## Key Health Measures Included

### Health Outcomes
- **ARTHRITIS** - Arthritis among adults aged ≥18 years
- **DIABETES** - Diabetes among adults aged ≥18 years  
- **OBESITY** - Obesity among adults aged ≥18 years
- **BPHIGH** - High blood pressure among adults aged ≥18 years
- **CHD** - Coronary heart disease among adults aged ≥18 years
- **CANCER** - Cancer (excluding skin cancer) among adults aged ≥18 years
- **COPD** - COPD among adults aged ≥18 years
- **DEPRESSION** - Depression among adults aged ≥18 years
- **KIDNEY** - Chronic kidney disease among adults aged ≥18 years
- **STROKE** - Stroke among adults aged ≥18 years

### Prevention Measures
- **CHECKUP** - Annual checkup among adults aged ≥18 years
- **CHOLSCREEN** - Cholesterol screening among adults aged ≥18 years
- **COLON_SCREEN** - Up-to-date colorectal cancer screening among adults aged 50-75 years
- **MAMMOUSE** - Mammography among women aged 50-74 years

### Access Measures  
- **ACCESS2** - Current lack of health insurance among adults aged 18-64 years

## Data Structure

### Main Dataset Columns
- `state_code` - Two-letter state abbreviation
- `state_name` - Full state name
- `county_name` - County name
- `health_measure` - Specific health measure ID
- `health_category` - Category of health measure
- `question` - Human-readable question text
- `value` - Percentage value for the measure
- `ci_low` - Lower confidence limit
- `ci_high` - Upper confidence limit
- `total_population` - Total population for the geographic area
- `data_fetched_at` - Timestamp when data was fetched

## Dashboard Usage

### Power BI (Executive Dashboard)
- Use `state_health_summary.csv` for high-level KPIs
- Focus on top 5-10 health measures
- Geographic comparisons and trends

### Tableau (Analytical Deep Dive)
- Use `cdc_places_health_data.csv` for full interactivity
- Correlation analysis between measures
- Demographic breakdowns and filtering

### Looker Studio (Operations)
- Use `top_counties_detailed.csv` for actionable insights
- Resource allocation based on population and health needs
- Performance tracking by region

### QuickSight (Financial Analysis)
- Combine health outcomes with population data
- Cost-per-capita analysis opportunities
- Budget optimization insights

## Refreshing Data

To get the latest data, run:

```bash
cd app/demos/health-dashboards/data/
python fetch_cdc_data.py
```

This will:
1. Fetch latest CDC PLACES data via API
2. Clean and process the data
3. Generate multiple CSV files for different dashboard needs
4. Update metadata with fetch timestamp

## Data Quality Notes

- All values are age-adjusted percentages
- Confidence intervals provided for statistical significance
- Data represents model-based estimates for small areas
- Population data used for weighting and context
- Missing values handled as null/NaN in datasets

## License & Attribution

This data is provided by the Centers for Disease Control and Prevention (CDC) and is in the public domain. Please attribute to:

**CDC PLACES: Local Data for Better Health, County Data 2024 release**