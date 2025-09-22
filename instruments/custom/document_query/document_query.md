# Document Query Instrument

## Overview
The Document Query instrument provides comprehensive document processing and question-answering capabilities for all agents. It allows agents to load, index, search, and query various document types including web pages, PDFs, text files, and more.

## Key Features
- **Multi-format Support**: Handle web pages (HTML), PDFs, text files, images, and other document formats
- **Intelligent Indexing**: Automatically chunk and index documents for efficient searching
- **Natural Language Q&A**: Ask questions about document content and get AI-generated answers
- **Vector Search**: Find relevant document sections using semantic similarity
- **Persistent Storage**: Documents remain indexed across sessions using FAISS vector database

## Supported Document Types
- **Web URLs**: HTTP/HTTPS web pages and documents
- **PDF Files**: Extract text and images from PDF documents
- **Text Files**: Plain text, JSON, and other text-based formats
- **HTML Files**: Local and remote HTML documents
- **Images**: OCR extraction from images using Tesseract
- **Other Formats**: Support for various formats via Unstructured library

## Main Functions

### `load_document(document_uri, add_to_index=True)`
Load a document and optionally add it to the searchable index.
- **document_uri**: URL or file path to the document
- **add_to_index**: Whether to add to search index (default: True)
- **Returns**: Document content as text

### `query_document(document_uri, questions)`
Ask specific questions about a document using AI.
- **document_uri**: URI of the document to query
- **questions**: List of questions to ask
- **Returns**: AI-generated answers

### `search_documents(query, limit=10, threshold=0.5)`
Search across all indexed documents using semantic similarity.
- **query**: Search query string
- **limit**: Maximum number of results
- **threshold**: Minimum similarity score (0-1)
- **Returns**: List of matching document excerpts

### `list_indexed_documents()`
Get a list of all documents currently in the index.
- **Returns**: List of document URIs

### `document_exists(document_uri)`
Check if a document is already indexed.
- **document_uri**: URI to check
- **Returns**: Boolean indicating if document exists

## Usage Examples

### Basic Document Loading
```python
from instruments.custom.document_query.document_query import DocumentQuery

# Initialize the instrument
doc_query = DocumentQuery(agent)

# Load a web page
content = await doc_query.load_document("https://example.com/article.html")

# Load a local PDF
content = await doc_query.load_document("/path/to/document.pdf")
```

### Querying Documents
```python
# Ask questions about a specific document
questions = [
    "What is the main topic of this document?",
    "What are the key findings mentioned?",
    "Who are the authors?"
]
answers = await doc_query.query_document("https://example.com/research.pdf", questions)
```

### Searching Across Documents
```python
# Search all indexed documents
results = await doc_query.search_documents("machine learning algorithms", limit=5)

# Check what documents are indexed
indexed_docs = await doc_query.list_indexed_documents()
```

### Synchronous Usage
For simpler use cases, synchronous wrapper functions are available:
```python
from instruments.custom.document_query.document_query import load_document_sync, query_document_sync

# Synchronous document loading
content = load_document_sync(agent, "https://example.com/doc.html")

# Synchronous querying
answers = query_document_sync(agent, "https://example.com/doc.html", ["What is this about?"])
```

## Technical Details

### Vector Database Integration
- Uses FAISS vector database for efficient similarity search
- Documents are automatically chunked for optimal retrieval
- Persistent storage across sessions
- Metadata tracking for document URIs and timestamps

### AI Model Integration
- Leverages agent's chat model for question answering
- Query optimization for better search results
- Context-aware responses based on document content

### Error Handling
- Comprehensive error handling for network issues, file access, and format problems
- Graceful fallbacks for different document processing methods
- Clear error messages for troubleshooting

## Performance Considerations
- Large documents (>50MB) are rejected to prevent memory issues
- Automatic chunking optimizes both storage and retrieval
- Vector similarity search provides fast results even with many documents
- Caching prevents redundant processing of already-indexed documents

## Integration with Agent Zero
This instrument integrates seamlessly with the Agent Zero framework:
- Automatically uses agent's configured AI models
- Leverages agent's file system access permissions
- Utilizes agent's vector database configuration
- Follows Agent Zero's error handling and logging patterns

## Use Cases
- **Research**: Index and query research papers, articles, and documents
- **Documentation**: Search through technical documentation and manuals
- **Content Analysis**: Analyze and extract information from various content types
- **Knowledge Base**: Build searchable knowledge bases from document collections
- **Data Extraction**: Extract structured information from unstructured documents