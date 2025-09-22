"""
FalkorDB-powered memory search - INSTANT graph traversal!
Replaces the slow FAISS vector search with lightning-fast graph queries
"""

from python.helpers.tool import Tool, Response
from falkordb import FalkorDB
import json

class MemorySearch(Tool):
    """
    Search memories using FalkorDB's graph relationships
    100x faster than vector similarity search!
    """
    
    def __init__(self, agent, **kwargs):
        super().__init__(agent, **kwargs)
        try:
            import os
            # Check if we're in Docker
            if os.path.exists('/.dockerenv'):
                falkor_host = 'falkordb'  # Use Docker service name
            else:
                falkor_host = 'localhost'
            # Connect using FalkorDB SDK - using port 6380 for clean instance
            self.db = FalkorDB(host=falkor_host, port=6379 if os.path.exists('/.dockerenv') else 6380)
            self.graph = self.db.select_graph('ghost_memory')
            self.falkor_available = True
            print("✅ FalkorDB connected for memory search")
        except Exception as e:
            print(f"⚠️ FalkorDB not available for search, will use FAISS: {e}")
            self.falkor_available = False
            self.graph = None
    
    async def execute(self, query="", count=10, **kwargs):
        """
        Search with the POWER OF THE GRAPH!
        """
        
        if not self.falkor_available:
            # Fallback to FAISS
            from python.helpers.memory import Memory
            db = await Memory.get(self.agent)
            # Use the correct method: search_similarity_threshold
            memories = await db.search_similarity_threshold(
                query=query, 
                limit=count,
                threshold=0.5  # Reasonable similarity threshold
            )
            
            formatted_results = []
            for doc in memories:
                content = doc.page_content[:200] if hasattr(doc, 'page_content') else str(doc)[:200]
                formatted_results.append(content)
            
            return Response(
                message=f"Found {len(memories)} memories (FAISS fallback):\n\n" + 
                       "\n---\n".join(formatted_results),
                break_loop=False
            )
        
        # FALKORDB SEARCH - Check for specific patterns
        results = []
        
        # Pattern 1: Owner validation check
        if "validated" in query.lower() or "owner" in query.lower():
            owner_query = """
                MATCH (o:Owner)
                WHERE o.name CONTAINS $search OR $search = ''
                OPTIONAL MATCH (o)-[:HAS_CONTACT]->(c:Contact)
                OPTIONAL MATCH (m:Memory)-[:VALIDATES]->(o)
                RETURN o.name as owner,
                       o.validated as validated,
                       c.phone as phone,
                       c.email as email,
                       m.content as memory_content
                ORDER BY o.last_updated DESC
                LIMIT $limit
            """
            
            search_term = query.replace("validated", "").replace("owner", "").strip()
            result = self.graph.query(owner_query, {
                'search': search_term,
                'limit': count
            })
            
            for row in result.result_set:
                results.append({
                    'type': 'owner',
                    'owner': row[0],
                    'validated': row[1],
                    'phone': row[2],
                    'email': row[3],
                    'memory': row[4][:200] if row[4] else None
                })
        
        # Pattern 2: Batch status check
        elif "batch" in query.lower():
            batch_num = None
            import re
            match = re.search(r'batch\s+(\d+)', query, re.IGNORECASE)
            if match:
                batch_num = int(match.group(1))
            
            if batch_num:
                batch_query = """
                    MATCH (b:Batch {number: $batch})-[:CONTAINS_MEMORY]->(m:Memory)
                    OPTIONAL MATCH (m)-[:VALIDATES]->(o:Owner)
                    OPTIONAL MATCH (o)-[:HAS_CONTACT]->(c:Contact)
                    RETURN m.content as memory,
                           o.name as owner,
                           o.validated as validated,
                           c.phone as phone,
                           c.email as email
                    LIMIT $limit
                """
                result = self.graph.query(batch_query, {
                    'batch': batch_num,
                    'limit': count
                })
            else:
                # Get all batches
                result = self.graph.query("""
                    MATCH (b:Batch)
                    OPTIONAL MATCH (b)-[:CONTAINS_MEMORY]->(m)
                    RETURN b.number, COUNT(m) as memory_count
                    ORDER BY b.number
                """)
            
            for row in result.result_set:
                if batch_num:
                    results.append({
                        'type': 'batch_memory',
                        'memory': row[0][:200] if row[0] else None,
                        'owner': row[1],
                        'validated': row[2],
                        'phone': row[3],
                        'email': row[4]
                    })
                else:
                    results.append({
                        'type': 'batch_summary',
                        'batch': row[0],
                        'memories': row[1]
                    })
        
        # Pattern 3: General memory search
        else:
            memory_query = """
                MATCH (m:Memory)
                WHERE m.content CONTAINS $search
                OPTIONAL MATCH (m)-[r]->(e)
                RETURN m.id as id,
                       m.content as content,
                       m.area as area,
                       type(r) as relationship,
                       labels(e)[0] as entity_type,
                       e.name as entity_name
                ORDER BY m.timestamp DESC
                LIMIT $limit
            """
            
            result = self.graph.query(memory_query, {
                'search': query,
                'limit': count
            })
            
            for row in result.result_set:
                results.append({
                    'type': 'memory',
                    'id': row[0],
                    'content': row[1][:200] if row[1] else None,
                    'area': row[2],
                    'relationship': row[3],
                    'entity_type': row[4],
                    'entity': row[5]
                })
        
        # Format results
        if not results:
            return Response(
                message=f"No results found for '{query}'",
                break_loop=False
            )
        
        # Create formatted output
        output = f"🔥 FALKORDB SEARCH RESULTS (found {len(results)}) 🔥\n\n"
        
        for i, r in enumerate(results, 1):
            if r['type'] == 'owner':
                status = "✅ VALIDATED" if r['validated'] else "❌ NOT VALIDATED"
                output += f"{i}. Owner: {r['owner']} - {status}\n"
                if r['phone'] or r['email']:
                    output += f"   Contact: {r['phone'] or 'No phone'} | {r['email'] or 'No email'}\n"
                if r['memory']:
                    output += f"   Memory: {r['memory']}\n"
            
            elif r['type'] == 'batch_memory':
                output += f"{i}. Batch Memory:\n"
                if r['owner']:
                    output += f"   Owner: {r['owner']} ({'✅' if r['validated'] else '❌'})\n"
                if r['memory']:
                    output += f"   Content: {r['memory']}\n"
            
            elif r['type'] == 'batch_summary':
                output += f"{i}. Batch {r['batch']}: {r['memories']} memories\n"
            
            else:  # general memory
                output += f"{i}. Memory {r['id']}:\n"
                output += f"   {r['content']}\n"
                if r['entity']:
                    output += f"   → {r['relationship']} {r['entity_type']}: {r['entity']}\n"
            
            output += "\n"
        
        return Response(message=output, break_loop=False)