"""
Trinity Blade - FalkorDB Edition
Ultra-fast graph operations for Ghost v9.3
"""

from python.helpers.tool import Tool, Response
from falkordb import FalkorDB
import os
import json
import hashlib
from datetime import datetime

class TrinityBlade(Tool):
    """
    Trinity Blade powered by FalkorDB
    100x faster than Neo4j, 95% less memory!
    """
    
    def __init__(self, agent, **kwargs):
        super().__init__(agent, **kwargs)
        try:
            # Connect to FalkorDB
            # Check for environment variable first (Railway/external)
            falkor_host = os.getenv('FALKORDB_HOST')
            falkor_port = int(os.getenv('FALKORDB_PORT', 6379))
            
            if not falkor_host:
                # No env var, check if in Docker or local
                if os.path.exists('/.dockerenv'):
                    # We're inside Docker - use service name
                    falkor_host = 'falkordb'
                    falkor_port = 6379  # Internal port
                else:
                    # Local development - use external port
                    falkor_host = 'localhost'
                    falkor_port = 6380  # External mapped port
            
            # Connect with appropriate port based on environment
            self.db = FalkorDB(host=falkor_host, port=falkor_port)
            # Check for both graphs - GraphRAG uses agent_zero_kg_main
            try:
                # Try GraphRAG graph first (has the actual entities)
                self.graph = self.db.select_graph('agent_zero_kg_main')
                self.graph_name = 'agent_zero_kg_main'
            except:
                # Fall back to ghost_memory if that doesn't exist
                self.graph = self.db.select_graph('ghost_memory')
                self.graph_name = 'ghost_memory'
            
            # Create indexes for performance
            try:
                self.graph.create_node_range_index('Entity', 'name')
                self.graph.create_node_range_index('Memory', 'id')
                self.graph.create_node_range_index('Lead', 'owner')
            except:
                pass  # Indexes already exist
            
            print(f"🗡️ Trinity Blade: FALKORDB ACTIVATED! (host: {falkor_host}, graph: {self.graph_name})")
            self.connected = True
            
        except Exception as e:
            print(f"Trinity Blade: FalkorDB connection failed: {e}")
            self.connected = False
            self.graph = None
    
    async def execute(self, action="", entity="", query="", confirm=False, **kwargs):
        """
        Execute Trinity Blade operations on FalkorDB
        
        Actions:
        - stats: Show database statistics
        - analyze: Analyze an entity and its relationships
        - search: Search for entities
        - clear: Clear the graph (requires confirm=true)
        - save: Save with entity extraction (delegated to memory_save)
        """
        
        if not self.connected:
            return Response(
                message="❌ Trinity Blade: FalkorDB not connected",
                break_loop=False
            )
        
        try:
            if action == "stats":
                # Get graph statistics
                result = self.graph.query("MATCH (n) RETURN count(n) as nodes")
                node_count = result.result_set[0][0] if result.result_set else 0
                
                result = self.graph.query("MATCH ()-[r]->() RETURN count(r) as edges")
                edge_count = result.result_set[0][0] if result.result_set else 0
                
                # Get entity breakdown
                result = self.graph.query("""
                    MATCH (n)
                    RETURN labels(n)[0] as label, count(n) as count
                    ORDER BY count DESC
                    LIMIT 10
                """)
                
                breakdown = []
                for row in result.result_set:
                    if row[0]:  # Check if label exists
                        breakdown.append(f"  • {row[0]}: {row[1]}")
                
                message = f"""🗡️ Trinity Blade Statistics (FalkorDB):
📍 Graph: {self.graph_name}
📊 Total Nodes: {node_count}
🔗 Total Relationships: {edge_count}

Entity Breakdown:
{chr(10).join(breakdown) if breakdown else '  No entities yet'}

✅ FalkorDB is operational with GraphRAG integration!"""
                
                return Response(message=message, break_loop=False)
            
            elif action == "analyze" and entity:
                # Analyze a specific entity (handle multiple with semicolon)
                entities = [e.strip() for e in entity.split(';')] if ';' in entity else [entity.strip()]
                
                all_results = []
                for entity_clean in entities:
                    # Find the entity with all properties (case-insensitive)
                    result = self.graph.query(
                        "MATCH (e) WHERE toLower(e.name) = toLower($name) RETURN e, labels(e)",
                        {'name': entity_clean}
                    )
                    
                    if not result.result_set:
                        all_results.append(f"❌ Entity '{entity_clean}' not found in graph")
                        continue
                    
                    # Extract entity properties
                    entity_node = result.result_set[0][0]
                    entity_labels = result.result_set[0][1]
                    
                    # Build contact info display
                    contact_info = []
                    if hasattr(entity_node, 'properties'):
                        props = entity_node.properties
                        if props.get('phone'):
                            phone_type = props.get('phone_type', 'unknown')
                            contact_info.append(f"📞 Phone: {props['phone']} ({phone_type})")
                        if props.get('email'):
                            contact_info.append(f"📧 Email: {props['email']}")
                        if props.get('website'):
                            contact_info.append(f"🌐 Website: {props['website']}")
                        if props.get('social'):
                            contact_info.append(f"📱 Social: {props['social']}")
                        if props.get('address'):
                            contact_info.append(f"📍 Address: {props['address']}")
                        if props.get('confidence'):
                            contact_info.append(f"🎯 Confidence: {props['confidence']}")
                        if props.get('notes'):
                            contact_info.append(f"📝 Notes: {props['notes']}")
                
                    # Get relationships with time attributes (case-insensitive)
                    result = self.graph.query(
                        """
                        MATCH (e)-[r]->(other)
                        WHERE toLower(e.name) = toLower($name)
                        RETURN type(r) as relationship, 
                               CASE WHEN other.name IS NOT NULL THEN other.name 
                                    WHEN other.id IS NOT NULL THEN other.id 
                                    ELSE 'Unknown' END as connected_to,
                               CASE WHEN size(labels(other)) > 0 THEN labels(other)[0] ELSE 'Entity' END as type, 
                               r as rel_props
                        LIMIT 20
                        """,
                        {'name': entity_clean}
                    )
                    
                    relationships = []
                    for row in result.result_set:
                        rel_type = row[0]
                        connected = row[1]
                        node_type = row[2] if row[2] else 'Unknown'
                        rel_props = row[3]
                        
                        # Build relationship string with time attributes
                        rel_str = f"  • {rel_type} → {connected} ({node_type})"
                        if hasattr(rel_props, 'properties'):
                            props = rel_props.properties
                            time_attrs = []
                            if props.get('since'):
                                time_attrs.append(f"since {props['since']}")
                            if props.get('until'):
                                time_attrs.append(f"until {props['until']}")
                            if props.get('current') is False:
                                time_attrs.append("(former)")
                            if time_attrs:
                                rel_str += f" [{', '.join(time_attrs)}]"
                        relationships.append(rel_str)
                    
                    entity_result = f"""🔍 Entity Analysis: {entity_clean}
Type: {', '.join(entity_labels) if entity_labels else 'Unknown'}

Contact Information:
{chr(10).join(contact_info) if contact_info else '  No contact information available'}

Relationships:
{chr(10).join(relationships) if relationships else '  No relationships found'}"""
                    all_results.append(entity_result)
                
                # Return combined results for all entities
                message = "\n\n".join(all_results)
                return Response(message=message, break_loop=False)
            
            elif action == "search" and query:
                # Search for entities in FalkorDB
                
                print(f"[TRINITY DEBUG] Searching for: '{query}'")
                
                # Use safe string-only search with proper type handling
                result = self.graph.query(
                    """
                    MATCH (n)
                    WHERE toLower(n.name) CONTAINS toLower($query)
                       OR (n.id IS NOT NULL AND toLower(toString(n.id)) CONTAINS toLower($query))
                       OR (n.content IS NOT NULL AND toLower(toString(n.content)) CONTAINS toLower($query))
                       OR (n.email IS NOT NULL AND toLower(toString(n.email)) CONTAINS toLower($query))
                       OR (n.phone IS NOT NULL AND toLower(toString(n.phone)) CONTAINS toLower($query))
                       OR (n.website IS NOT NULL AND toLower(toString(n.website)) CONTAINS toLower($query))
                       OR (n.social IS NOT NULL AND toLower(toString(n.social)) CONTAINS toLower($query))
                    RETURN CASE WHEN n.name IS NOT NULL THEN n.name 
                                WHEN n.id IS NOT NULL THEN n.id 
                                ELSE 'Unknown' END as identifier,
                           CASE WHEN size(labels(n)) > 0 THEN labels(n)[0] ELSE 'Entity' END as type,
                           toString(n.email) as email, 
                           toString(n.phone) as phone, 
                           toString(n.website) as website,
                           toString(n.social) as social
                    LIMIT 20
                    """,
                    {'query': query}
                )
                
                print(f"[TRINITY DEBUG] Query returned {len(result.result_set)} results")
                
                matches = []
                for row in result.result_set:
                    identifier = row[0]
                    node_type = row[1] if row[1] else 'Unknown'
                    email = row[2]
                    phone = row[3]
                    website = row[4]
                    social = row[5] if len(row) > 5 else None
                    
                    # Build match string with contact info if available
                    match_str = f"  • {identifier} ({node_type})"
                    contact_parts = []
                    if email:
                        contact_parts.append(f"📧 {email}")
                    if phone:
                        contact_parts.append(f"📞 {phone}")
                    if website:
                        contact_parts.append(f"🌐 {website}")
                    if social:
                        contact_parts.append(f"📱 {social}")
                    if contact_parts:
                        match_str += f" - {', '.join(contact_parts)}"
                    
                    matches.append(match_str)
                    print(f"[TRINITY DEBUG] Found: {identifier} ({node_type}) with contacts: {contact_parts}")
                
                message = f"""🔎 Search Results for '{query}':
{chr(10).join(matches) if matches else 'No matches found'}"""
                
                print(f"[TRINITY DEBUG] Returning {len(matches)} matches")
                
                return Response(message=message, break_loop=False)
            
            elif action == "clear" and confirm:
                # Clear the entire graph
                self.graph.query("MATCH (n) DETACH DELETE n")
                return Response(
                    message="🗑️ Trinity Blade: Graph cleared successfully",
                    break_loop=False
                )
            
            else:
                return Response(
                    message="""❓ Trinity Blade Usage:
- action: stats - Show database statistics
- action: analyze, entity: [name] - Analyze an entity
- action: search, query: [text] - Search for entities
- action: clear, confirm: true - Clear the graph""",
                    break_loop=False
                )
                
        except Exception as e:
            return Response(
                message=f"❌ Trinity Blade Error: {str(e)}",
                break_loop=False
            )
    
