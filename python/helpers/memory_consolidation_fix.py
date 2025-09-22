# Fix for memory consolidation to maintain graph relationships
# Add this to memory_consolidation.py after line 753 (new_id = await db.insert_text...)

async def update_graph_relationships(old_memory_id: str, new_memory_id: str, graph_db):
    """
    Update all graph relationships from old memory ID to new memory ID
    when consolidation creates a new memory.
    """
    try:
        # Check if old memory node exists in graph
        check_query = """
            MATCH (m:Memory {id: $old_id})
            RETURN m
        """
        result = graph_db.query(check_query, {'old_id': old_memory_id})
        
        if result:
            # Transfer all relationships from old to new memory node
            transfer_query = """
                // Find old memory node and all its relationships
                MATCH (old:Memory {id: $old_id})
                OPTIONAL MATCH (old)-[r:MENTIONS]->(e:Entity)
                
                // Create or merge new memory node
                MERGE (new:Memory {id: $new_id})
                SET new.content = old.content,
                    new.area = old.area,
                    new.timestamp = timestamp(),
                    new.consolidated_from = $old_id
                
                // Transfer relationships to new memory
                WITH old, new, collect(e) as entities
                UNWIND entities as entity
                MERGE (new)-[:MENTIONS]->(entity)
                
                // Delete old memory node and its relationships
                WITH old
                DETACH DELETE old
                
                RETURN count(*) as transferred
            """
            
            result = graph_db.query(transfer_query, {
                'old_id': old_memory_id,
                'new_id': new_memory_id
            })
            
            return result[0]['transferred'] if result else 0
            
    except Exception as e:
        print(f"Failed to update graph relationships: {e}")
        return 0

# Usage in memory_consolidation.py after line 753:
# if hasattr(db, 'graph') or graph_available:
#     from python.tools.memory_save import get_graph_connection
#     graph = get_graph_connection()
#     if graph:
#         transferred = await update_graph_relationships(memory_id, new_id, graph)
#         print(f"Transferred {transferred} graph relationships from {memory_id} to {new_id}")