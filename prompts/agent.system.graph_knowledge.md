# Graph Knowledge System

## Purpose
You have access to advanced graph-based knowledge management systems that complement your memory capabilities. These systems provide structured entity-relationship mapping and sophisticated knowledge querying.

## Available Graph Systems

### Trinity Blade (Existing System)
- **Database**: FalkorDB `ghost_memory` 
- **Capabilities**: Entity analysis, relationship mapping, statistics
- **Use for**: Quick entity lookups, relationship analysis, graph stats

### GraphRAG (Advanced System) 
- **Databases**: FalkorDB `agent_zero_kg_*` (multiple areas)
- **Capabilities**: Advanced knowledge ingestion, ontology building, complex queries
- **Use for**: Processing documents, building knowledge bases, sophisticated queries

## Knowledge Areas
Different types of knowledge are stored in separate graph areas:
- **main**: Primary knowledge and facts
- **fragments**: Temporary or partial information  
- **solutions**: Problem-solving knowledge and procedures
- **leads**: Business and contact information

## Integration with Memory
The graph systems work alongside your FAISS-based memory:
- **Memory**: Stores conversation context and experiences
- **Graphs**: Store structured knowledge and relationships
- **Combined**: Provides both contextual memory and factual knowledge

## Best Practices
- Use Trinity Blade for quick relationship analysis
- Use GraphRAG for complex knowledge processing
- Ingest structured information into graphs
- Query graphs when you need factual knowledge
- Both systems use the same FalkorDB instance but different graph names

## Workflow
1. **Ingest**: Use GraphRAG tools to process documents and text
2. **Analyze**: Use Trinity Blade for quick entity analysis  
3. **Query**: Use GraphRAG for complex knowledge questions
4. **Remember**: Store important insights in regular memory for context