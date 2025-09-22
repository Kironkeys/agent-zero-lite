import threading
import asyncio
import json
import re
from python.helpers.memory import Memory
from python.helpers.tool import Tool, Response
from falkordb import FalkorDB
import os
import hashlib
from datetime import datetime

# FalkorDB now syncs ALL memories regardless of area - no restrictions!

class MemorySave(Tool):
    def __init__(self, agent, **kwargs):
        super().__init__(agent, **kwargs)
        # Verbose mode flag - set to False for production, True for debugging
        self.verbose_mode = os.getenv('MEMORY_VERBOSE', 'false').lower() == 'true'
        try:
            # Connect to FalkorDB
            if os.path.exists('/.dockerenv'):
                # Inside Docker - use internal port
                falkor_host = 'falkordb'
                falkor_port = 6379
            else:
                # Local development - use external port
                falkor_host = 'localhost'
                falkor_port = 6380
            
            # Connect with appropriate port
            self.db = FalkorDB(host=falkor_host, port=falkor_port)
            self.graph = self.db.select_graph('ghost_memory')
            self.graph_available = True
            
            # Create indexes for performance
            try:
                self.graph.create_node_range_index('Memory', 'id')
                self.graph.create_node_range_index('Person', 'name')
                self.graph.create_node_range_index('Company', 'name')
                self.graph.create_node_range_index('Location', 'name')
                self.graph.create_node_range_index('Product', 'name')
                self.graph.create_node_range_index('Technology', 'name')
            except:
                pass  # Indexes exist
                
        except Exception as e:
            print(f"FalkorDB not available (will use FAISS only): {e}")
            self.graph_available = False
            self.graph = None

    def _extract_with_regex(self, content: str):
        """Fast regex extraction for structured data (emails, phones, URLs)"""
        extracted = {
            "emails": [],
            "phones": [],
            "urls": [],
            "dates": []
        }
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        extracted["emails"] = [{"value": e, "confidence": 0.95} for e in emails]
        
        # Phone patterns (various formats)
        phone_patterns = [
            r'\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',  # US format
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Simple format
            r'\(\d{3}\)\s*\d{3}-\d{4}',  # (xxx) xxx-xxxx
            r'\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,4}'  # International
        ]
        
        phones_found = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, content)
            if isinstance(matches[0], tuple) if matches else False:
                # Handle grouped matches
                phones_found.extend([''.join(m) for m in matches])
            else:
                phones_found.extend(matches)
        
        # Normalize and dedupe phones
        seen_phones = set()
        for phone in phones_found:
            normalized = re.sub(r'[^\d+]', '', str(phone))
            if normalized and normalized not in seen_phones and len(normalized) >= 10:
                extracted["phones"].append({"value": phone, "normalized": normalized, "confidence": 0.9})
                seen_phones.add(normalized)
        
        # URL pattern
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, content)
        extracted["urls"] = [{"value": u, "confidence": 0.95} for u in urls]
        
        # Date patterns (common formats)
        date_patterns = [
            r'\b\d{4}-\d{2}-\d{2}\b',  # YYYY-MM-DD
            r'\b\d{2}/\d{2}/\d{4}\b',  # MM/DD/YYYY
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b',  # Month DD, YYYY
        ]
        
        dates_found = []
        for pattern in date_patterns:
            dates_found.extend(re.findall(pattern, content, re.IGNORECASE))
        extracted["dates"] = [{"value": d, "confidence": 0.85} for d in dates_found]
        
        return extracted

    async def _extract_entities_with_llm(self, content: str, area: str):
        """Extracts entities and relationships using the agent's utility LLM."""
        try:
            # Load extraction prompts from files if they exist
            try:
                sys_prompt = self.agent.read_prompt("memory.entity_extraction.sys.md")
                msg_prompt = self.agent.read_prompt("memory.entity_extraction.msg.md", 
                                                   memory_content=content)
                # Use the loaded prompts
                extraction_prompt = sys_prompt + "\n\n" + msg_prompt
                print("✅ Using entity extraction prompts from files")
            except:
                # Fallback to hardcoded prompt if files don't exist
                print("⚠️ Using hardcoded extraction prompt (files not found)")
                # ENHANCED EXTRACTION PROMPT - OPTIMIZED FOR LEAD SCORING & CONTACT QUALITY
                extraction_prompt = f'''Extract ALL entities and relationships from this conversation text.

TEXT: {content}

ENTITY TYPES to extract:
- person (any individual mentioned)
- company (businesses, corporations)  
- product (services, software, devices)
- technology (frameworks, languages)
- location (cities, countries)
- property (specific buildings, parcels, addresses)
- organization (non-profits, government agencies)

For each entity, extract ALL contact information found:
- phone numbers (note if mobile/landline if mentioned)
- email addresses (exact as shown)
- websites/domains (without http://)
- social media (platform and handle/URL)
- physical addresses (if mentioned)

CRITICAL RULES FOR CONTACT EXTRACTION:
- ONLY extract contact info that is EXPLICITLY stated in the text
- Link contacts to the CORRECT entity they belong to
- If unclear which entity a contact belongs to, mark confidence as "low"
- Include area codes for ALL phone numbers
- Preserve email addresses EXACTLY as written
- Note if contact info is described as "old" or "previous"

RELATIONSHIP TYPES to extract:
- CEO_OF, FOUNDER_OF, CO_FOUNDER_OF
- WORKS_AT, EMPLOYED_BY, WORKED_AT (note if past tense)
- OWNS, ACQUIRED, INVESTED_IN
- CREATED, DEVELOPED, LAUNCHED
- SUBSIDIARY_OF, PARENT_OF, MERGED_WITH
- BASED_IN, LOCATED_AT, HEADQUARTERS_IN
- SUCCEEDED (person succeeded another)
- RENAMED_TO (company name changes like Facebook->Meta)
- PARTNER_OF, MARRIED_TO (for personal relationships)
- SELLER_OF, BUYER_OF (for property transactions)

Include dates/timeframes whenever mentioned (e.g., "since 2020", "from 2018-2021", "formerly")

CONFIDENCE SCORING:
- "high": Contact info directly stated with clear entity association
- "medium": Contact info present but entity association inferred from context
- "low": Contact info uncertain, conflicting sources, or unclear ownership

Return JSON:
{{"entities":[{{"name":"exact name as mentioned","type":"entity type","phone":"if found","phone_type":"mobile/landline/unknown","email":"if found","website":"if found","social":"platform: handle/url","address":"if found","confidence":"high/medium/low","notes":"any caveats like 'possibly outdated'"}}],"relationships":[{{"from":"entity1","to":"entity2","type":"RELATIONSHIP_TYPE","since":"date if mentioned","until":"date if mentioned","current":true/false}}]}}'''
            
            # ORIGINAL COMPLEX PROMPT (commented out for now)
            original_extraction_prompt = f'''[SYSTEM ROLE — UTILITY EXTRACTOR]
You perform high-precision entity and relationship extraction from the GIVEN TEXT ONLY.
No speculation, no cross-document linking, no lead prioritization. Output STRICT JSON that
matches the schema below. Do NOT alter or simplify the schema. If you propose changes, add a
top-level key `schema_proposal` with a JSON diff; otherwise return ONLY the JSON object.

=== OUTPUT JSON SCHEMA (UTILITY v1.4) ===
{{
  "doc": {{
    "id": "string|null",
    "title": "string|null",
    "date": "YYYY-MM-DD|null",
    "chunk_index": null,
    "total_chunks": null
  }},
  "entities": [
    {{
      "id": "string",
      "name": "string",
      "type": "person|company|organization|location|address|property|product|technology|event",
      "subtype": "string|null",
      "aliases": ["string"],
      "titles": ["string"],
      "contact": {{
        "emails": [{{"value":"string","normalized":"string","confidence":0.0}}],
        "phones": [{{"value":"string","e164":"string|null","confidence":0.0}}],
        "domains": [{{"value":"string","confidence":0.0}}],
        "urls": [{{"value":"string","confidence":0.0}}],
        "socials": [{{"platform":"string","url":"string","confidence":0.0}}]
      }},
      "attributes": {{
        "ids": {{"ein":"string|null","duns":"string|null"}},
        "geo": {{"lat": null, "lng": null}}
      }},
      "source_spans": [{{"start":0,"end":0,"text":"string"}}],
      "mentions": [{{"text":"string","start":0,"end":0}}],
      "confidence": 0.0
    }}
  ],
  "relationships": [
    {{
      "type": "CEO_OF|FOUNDER_OF|OWNS|OWNS_PROPERTY|WORKS_AT|EMPLOYED_BY|PARTNER_OF|SUPPLIER_OF|CUSTOMER_OF|AFFILIATED_WITH|LOCATED_IN|BASED_IN|ACQUIRED|INVESTED_IN|MENTIONS",
      "from": "entity_id",
      "to": "entity_id",
      "attributes": {{
        "since": "YYYY-MM-DD|null",
        "role": "string|null",
        "percent": null,
        "amount_usd": null
      }},
      "evidence": "string",
      "confidence": 0.0
    }}
  ],
  "ambiguities": [
    {{
      "issue": "string",
      "spans": [{{"start":0,"end":0,"text":"string"}}],
      "note": "string"
    }}
  ]
}}

=== RULES (UTILITY-ONLY) ===
1) In-scope evidence only: extract what is explicitly stated in the given text. No outside knowledge.
2) Coref is LOCAL: unify mentions that clearly refer to the same entity within THIS text only; do not guess cross-doc merges.
3) Disambiguation:
   - PERSON: human actions/roles/titles or personal contact.
   - COMPANY/ORGANIZATION: legal suffix/org cues; may own property or employ people.
   - LOCATION = city/state/country/region; ADDRESS = specific street/postal; PROPERTY = named building/parcel.
   - TECHNOLOGY/PRODUCT = software/framework/model/device/SKU.
   If uncertain, output separate low-confidence entities and record the case in "ambiguities".
4) Contact linking:
   Link emails/phones/domains/socials/urls to the nearest unambiguous entity mentioned in context.
   If ambiguous, choose the best-supported target, lower confidence, and add an "ambiguities" note.
5) Normalization:
   - entity.id: lowercase snake_case from canonical name.
   - emails.normalized: lowercase; phones.e164: best-effort E.164 else null.
   - domains: bare domain (no protocol/path).
6) Evidence + confidence:
   - Every relationship MUST include a short evidence snippet from the text and a numeric confidence 0.0–1.0.
   - Lower confidence for hedged language ("reportedly", "might", "according to").
7) Deduping (within this text only): merge obvious duplicates via aliases; keep one canonical entity id.
8) Output strictly valid JSON. No comments, no extra keys, no prose.

=== RELATIONSHIP CANONICALIZATION ===
Map surface phrases to:
- CEO_OF ("CEO of", "serves as CEO at")
- FOUNDER_OF ("founded", "co-founded")
- OWNS / OWNS_PROPERTY (ownership; property/address targets)
- WORKS_AT / EMPLOYED_BY ("works at", "joined", "hired by")
- PARTNER_OF, SUPPLIER_OF, CUSTOMER_OF
- LOCATED_IN / BASED_IN
- ACQUIRED, INVESTED_IN
- AFFILIATED_WITH (formal link when others don't fit; use sparingly)
- MENTIONS (weak association; text mentions only)

=== QUALITY GATES (MUST PASS) ===
- Contacts are linked to the correct entity with appropriate confidence.
- Ambiguous cases are recorded under "ambiguities" (with spans).
- Every relationship includes a real evidence snippet and numeric confidence.
- JSON is syntactically valid and schema-conformant.

=== NO-RESULTS CONTRACT ===
If nothing is extractable, return:
{{"doc":{{"id":null,"title":null,"date":null,"chunk_index":null,"total_chunks":null}},"entities":[],"relationships":[],"ambiguities":[]}}

[USER CONTENT]
Use the schema and rules above to extract entities and relationships from this text:

"{content}"

Return ONLY the JSON object.'''

            response = await self.agent.call_utility_model(
                system=sys_prompt,
                message=msg_prompt
            )

            print(f"🤖 UTILITY MODEL RAW RESPONSE: {response[:500]}...")
            
            # Clean and parse response with better error handling
            clean_response = response.strip()
            # Remove markdown code blocks if present
            if '```json' in clean_response:
                clean_response = clean_response.split('```json')[1].split('```')[0]
            elif '```' in clean_response:
                clean_response = clean_response.replace('```', '')
            
            try:
                extracted_data = json.loads(clean_response)
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parsing error: {e}")
                print(f"Attempting to fix common issues...")
                # Try to fix common JSON issues
                clean_response = clean_response.replace("'", '"')  # Single quotes to double
                clean_response = clean_response.replace('True', 'true').replace('False', 'false')
                clean_response = clean_response.replace('None', 'null')
                try:
                    extracted_data = json.loads(clean_response)
                    print("✅ JSON fixed and parsed successfully")
                except:
                    print(f"❌ Could not parse JSON, using empty extraction")
                    extracted_data = {"entities": [], "relationships": []}
            
            # Convert simple format to full format if needed
            if 'doc' not in extracted_data:
                # Enhanced format - convert to full format for FalkorDB
                simple_entities = extracted_data.get('entities', [])
                simple_rels = extracted_data.get('relationships', [])
                
                # Convert to full format with all contact fields
                full_entities = []
                for e in simple_entities:
                    # Handle social media - could be string or dict
                    social_value = e.get('social')
                    if isinstance(social_value, dict):
                        # Convert dict to string format
                        platform = social_value.get('platform', '')
                        url = social_value.get('url', social_value.get('handle', ''))
                        social_value = f"{platform}: {url}" if platform and url else None
                    
                    # Convert empty strings to None for proper NULL handling
                    def clean_empty(value):
                        if value == "" or value == " " or (isinstance(value, str) and not value.strip()):
                            return None
                        return value
                    
                    entity_data = {
                        'id': e.get('name', '').lower().replace(' ', '_'),
                        'name': e.get('name'),
                        'type': e.get('type', 'other'),
                        'confidence': e.get('confidence', 'medium'),
                        'phone': clean_empty(e.get('phone')),
                        'phone_type': clean_empty(e.get('phone_type')),
                        'email': clean_empty(e.get('email')),
                        'website': clean_empty(e.get('website')),
                        'social': clean_empty(social_value),
                        'address': clean_empty(e.get('address')),
                        'notes': clean_empty(e.get('notes'))
                    }
                    # Remove None values to keep data clean
                    entity_data = {k: v for k, v in entity_data.items() if v is not None}
                    full_entities.append(entity_data)
                
                full_rels = []
                for r in simple_rels:
                    rel_data = {
                        'from': r.get('from'),
                        'to': r.get('to'),
                        'type': r.get('type', 'RELATED_TO'),
                        'since': r.get('since'),
                        'until': r.get('until'),
                        'current': r.get('current')
                    }
                    # Remove None values
                    rel_data = {k: v for k, v in rel_data.items() if v is not None}
                    full_rels.append(rel_data)
                    
                extracted_data = {
                    'entities': full_entities,
                    'relationships': full_rels
                }
            
            # Validate and clean extracted data
            entities = extracted_data.get('entities', [])
            relationships = extracted_data.get('relationships', [])
            
            # Validate entities have required fields
            valid_entities = []
            for entity in entities:
                if entity.get('name'):  # Name is required
                    valid_entities.append(entity)
                else:
                    print(f"⚠️ Skipping entity without name: {entity}")
            
            # Validate relationships have required fields
            valid_relationships = []
            for rel in relationships:
                if rel.get('from') and rel.get('to'):  # From and To are required
                    valid_relationships.append(rel)
                else:
                    print(f"⚠️ Skipping relationship without from/to: {rel}")
            
            extracted_data['entities'] = valid_entities
            extracted_data['relationships'] = valid_relationships
            
            print(f"📊 PARSED EXTRACTION: {len(valid_entities)} entities, {len(valid_relationships)} relationships")
            
            return extracted_data
        except Exception as e:
            print(f"LLM extraction failed: {e}")
            return {"entities": [], "relationships": []}

    def _save_to_falkordb(self, memory_data, extracted_data):
        """Save entities to FalkorDB graph database"""
        if not self.graph_available:
            return
            
        try:
            memory_id = memory_data.get("memory_id")
            
            # Create Memory node
            self.graph.query("""
                MERGE (m:Memory {id: $memory_id})
                SET m.content = $content,
                    m.area = $area,
                    m.timestamp = $timestamp
            """, {
                'memory_id': memory_id,
                'content': memory_data.get("content", "")[:2000],
                'area': memory_data.get("area", "main"),
                'timestamp': datetime.now().isoformat()
            })
            
            # Process entities
            for entity in extracted_data.get("entities", []):
                entity_name = entity.get("name")
                entity_type = entity.get("type", "other").lower()
                entity_context = entity.get("context", "")
                
                # Skip empty names or "None" entities
                if not entity_name or entity_name.lower() == "none":
                    continue
                
                # Map entity types to node labels
                label_map = {
                    "person": "Person",
                    "company": "Company",
                    "technology": "Technology",
                    "product": "Product",
                    "location": "Location",
                    "other": "Entity"
                }
                
                label = label_map.get(entity_type, "Entity")
                
                # Create entity and link to memory
                query_params = {
                    'name': entity_name,
                    'context': entity_context,
                    'confidence': entity.get("confidence", "medium"),
                    'timestamp': datetime.now().isoformat(),
                    'memory_id': memory_id
                }
                
                # Build query with all contact info if present
                set_clauses = ["e.context = $context", "e.confidence = $confidence", "e.last_seen = $timestamp"]
                
                # Add phone if present
                if entity.get("phone"):
                    set_clauses.append("e.phone = $phone")
                    query_params['phone'] = entity.get("phone")
                    if entity.get("phone_type"):
                        set_clauses.append("e.phone_type = $phone_type")
                        query_params['phone_type'] = entity.get("phone_type")
                
                # Add email if present
                if entity.get("email"):
                    set_clauses.append("e.email = $email")
                    query_params['email'] = entity.get("email")
                
                # Add website if present
                if entity.get("website"):
                    set_clauses.append("e.website = $website")
                    query_params['website'] = entity.get("website")
                
                # Add social media if present
                if entity.get("social"):
                    set_clauses.append("e.social = $social")
                    query_params['social'] = entity.get("social")
                
                # Add physical address if present
                if entity.get("address"):
                    set_clauses.append("e.address = $address")
                    query_params['address'] = entity.get("address")
                
                # Add notes if present (important for caveats)
                if entity.get("notes"):
                    set_clauses.append("e.notes = $notes")
                    query_params['notes'] = entity.get("notes")
                
                # FIXED: MERGE on name only, then add label
                # This prevents duplicates with different labels
                query = f"""
                    MERGE (e:Entity {{name: $name, memory_id: $memory_id}})
                    SET e:{label}
                    SET {', '.join(set_clauses) if set_clauses else 'e.updated = timestamp()'}
                    WITH e
                    MATCH (m:Memory {{id: $memory_id}})
                    MERGE (m)-[:MENTIONS]->(e)
                """
                
                self.graph.query(query, query_params)
            
            # Create relationships between entities
            # Build entity ID to name mapping first
            entity_id_to_name = {}
            for entity in extracted_data.get("entities", []):
                entity_id = entity.get("id")
                entity_name = entity.get("name")
                if entity_id and entity_name:
                    entity_id_to_name[entity_id] = entity_name
            
            for rel in extracted_data.get("relationships", []):
                from_entity_id = rel.get("from")
                to_entity_id = rel.get("to")
                rel_type = rel.get("type", "RELATED_TO").upper().replace(" ", "_")
                
                # Convert entity IDs to names for database lookup
                from_name = entity_id_to_name.get(from_entity_id, from_entity_id)
                to_name = entity_id_to_name.get(to_entity_id, to_entity_id)
                
                print(f"🔗 Creating relationship: {from_name} -> {rel_type} -> {to_name}")
                
                # Build relationship properties
                rel_props = []
                rel_params = {
                    'from': from_name,
                    'to': to_name
                }
                
                if rel.get('since'):
                    rel_props.append("r.since = $since")
                    rel_params['since'] = rel.get('since')
                
                if rel.get('until'):
                    rel_props.append("r.until = $until")
                    rel_params['until'] = rel.get('until')
                
                if rel.get('current') is not None:
                    rel_props.append("r.current = $current")
                    rel_params['current'] = rel.get('current')
                
                # Create relationship with properties
                if rel_props:
                    query = f"""
                        MATCH (a {{name: $from}})
                        MATCH (b {{name: $to}})
                        MERGE (a)-[r:{rel_type}]->(b)
                        SET {', '.join(rel_props)}
                    """
                else:
                    query = f"""
                        MATCH (a {{name: $from}})
                        MATCH (b {{name: $to}})
                        MERGE (a)-[r:{rel_type}]->(b)
                    """
                
                self.graph.query(query, rel_params)
            
            # Print summary
            entity_count = len(extracted_data.get("entities", []))
            rel_count = len(extracted_data.get("relationships", []))
            print(f"✅ Background FalkorDB save complete: {entity_count} entities, {rel_count} relationships")
                
        except Exception as e:
            print(f"FalkorDB save error (non-critical): {e}")

    def _trigger_graph_sync(self, memory_data):
        """Runs GraphRAG ingestion in background thread"""
        try:
            print(f"🔄 Background GraphRAG ingestion started for memory {memory_data.get('memory_id')}")
            
            # Use GraphRAG for entity extraction and graph storage
            from python.helpers.graphrag_helper import GraphRAGHelper
            
            area = memory_data.get("area", "main")
            content = memory_data.get("content", "")
            memory_id = memory_data.get("memory_id", "")
            
            print(f"📝 GraphRAG processing: {content[:100]}...")
            
            # Get GraphRAG helper for the specific area
            helper = GraphRAGHelper.get_for_area(area)
            
            # Create metadata for the ingestion
            metadata = {
                "memory_id": memory_id,
                "area": area,
                "source_type": "memory_save",
                "timestamp": memory_data.get("timestamp", "")
            }
            
            # Ingest the text with instruction for optimal extraction
            instruction = "Extract entities, relationships, contact information, dates, and business connections"
            helper.ingest_text(content, instruction, metadata)
            
            print(f"✅ GraphRAG ingestion completed for memory {memory_id}")
            
        except Exception as e:
            print(f"❌ Background GraphRAG extraction error: {e}")
            import traceback
            traceback.print_exc()

    async def execute(self, text="", area="", **kwargs):
        """Main save method - immediate FAISS save + background FalkorDB extraction
        
        Args:
            text: The text content to save
            area: Memory area (default: "main")
        """
        
        if not text or not str(text).strip():
            return Response(message="Cannot save empty memory", break_loop=False)
        
        text_str = str(text).strip()
        if not area:
            area = "main"
        
        # Save to FAISS immediately (always, for vector search)
        db = await Memory.get(self.agent)
        metadata = {
            "area": area,
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        memory_id = await db.insert_text(text_str, metadata)
        
        # Prepare data for background processing
        memory_data = {
            "memory_id": memory_id,
            "content": text_str,
            "area": area,
            "metadata": metadata
        }
        
        # ALWAYS trigger background graph sync for ALL memories if FalkorDB is available
        if self.graph_available:
            threading.Thread(
                target=self._trigger_graph_sync,
                args=(memory_data,),
                daemon=True
            ).start()
            status = "🔄 Background GraphRAG ingestion with FalkorDB SDK started..."
        else:
            status = "✅ Saved to vector memory (FalkorDB not available)"

        # Return based on verbose mode setting
        if self.verbose_mode:
            # Verbose mode - show full details (debugging/development)
            result = f"""💾 Memory saved!
ID: {memory_id}
Area: {area}
Status: {status}
Content preview: {content[:200]}..."""
        else:
            # Production mode - minimal response
            result = f"💾 Saved ({area})"
        
        return Response(message=result, break_loop=False)