import os
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.tools import tool

from ..utils import (
    logger, 
    config, 
    get_llm, 
    get_embeddings, 
    get_vector_store, 
    get_pinecone_client,
    get_language,
    get_offline_answer
)

@tool
async def get_rag_answer(question: str) -> str:
    """
    Retrieves the answer to a question from the RAG chain.
    This tool is best for questions about specific company information, policies, or product details.
    Returns the answer as a JSON string.
    """
    logger.info(f"[RAG Tool] Handing question: '{question}'")

    # Detect language first
    try:
        detected_lang = get_language(question)
        logger.info(f"[RAG Tool] Detected language: {detected_lang}")
    except Exception as e:
        logger.warning(f"[RAG Tool] Language detection failed: {e}. Defaulting to 'en'.")
        detected_lang = "en"

    # --- Offline Fallback Logic ---
    if config.OFFLINE_MODE:
        logger.info("[RAG Tool] Offline mode active. Using templates.")
        answer = get_offline_answer(question, lang=detected_lang)
        return json.dumps({"answer": answer, "mode": "offline"})

    try:
        # Get singleton instances
        llm = get_llm()
        pc = get_pinecone_client()
        vectorstore = get_vector_store()
        
        index_name = config.PINECONE_INDEX_NAME

        # 1. Translate the question to English for better retrieval
        if detected_lang == 'en':
            english_question = question
            logger.info("[RAG Tool] English detected. Skipping translation.")
        else:
            translation_prompt = ChatPromptTemplate.from_template(config.RAG_TRANSLATION_PROMPT)
            translation_chain = translation_prompt | llm | StrOutputParser()
            english_question = await translation_chain.ainvoke({"question": question})
            logger.info(f"[RAG Tool] Translated query for retrieval: '{english_question}'")

        # 2. Context Retrieval using English query
        retriever = vectorstore.as_retriever()
        
        # 3. Cross-Lingual RAG Chain
        prompt = ChatPromptTemplate.from_template(config.RAG_TEMPLATE)
        output_parser = StrOutputParser()

        def format_docs(docs):
            return "\n\n".join([d.page_content for d in docs])

        # Define the chain using LCEL
        # We use a dictionary to pass both the search query and the original question
        rag_chain = (
            {
                "context": (lambda x: x["search_query"]) | retriever | format_docs, 
                "question": (lambda x: x["original_question"])
            }
            | prompt
            | llm
            | output_parser
        )

        logger.info("[RAG Tool] Generating answer...")
        # Search with the English version, but answer the original question
        answer = await rag_chain.ainvoke({
            "search_query": english_question, 
            "original_question": question
        })
        
        logger.info(f"[RAG Tool] Successfully retrieved answer for: '{question}'")
        return json.dumps({"answer": answer, "mode": "online"})

    except Exception as e:
        logger.error(f"[RAG Tool] An unexpected error occurred: {e}", exc_info=True)
        # Fallback to offline templates if online fails
        logger.info("[RAG Tool] Online call failed. Falling back to offline templates.")
        answer = get_offline_answer(question, lang=detected_lang)
        return json.dumps({"answer": answer, "mode": "offline_fallback"})