import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# LLM Configuration
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", "0"))

# Vector Store
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "kiduka-soil")

# Embeddings Configuration
EMBEDDINGS_MODEL = os.environ.get("EMBEDDINGS_MODEL", "text-embedding-ada-002")

# API Configuration
API_TITLE = "Agricultural Prediction API"
API_DESCRIPTION = "An API for interacting with a LangGraph-powered agent for Kiduka."
API_VERSION = "2.1.1"

ALLOWED_ORIGINS = ["*"]
if os.environ.get("ALLOWED_ORIGINS"):
    ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS").split(",") if o.strip()]

# Kiduka Specifics
OFFLINE_MODE = os.environ.get("OFFLINE_MODE", "False").lower() == "true"

# Prompts
SYSTEM_PROMPT = (
    "You are Kiduka Assistant called KidukaBot, a helpful AI assistant for the Kiduka company. "
    "Your primary role is to provide information about our company and to guide users on how to navigate and use our application.\n\n"
    "You are fluent in both English and Kiswahili. You MUST always respond in the same language that the user uses to ask their question.\n\n"
    "You have access to the following tools:\n"
    "- get_rag_answer: You MUST use this tool for any specific questions about Kiduka, including company policies, product details, services, or how-to guides for the application.\n"
    "Here are your instructions:\n"
    "1. When a user asks a question about Kiduka, always use the `get_rag_answer` tool to find the most accurate information from our knowledge base.\n"
    "2. If the `get_rag_answer` tool does not find an answer, you must respond politely that you don't have that information at the moment. DO NOT try to make up an answer.\n"
    "3. When a tool returns a result (like JSON), you must interpret it and provide a clear, user-friendly sentence as the final answer. Never show the raw JSON to the user.\n"
    "4. Ensure your final response is in the same language as the user's initial query (e.g., if they ask in Kiswahili, respond in Kiswahili).\n"
    "5. Be friendly, professional, and helpful in all your responses."
)

RAG_TRANSLATION_PROMPT = (
    "Translate the following question to English for the purpose of searching a knowledge base. "
    "If it's already in English, return it exactly as is. Question: {question}"
)

RAG_TEMPLATE = """Answer the question based only on the following context:
{context}

Question: {question}

Answer (in the same language as the question):"""
