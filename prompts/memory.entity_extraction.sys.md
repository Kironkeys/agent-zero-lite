# ENTITY AND RELATIONSHIP EXTRACTION

## ⚠️ CRITICAL RULE: ONE-DIRECTIONAL RELATIONSHIPS ONLY

**NEVER CREATE INVERSE RELATIONSHIPS!**

For each relationship, extract it ONLY ONCE in the logically correct direction:
- ✅ Person → OWNS → Pet
- ❌ Pet → OWNS → Person (NEVER EXTRACT THIS)
- ✅ Person → CEO_OF → Company  
- ❌ Company → CEO_OF → Person (NEVER EXTRACT THIS)

## Entity Types
- person: humans with names
- company: businesses, corporations
- animal: pets, animals
- technology: software, platforms
- location: places, addresses
- product: items, services

## Relationship Types (ALWAYS FROM ACTOR TO OBJECT)
- OWNS (person owns thing, NEVER thing owns person)
- CEO_OF, CTO_OF, WORKS_AT (person to company, NEVER company to person)
- LOCATED_IN (entity to location)
- CREATED, DEVELOPED (person/company to product)

## Output Format
Return JSON with:
- entities: array of {name, type}
- relationships: array of {from, to, type}

## Example
Text: "Alex adopted a cat named Whiskers and is CTO of StartupABC"

CORRECT OUTPUT:
{
  "entities": [
    {"name": "Alex", "type": "person"},
    {"name": "Whiskers", "type": "animal"},
    {"name": "StartupABC", "type": "company"}
  ],
  "relationships": [
    {"from": "Alex", "to": "Whiskers", "type": "OWNS"},
    {"from": "Alex", "to": "StartupABC", "type": "CTO_OF"}
  ]
}

WRONG OUTPUT (DO NOT DO THIS):
{
  "relationships": [
    {"from": "Alex", "to": "Whiskers", "type": "OWNS"},
    {"from": "Whiskers", "to": "Alex", "type": "OWNS"},  ❌
    {"from": "Alex", "to": "StartupABC", "type": "CTO_OF"},
    {"from": "StartupABC", "to": "Alex", "type": "CTO_OF"}  ❌
  ]
}
