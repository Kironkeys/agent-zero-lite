from python.helpers.memory import Memory
from python.helpers.tool import Tool, Response
import re

DEFAULT_THRESHOLD = 0.5
DEFAULT_LIMIT = 10


class MemoryLoad(Tool):
    
    def __init__(self, agent, **kwargs):
        super().__init__(agent, **kwargs)
        try:
            # Import GraphRAG helper for graph enrichment
            from python.helpers.graphrag_helper import GraphRAGHelper
            self.graphrag_available = True
            print("✅ GraphRAG available for enriched memory load")
        except Exception as e:
            print(f"⚠️ GraphRAG not available for enrichment: {e}")
            self.graphrag_available = False

    def _extract_entities_from_content(self, content):
        """Extract potential entity names from memory content"""
        entities = []
        
        # Look for capitalized names (people, companies)
        name_pattern = r'\b[A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+\b'
        potential_names = re.findall(name_pattern, content)
        entities.extend(potential_names)
        
        # Look for company indicators
        company_pattern = r'\b(?:[A-Z][a-z]+(?:Corp|Inc|LLC|Ltd|Company|Microsoft|Google|Apple|Amazon|Meta|Facebook))\b'
        companies = re.findall(company_pattern, content, re.IGNORECASE)
        entities.extend(companies)
        
        return list(set(entities))  # Remove duplicates

    def _enrich_with_graph(self, memory_id, content):
        """Enrich a memory with GraphRAG relationships"""
        if not self.graphrag_available:
            return None
            
        try:
            from python.helpers.graphrag_helper import GraphRAGHelper
            
            # Extract key entities/concepts from content for querying
            content_entities = self._extract_entities_from_content(content)
            
            if not content_entities:
                return None
            
            enrichment = {
                'entities': [],
                'relationships': [],
                'graph_context': ''
            }
            
            # Limit to first 2 entities to avoid slow queries
            entities_to_query = content_entities[:2]
            
            # Query just the main area first (fastest)
            try:
                helper = GraphRAGHelper.get_for_area('main')
                
                # Batch query for all entities at once
                if len(entities_to_query) > 0:
                    batch_query = f"What do we know about: {', '.join(entities_to_query)}? Brief summary."
                    
                    # Use the direct fallback method which is faster
                    result = helper._direct_query_fallback(batch_query)
                    
                    if result and "No relevant information" not in result and "Knowledge graph query failed" not in result:
                        for entity in entities_to_query:
                            if entity.lower() in result.lower():
                                enrichment['entities'].append({
                                    'name': entity,
                                    'area': 'main',
                                    'info': result[:150]  # Shorter limit
                                })
                        
            except Exception as e:
                print(f"GraphRAG batch enrichment error: {e}")
            
            return enrichment if enrichment['entities'] else None
            
        except Exception as e:
            print(f"GraphRAG enrichment error: {e}")
            return None

    async def execute(self, query="", threshold=DEFAULT_THRESHOLD, limit=DEFAULT_LIMIT, filter="", enrich=True, **kwargs):
        """
        Enhanced memory load with automatic GraphRAG enrichment
        """
        
        if not query:
            return Response(message="No query provided", break_loop=False)
        
        try:
            # Load memories from FAISS
            memory = await Memory.get(self.agent)
            memories = await memory.search_similarity_threshold(query, limit=limit, threshold=threshold, filter=filter)
            
            if not memories:
                return Response(message="No memories found", break_loop=False)
            
            # Format results for display
            formatted_results = []
            formatted_results.append("📚 MEMORIES FROM FAISS + GRAPHRAG ENRICHMENT:")
            formatted_results.append("")
            
            for i, doc in enumerate(memories):
                if i >= limit:
                    break
                    
                # Basic memory info from document metadata
                area = doc.metadata.get("area", "unknown")
                timestamp = doc.metadata.get("timestamp", "unknown")
                memory_id = doc.metadata.get("id", "unknown")
                content = doc.page_content
                
                formatted_results.append(f"area: {area}")
                formatted_results.append(f"timestamp: {timestamp}")
                formatted_results.append(f"id: {memory_id}")
                formatted_results.append(f"Content: {content}")
                
                # Add GraphRAG enrichment if enabled
                if enrich and self.graphrag_available:
                    try:
                        # Add timeout for enrichment to prevent hanging
                        import asyncio
                        enrichment_task = asyncio.create_task(
                            asyncio.to_thread(self._enrich_with_graph, memory_id, content)
                        )
                        
                        # Wait max 2 seconds for enrichment
                        try:
                            enrichment = await asyncio.wait_for(enrichment_task, timeout=2.0)
                            if enrichment and enrichment.get('entities'):
                                formatted_results.append("🔗 GraphRAG Enrichment:")
                                for entity in enrichment['entities']:
                                    formatted_results.append(f"  • {entity['name']} ({entity['area']}): {entity['info']}")
                        except asyncio.TimeoutError:
                            print(f"Enrichment timeout for memory {memory_id} - skipping")
                            
                    except Exception as e:
                        print(f"Enrichment failed for memory {memory_id}: {e}")
                
                formatted_results.append("")
                formatted_results.append("--" * 25)
                formatted_results.append("")
            
            return Response(message="\n".join(formatted_results), break_loop=False)
            
        except Exception as e:
            print(f"Memory load error: {e}")
            return Response(message=f"Memory load failed: {e}", break_loop=False)