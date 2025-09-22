# Chart Creator Tool

## Purpose
Professional data visualization tool optimized for Agent Zero UI with support for multiple chart types, colorblind-friendly palettes, and inline display capabilities.

## Usage
```bash
chart_creator --csv_path "/path/to/data.csv" --chart_type "bar" --x_column "category" --y_column "value"
```

## Parameters
- **csv_path** (required): Path to the CSV file
- **chart_type** (required): Type of chart to create
- **x_column**: Column for x-axis (auto-selected if not specified)
- **y_column**: Column for y-axis (auto-selected if not specified)
- **category_column**: Column for categorization/grouping
- **title**: Chart title
- **output_dir**: Directory to save charts (default: figures/)
- **color_palette**: Color scheme (default: viridis)
- **ui_optimized**: Optimize for UI display (default: true)
- **inline_display**: Include base64 for inline display (default: true)
- **stacked**: Stack bars/areas (default: false)

## Supported Chart Types

### Basic Charts
- **bar**: Bar chart for categorical comparisons
- **line**: Line chart for trends over time
- **scatter**: Scatter plot for correlations
- **pie**: Pie chart for proportions
- **histogram**: Distribution of single variable

### Advanced Charts
- **heatmap**: Correlation matrix visualization
- **box**: Box plot for quartile analysis
- **violin**: Violin plot for distribution shape

## Features
- **UI Optimization**: Charts display directly in Agent Zero interface
- **Colorblind-Friendly**: Accessible color palettes
- **Auto-Selection**: Intelligent column selection if not specified
- **Professional Styling**: Publication-ready output
- **Legend Management**: Automatic legend optimization
- **Grid & Typography**: Consistent formatting

## Color Palettes
Available palettes (all colorblind-friendly):
- `viridis`: Default, perceptually uniform
- `plasma`: Purple-pink-yellow
- `inferno`: Black-red-yellow
- `magma`: Black-red-white
- `cividis`: Blue-yellow optimized
- `paired`: Categorical pairs

## Output Formats
Each chart generates:
1. **PNG File**: High-resolution image saved to disk
2. **Base64 Data**: Inline display in UI (when ui_optimized=true)
3. **Metadata**: Chart description and parameters

## Best Practices

### Chart Selection Guide
| Data Type | Recommended Chart | Use Case |
|-----------|------------------|----------|
| Categories vs Values | Bar | Compare groups |
| Time Series | Line | Show trends |
| X vs Y Numeric | Scatter | Find correlations |
| Parts of Whole | Pie | Show proportions |
| Distributions | Histogram/Box | Analyze spread |
| Multi-correlations | Heatmap | Correlation matrix |

### Optimization Tips
1. **UI Display**: Keep default ui_optimized=true for Agent Zero
2. **Large Datasets**: Use sampling for better performance
3. **Categories**: Limit to 10-15 for readability
4. **Colors**: Use default palettes for accessibility
5. **Titles**: Always provide descriptive titles

## Example Workflows

### Simple Bar Chart
```bash
chart_creator --csv_path "sales.csv" --chart_type "bar" --x_column "region" --y_column "revenue" --title "Revenue by Region"
```

### Multi-Series Line Chart
```bash
chart_creator --csv_path "trends.csv" --chart_type "line" --x_column "date" --y_column "value" --category_column "product" --title "Product Trends Over Time"
```

### Correlation Heatmap
```bash
chart_creator --csv_path "metrics.csv" --chart_type "heatmap" --title "Feature Correlations"
```

## Integration with Other Tools
1. Use after **data_profiler** to understand data structure
2. Use after **domain_detector** to choose relevant visualizations
3. Use after **insight_generator** to visualize key findings
4. Charts display inline when ui_optimized=true

## Display in UI
When ui_optimized=true (default), charts appear directly in the Agent Zero interface:
- Optimized resolution for screen display
- Crisp rendering at 150 DPI
- Compressed for fast loading
- Base64 encoded for inline display

## Advanced Features
- **Auto-aggregation**: Automatically aggregates data for cleaner charts
- **Smart Labeling**: Rotates labels for readability
- **Legend Placement**: Optimizes legend position
- **Color Cycling**: Ensures distinct colors for multiple series
- **Null Handling**: Gracefully handles missing data