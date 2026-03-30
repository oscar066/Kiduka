import uuid
import json
from contextlib import asynccontextmanager
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, AIMessageChunk
from fastapi import APIRouter, Request, UploadFile, File, Form, BackgroundTasks, FastAPI

# Import agent, schema, utils, and services
from chatbot.agent import agent_graph
from chatbot.schema.chat import ChatRequest
from chatbot.utils import (
    logger, 
    get_llm, 
    get_embeddings, 
    get_vector_store, 
)
from chatbot.utils.config import PINECONE_INDEX_NAME

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for pre-warming expensive singletons.
    """
    logger.info("Pre-warming expensive objects (LLM, Embeddings, Vector Store)...")
    try:
        # Pre-warm the singletons
        get_llm()
        get_embeddings()
        get_vector_store(PINECONE_INDEX_NAME)
        logger.info("All singletons initialized and ready.")
    except Exception as e:
        logger.error(f"Error during pre-warming: {e}")  
    yield

router = APIRouter(tags=["Agent"])

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint to interact with the agent.
    Receives a query and an optional thread_id.
    If a thread_id is not provided, a new one is generated for the conversation.
    """
    # Use the provided thread_id or generate a new one
    thread_id = request.thread_id if request.thread_id else str(uuid.uuid4())
    logger.info(f"Processing request for thread_id: {thread_id}")
    
    # Configuration for the graph stream, using the determined thread_id
    graph_config = {"configurable": {"thread_id": thread_id}}
    
    # Stream the events from the graph using astream for async compatibility
    final_answer = None
    async for event in agent_graph.astream(
        {"messages": [("user", request.query)]}, 
        config=graph_config, 
        stream_mode="values"
    ):
        # The final response is always the last message in the list
        last_message = event["messages"][-1]
        
        # Check if the last message is from the AI and is the final answer (not a tool call)
        if isinstance(last_message, AIMessage) and not last_message.tool_calls:
            final_answer = last_message.content

    logger.info(f"Final answer for thread_id {thread_id}: {final_answer}")
    
    # Return the response AND the thread_id so the client can continue the conversation
    return {"response": final_answer, "thread_id": thread_id}

async def stream_generator(query: str, thread_id: str):
    """
    Generator function to stream agent responses.
    """
    graph_config = {"configurable": {"thread_id": thread_id}}
    
    async for event in agent_graph.astream(
        {"messages": [("user", query)]}, 
        config=graph_config, 
        stream_mode="messages"
    ):
        # We are looking for the 'chatbot' node's output
        msg, metadata = event
        if metadata.get("langgraph_node") == "chatbot":
            if isinstance(msg, AIMessageChunk):
                if msg.content:
                    yield f"data: {json.dumps({'chunk': msg.content, 'thread_id': thread_id})}\n\n"
    
    yield "data: [DONE]\n\n"

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Endpoint to interact with the agent with streaming support.
    """
    thread_id = request.thread_id if request.thread_id else str(uuid.uuid4())
    
    return StreamingResponse(
        stream_generator(request.query, thread_id),
        media_type="text/event-stream"
    )