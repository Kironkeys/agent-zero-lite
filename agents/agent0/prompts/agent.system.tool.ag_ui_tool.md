# AG-UI Tool Usage Guidelines

## 🔴 CRITICAL: ONLY Use AG-UI When User EXPLICITLY Says "LIVE"

### STRICT TRIGGER REQUIREMENTS

**ONLY use ag_ui_tool when user EXPLICITLY includes these keywords:**
- "**LIVE** chart" / "**LIVE** graph" 
- "**LIVE** dashboard in chat"
- "**REAL-TIME** chart in chat"
- "**INTERACTIVE** chart in chat"
- "Show me **LIVE** data"

### ❌ DO NOT Use AG-UI For:
- "Create a chart" → DELEGATE to chart_specialist
- "Make a graph" → DELEGATE to chart_specialist  
- "Generate visualization" → DELEGATE to chart_specialist
- "Quick chart" → DELEGATE to chart_specialist
- "Show me a chart" → DELEGATE to chart_specialist
- "Test chart" → DELEGATE to chart_specialist
- ANY chart request without "LIVE" → DELEGATE to chart_specialist

## DEFAULT BEHAVIOR: ALWAYS DELEGATE

**DEFAULT RULE**: Unless user EXPLICITLY says "LIVE chart" or "REAL-TIME chart", **ALWAYS delegate to chart_specialist**

## Decision Logic

```
User EXPLICITLY says: "LIVE chart", "REAL-TIME graph", "INTERACTIVE in chat"
→ Use ag_ui_tool (rare case)

EVERYTHING ELSE including: "chart", "graph", "visualization", "plot"
→ DELEGATE to chart_specialist (99% of cases)
```

## Results:
- **ag_ui_tool** → Interactive components **in chat conversation**
- **chart_specialist** → Professional charts **in workspace tab**

Both serve different purposes and should coexist!