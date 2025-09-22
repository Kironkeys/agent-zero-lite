# graphrag_query Instrument

# GraphRAG Query Tool

## Purpose
The GraphRAG query tool performs natural language queries against the knowledge graph to retrieve relevant information, relationships, and insights. It provides intelligent search capabilities across structured graph data.

## When to Use
- Answering questions about stored knowledge
- Finding relationships between entities
- Searching for specific information in the graph
- Exploring knowledge connections and patterns
- Retrieving contextual information for decision making

## Parameters
- **message** (required): Natural language question or query to search for in the graph

## Usage Examples
```
GraphRAG Query:
message: "What companies did Steve Jobs found?"

GraphRAG Query:
message: "Show me the relationships between Apple and its products"

GraphRAG Query:
message: "What do we know about artificial intelligence companies?"
```

## Query Types
- **Entity queries**: "Who is Steve Jobs?" or "What is Apple Inc.?"
- **Relationship queries**: "How are X and Y connected?" or "What companies does person X work for?"
- **Pattern queries**: "Show me all tech companies founded in the 1970s"
- **Context queries**: "What do we know about [topic]?" or "Give me background on [entity]"

## Best Practices
- Use clear, specific questions for better results
- Ask about relationships to understand connections
- Use entity names that were likely captured during ingestion
- Try different phrasings if initial query doesn't return expected results