import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from . import config, logger

# Global instances for reuse
_llm = None
_embeddings = None
_vector_stores = {}
_pinecone_client = None

def get_llm():
    """Returns a singleton instance of the ChatOpenAI LLM."""
    global _llm
    if _llm is None:
        logger.info(f"Initializing LLM: {config.LLM_MODEL}")
        _llm = ChatOpenAI(model=config.LLM_MODEL, temperature=config.LLM_TEMPERATURE)
    return _llm

def get_embeddings():
    """Returns a singleton instance of the OpenAIEmbeddings model."""
    global _embeddings
    if _embeddings is None:
        logger.info("Initializing OpenAI Embeddings")
        _embeddings = OpenAIEmbeddings()
    return _embeddings

def get_pinecone_client():
    """Returns a singleton instance of the Pinecone client."""
    global _pinecone_client
    if _pinecone_client is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY environment variable is not set")
        logger.info("Initializing Pinecone client")
        _pinecone_client = Pinecone(api_key=api_key)
    return _pinecone_client

def get_vector_store(index_name: str = None):
    """Returns a cached instance of the PineconeVectorStore for a specific index."""
    global _vector_stores
    if index_name is None:
        index_name = config.PINECONE_INDEX_NAME
        
    if index_name not in _vector_stores:
        logger.info(f"Initializing Vector Store for index: {index_name}")
        # Ensure Pinecone client is initialized and index exists if needed
        # However, PineconeVectorStore handles the connection given the index name and embeddings
        _vector_stores[index_name] = PineconeVectorStore(
            index_name=index_name,
            embedding=get_embeddings()
        )
    return _vector_stores[index_name]

def get_offline_answer(question: str, lang: str = "en") -> str:
    """Mock offline fallback response."""
    return "I am currently in offline mode. Please check your connection for detailed AI analysis."

def get_company_name(tenant_id: str) -> str:
    """Mock tenant/company resolution."""
    return "Kiduka Farm"