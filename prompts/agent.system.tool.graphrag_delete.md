# GraphRAG Delete Tool

## Purpose
The GraphRAG delete tool removes specific knowledge from the graph database based on natural language queries. This tool helps maintain data quality by removing outdated, incorrect, or unwanted information.

## When to Use
- Removing outdated or incorrect information
- Cleaning up duplicate or redundant data
- Deleting sensitive information that shouldn't be stored
- Maintaining data quality and relevance
- Correcting mistakes in the knowledge graph

## Parameters
- **query** (required): Natural language description of what knowledge should be deleted
- **confirm** (required for deletion): Safety flag that must be set to `true` to actually delete data

## Safety Features
- **Preview mode**: By default, shows what would be deleted without actually deleting
- **Confirmation required**: Must explicitly set `confirm: true` to perform actual deletion
- **Targeted deletion**: Uses keyword extraction to find specific entities and relationships

## Usage Examples

### Preview Mode (Safe)
```
GraphRAG Delete:
query: "Remove all information about Microsoft"
confirm: false
```
*Shows what would be deleted without actually deleting*

### Actual Deletion (Destructive)
```
GraphRAG Delete:
query: "Delete the incorrect information about Steve Jobs being CEO in 2025"
confirm: true
```
*Actually deletes the matching data*

## Query Types
- **Entity deletion**: "Delete all information about [person/company]"
- **Relationship deletion**: "Remove the connection between X and Y" 
- **Topic deletion**: "Delete everything about [topic/domain]"
- **Specific fact deletion**: "Remove the incorrect fact that [specific statement]"

## Best Practices
- **Always preview first**: Use `confirm: false` to see what will be deleted
- **Be specific**: Vague queries may delete more than intended
- **Use quotes**: Put specific terms in quotes for exact matching
- **Backup important data**: This operation cannot be undone

## Warning
⚠️ **DELETION IS PERMANENT** - Once data is deleted from the graph, it cannot be recovered. Always preview deletions first!