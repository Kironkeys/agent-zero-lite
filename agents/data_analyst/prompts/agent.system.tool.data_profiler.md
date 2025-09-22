# Data Profiler Tool

## Purpose
Comprehensive CSV data profiling and analysis tool that provides statistical summaries, data quality insights, and semantic analysis using LLM capabilities.

## Usage
```bash
data_profiler --file_path "/path/to/data.csv" --sample_size 1000
```

## Parameters
- **file_path** (required): Path to the CSV file to analyze
- **sample_size** (optional): Number of rows to sample for analysis (default: 1000)

## Capabilities
- Statistical analysis for numeric columns (mean, median, std, quantiles)
- Categorical data analysis (top values, cardinality)
- Data quality assessment (nulls, duplicates, completeness)
- Correlation detection for numeric variables
- Semantic insights using LLM analysis
- Automatic date/time column detection
- Memory usage estimation

## Output Structure
The tool provides a comprehensive report including:

1. **File Information**: Size, rows, columns, memory usage
2. **Data Quality Metrics**: Completeness percentage, duplicate detection
3. **Column Analysis**: For each column:
   - Data type and null statistics
   - Unique values and cardinality
   - Statistical summaries (numeric) or top values (categorical)
   - Potential datetime detection
4. **Correlations**: High correlation pairs (>0.7)
5. **Semantic Analysis**: LLM-generated insights about:
   - Domain classification
   - Key patterns and anomalies
   - Data quality issues
   - Suggested analyses
   - Business context

## Best Practices
1. **Start Here First**: Always profile data before other analyses
2. **Sample Size**: Use 1000-5000 rows for quick analysis, full dataset for production
3. **Save Results**: Store profile results for comparison and documentation
4. **Quality First**: Address data quality issues before proceeding with analysis
5. **Use with Other Tools**: Feed profile results to domain_detector and insight_generator

## Example Workflow
```bash
# Step 1: Profile the data
data_profiler --file_path "sales_data.csv" --sample_size 2000

# Step 2: Based on profile, detect domain
domain_detector --profile "{profile_json}" --context "Q4 sales data"

# Step 3: Generate insights
insight_generator --csv_path "sales_data.csv" --profile_data "{profile_json}"

# Step 4: Create visualizations
chart_creator --csv_path "sales_data.csv" --chart_type "bar" --x_column "region" --y_column "revenue"
```

## Integration Notes
- Results can be passed directly to domain_detector as JSON
- Profile data enhances insight_generator's analysis
- Correlation findings guide chart_creator's visualization choices
- Semantic analysis provides context for all downstream tools