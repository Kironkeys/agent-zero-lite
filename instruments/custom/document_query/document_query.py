import asyncio
from typing import Optional, List
from python.helpers.document_query import DocumentQueryHelper
from agent import Agent


class DocumentQuery:
    """
    Document query instrument providing document processing and Q&A capabilities.
    This instrument allows agents to:
    - Load and index documents from URLs or file paths
    - Query documents with natural language questions
    - Search within document content
    - Manage document storage
    """

    def __init__(self, agent: Agent):
        self.agent = agent
        self.helper = DocumentQueryHelper(agent, self._progress_callback)
        self._last_progress = ""

    def _progress_callback(self, message: str):
        """Internal progress callback for document operations."""
        self._last_progress = message
        # Optionally print progress for debugging
        # print(f"Document Query: {message}")

    async def load_document(self, document_uri: str, add_to_index: bool = True) -> str:
        """
        Load a document from URI and optionally add it to the searchable index.
        
        Args:
            document_uri: URL or file path to the document
            add_to_index: Whether to add the document to the search index
            
        Returns:
            Document content as text
        """
        try:
            content = await self.helper.document_get_content(document_uri, add_to_index)
            return content
        except Exception as e:
            return f"Error loading document '{document_uri}': {str(e)}"

    async def query_document(self, document_uri: str, questions: List[str]) -> str:
        """
        Ask questions about a specific document.
        
        Args:
            document_uri: URI of the document to query
            questions: List of questions to ask about the document
            
        Returns:
            AI-generated answers to the questions
        """
        try:
            success, response = await self.helper.document_qa(document_uri, questions)
            if success:
                return response
            else:
                return f"Failed to query document: {response}"
        except Exception as e:
            return f"Error querying document '{document_uri}': {str(e)}"

    async def search_documents(self, query: str, limit: int = 10, threshold: float = 0.5) -> List[str]:
        """
        Search across all indexed documents.
        
        Args:
            query: Search query
            limit: Maximum number of results
            threshold: Minimum similarity threshold (0-1)
            
        Returns:
            List of matching document excerpts
        """
        try:
            results = await self.helper.store.search_documents(query, limit, threshold)
            return [f"URI: {doc.metadata.get('document_uri', 'unknown')}\nContent: {doc.page_content[:500]}..." 
                   for doc in results]
        except Exception as e:
            return [f"Error searching documents: {str(e)}"]

    async def list_indexed_documents(self) -> List[str]:
        """
        Get list of all indexed document URIs.
        
        Returns:
            List of document URIs in the index
        """
        try:
            return await self.helper.store.list_documents()
        except Exception as e:
            return [f"Error listing documents: {str(e)}"]

    async def document_exists(self, document_uri: str) -> bool:
        """
        Check if a document is already indexed.
        
        Args:
            document_uri: URI to check
            
        Returns:
            True if document exists in index
        """
        try:
            return await self.helper.store.document_exists(document_uri)
        except Exception as e:
            print(f"Error checking document existence: {str(e)}")
            return False

    def get_last_progress(self) -> str:
        """Get the last progress message from document operations."""
        return self._last_progress


# Synchronous wrapper functions for easier use
def load_document_sync(agent: Agent, document_uri: str, add_to_index: bool = True) -> str:
    """Synchronous wrapper for loading documents."""
    instrument = DocumentQuery(agent)
    return asyncio.run(instrument.load_document(document_uri, add_to_index))

def query_document_sync(agent: Agent, document_uri: str, questions: List[str]) -> str:
    """Synchronous wrapper for querying documents."""
    instrument = DocumentQuery(agent)
    return asyncio.run(instrument.query_document(document_uri, questions))

def search_documents_sync(agent: Agent, query: str, limit: int = 10, threshold: float = 0.5) -> List[str]:
    """Synchronous wrapper for searching documents."""
    instrument = DocumentQuery(agent)
    return asyncio.run(instrument.search_documents(query, limit, threshold))