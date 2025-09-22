# Domain Detector Tool

## Purpose
Intelligent business domain detection and context analysis tool that identifies industry, business entities, KPIs, and use cases from data profiles.

## Usage
```bash
domain_detector --profile "{profile_json}" --context "Additional context about the data"
```

## Parameters
- **profile** (required): Data profile from data_profiler tool (JSON format)
- **context** (optional): Additional context or description about the data

## Capabilities
- Industry/domain classification with confidence scoring
- Sub-domain identification and specialization detection
- Business entity extraction (master/transactional/reference data)
- KPI and metric identification
- Use case generation for stakeholders
- Column-level business meaning analysis
- Data relationship discovery

## Analysis Pipeline
The tool performs iterative analysis:

1. **Initial Domain Detection**: Classify primary industry/domain
2. **Column Analysis**: Map columns to business concepts
3. **Entity Extraction**: Identify business objects and relationships
4. **KPI Identification**: Discover measurable business metrics
5. **Use Case Generation**: Create actionable business scenarios
6. **Confidence Calculation**: Score reliability of detection

## Output Structure
```json
{
  "primary_domain": "E-commerce",
  "sub_domains": ["Online Retail", "B2C Sales"],
  "confidence": 0.85,
  "key_indicators": ["product_id", "order_date", "customer_email"],
  "business_entities": [
    {
      "entity": "Customer",
      "type": "master",
      "columns": ["customer_id", "email", "name"],
      "description": "Customer master data"
    }
  ],
  "kpis": [
    {
      "kpi_name": "Average Order Value",
      "columns_used": ["order_total"],
      "calculation": "mean(order_total)",
      "business_value": "Measures transaction size"
    }
  ],
  "use_cases": [
    {
      "use_case": "Customer Segmentation",
      "stakeholder": "Marketing Team",
      "value_proposition": "Target high-value customers"
    }
  ]
}
```

## Domain Categories
Supported domains include:
- E-commerce & Retail
- Healthcare & Medical
- Finance & Banking
- Manufacturing & Supply Chain
- Real Estate & Property
- Education & Learning
- Transportation & Logistics
- Technology & Software
- Marketing & Advertising
- Government & Public Sector

## Best Practices
1. **Always Profile First**: Run data_profiler before domain detection
2. **Provide Context**: Additional context improves accuracy
3. **Verify Results**: Domain detection is probabilistic, verify with domain experts
4. **Use for Planning**: Let domain guide your analysis approach
5. **Chain with Insights**: Feed results to insight_generator for domain-aware analysis

## Integration with Other Tools
- **Input from**: data_profiler (profile JSON)
- **Output to**: insight_generator (domain context)
- **Guides**: chart_creator (visualization choices)
- **Enhances**: All analytical workflows with business context

## Confidence Scoring
- **0.9-1.0**: Very high confidence, clear domain indicators
- **0.7-0.9**: High confidence, strong patterns identified
- **0.5-0.7**: Moderate confidence, some ambiguity
- **<0.5**: Low confidence, manual verification needed