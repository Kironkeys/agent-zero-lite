# Insight Generator Tool

## Purpose
Advanced analytical reasoning tool using Tree-of-Thought methodology to generate deep insights, multi-expert perspectives, and domain-aware visualizations.

## Usage
```bash
insight_generator --csv_path "/path/to/data.csv" --profile_data "{profile_json}" --domain_info "{domain_json}"
```

## Parameters
- **csv_path** (required): Path to the CSV file
- **profile_data** (required): Data profile from data_profiler tool
- **domain_info** (optional): Domain detection results for context

## Tree-of-Thought Methodology
The tool simulates three domain experts who collaboratively:

1. **Extract Key Domain Findings**: Identify core insights
2. **Identify Relevant Data**: Select supporting columns
3. **Evaluate Data Selection**: Agree on minimal dataset
4. **Visualize with Context**: Propose domain-aware charts

### Expert Simulation Process
```
Expert 1: [Statistical perspective]
Expert 2: [Business perspective]  
Expert 3: [Domain perspective]
→ Consolidation: [Final unified insight]
```

## Generated Insights Categories

### 1. Descriptive Analysis
- Dataset characteristics and composition
- Data quality observations
- Statistical properties
- Distribution patterns

### 2. Predictive Analysis
- Trend identification
- Forecasting opportunities
- Pattern recognition
- Anomaly detection potential

### 3. Domain-Specific Analysis
- Industry-relevant patterns
- Business KPIs
- Competitive insights
- Strategic recommendations

## Output Format
The tool generates:
1. Three categories of insights (descriptive, predictive, domain)
2. Tree-of-Thought reasoning process
3. Python visualization code
4. Recommended analyses and next steps

## Visualization Guidelines
Generated code follows best practices:
- Domain-preserving visualizations
- Business context annotations
- Professional styling
- Accessibility considerations
- UI-optimized output

## Best Practices
1. **Complete Pipeline**: Run data_profiler → domain_detector → insight_generator
2. **Domain Context**: Include domain_info for industry-specific insights
3. **Execute Code**: Run generated Python code for visualizations
4. **Iterate**: Use insights to guide further analysis
5. **Document**: Save insights for reporting and decision-making

## Integration Workflow
```bash
# 1. Profile the data
profile = data_profiler --file_path "data.csv"

# 2. Detect domain
domain = domain_detector --profile "$profile"

# 3. Generate insights
insights = insight_generator --csv_path "data.csv" --profile_data "$profile" --domain_info "$domain"

# 4. Execute visualization code
python3 -c "$generated_code"

# 5. Create additional charts
chart_creator --csv_path "data.csv" --chart_type "line" --insights "$insights"
```

## Advanced Features
- **Multi-Expert Simulation**: Three perspectives for comprehensive analysis
- **Domain Preservation**: Maintains business context in technical analysis
- **Actionable Output**: Generates executable visualization code
- **Narrative Generation**: Creates story-telling visualizations
- **Quality Scoring**: Confidence metrics for generated insights

## Common Use Cases
1. **Business Intelligence**: Executive dashboards and KPI tracking
2. **Data Quality Assessment**: Identify issues before production
3. **Exploratory Analysis**: Discover patterns in new datasets
4. **Report Generation**: Automated insight narratives
5. **Hypothesis Testing**: Validate business assumptions