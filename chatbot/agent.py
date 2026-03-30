"""
Agent module that sets up a conversational agent with tool usage capabilities.
"""
from typing import Annotated
from typing_extensions import TypedDict
from .utils import logger, config, get_llm
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver
from chatbot.tools.get_rag_tool import get_rag_answer

class State(TypedDict):
    """
    Represents the state of our graph.
    
    Attributes:
        messages: The list of messages that have been exchanged.
    """
    messages: Annotated[list, add_messages]

# Create the Prompt Template and Agent Chain
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", config.SYSTEM_PROMPT),
        ("placeholder", "{messages}"),
    ]
)

# Initialize the LLM for the agent
llm = get_llm()

# Define the list of tools
all_tools = [get_rag_answer]

# Bind the tools to the LLM
llm_with_tools = llm.bind_tools(all_tools)

# Create the final agent chain by piping the prompt to the LLM
agent_chain = prompt | llm_with_tools

# Define the Graph Nodes
async def chatbot(state: State):
    """
    The main chatbot node for the graph.
    Invokes the agent chain with the current state to decide the next action.
    """
    logger.info("Agent: Invoking chatbot node.")
    # Use the agent_chain which includes the system prompt
    result = await agent_chain.ainvoke({"messages": state["messages"]})
    return {"messages": [result]}

# Build and Compile the Graph 
graph_builder = StateGraph(State)

# Add the chatbot node
graph_builder.add_node("chatbot", chatbot)

# Add the tool node
tool_node = ToolNode(tools=all_tools)
graph_builder.add_node("tools", tool_node)

# Define the conditional logic for routing
graph_builder.add_conditional_edges(
    "chatbot",
    tools_condition,
)

# Connect the tool node back to the chatbot
graph_builder.add_edge("tools", "chatbot")

# Set the entry point for the graph
graph_builder.set_entry_point("chatbot")

# Compile the graph with memory
memory = InMemorySaver()
agent_graph = graph_builder.compile(checkpointer=memory)

logger.info("Agent graph compiled successfully with a system prompt.")