import os
import json
from app.rag.vector_store import load_vector_store
from app.rag.pipeline import client

def rewrite_query(question: str, history: list = []) -> str:
    """
    Rewrites a vague user query into a fully-specified, self-contained retrieval friendly query.
    Uses LLM to perform query expansion and remove ambiguity.
    """
    if not history:
        return question
        
    try:
        # Construct dialog context
        history_summary = []
        for msg in history[-5:]:  # check last 5 messages
            role = msg.get("role", "user") if isinstance(msg, dict) else getattr(msg, "role", "user")
            content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
            history_summary.append(f"{role.upper()}: {content}")
        
        context_str = "\n".join(history_summary)
        
        prompt = f"""You are an advanced query pre-processing system. Analyze the chat history and the latest user question.
If the latest question is vague or references previous context (e.g., pronouns like 'it', 'this', 'that', 'they'), rewrite the question to be self-contained and descriptive for vector database retrieval.
If the question is already specific and self-contained, return it exactly as is.

Chat History:
{context_str}

Vague Latest Question:
{question}

Return ONLY the rewritten search query. No preamble, no explanation, no formatting:"""

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1,
            max_tokens=256
        )
        rewritten = chat_completion.choices[0].message.content.strip()
        print(f"[RAG] Rewritten query: '{question}' -> '{rewritten}'")
        return rewritten
    except Exception as e:
        print("[RAG Error] Failed to rewrite query:", e)
        return question


def generate_multi_queries(question: str) -> list:
    """
    Generates 3 variations of the question to address vocabulary mismatches and improve retrieval coverage.
    """
    try:
        prompt = f"""You are a search query optimizer. Given a user question, generate exactly 3 alternative search queries that capture the same intent or cover key components of the question. 
Generate queries that target different vocabulary terms or phrasing to maximize search coverage in a vector database.

User Question:
{question}

Return ONLY a JSON list of strings containing exactly 3 query variations. Do not add any conversational text or markdown code blocks:"""

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=256
        )
        response_text = chat_completion.choices[0].message.content.strip()
        
        # Clean up in case LLM outputs markdown blocks
        if "```" in response_text:
            parts = response_text.split("```")
            response_text = parts[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
        queries = json.loads(response_text)
        if isinstance(queries, list):
            queries = [q for q in queries if isinstance(q, str)]
            queries = queries[:3]
            print(f"[RAG] Multi-queries generated: {queries}")
            return list(set([question] + queries))
    except Exception as e:
        print("[RAG Error] Failed to generate multi-queries:", e)
        
    return [question]


def retrieve_and_deduplicate(queries: list, user_id: int, k: int = 5) -> list:
    """
    Retrieves documents from the FAISS database for each query, merges, and deduplicates.
    """
    db = load_vector_store(user_id)
    if db is None:
        return []
        
    all_docs = []
    seen_contents = set()
    
    for q in queries:
        try:
            docs = db.similarity_search(q, k=k)
            for doc in docs:
                # Normalizing text to prevent duplicate chunks
                norm_text = " ".join(doc.page_content.lower().split())
                if norm_text not in seen_contents:
                    seen_contents.add(norm_text)
                    all_docs.append(doc)
        except Exception as e:
            print(f"[RAG Error] Search failed for query '{q}':", e)
            
    return all_docs[:10]  # Return top 10 unique chunks


def query_rag(question: str, user_id: int, history: list = [], model: str = None) -> dict:
    """
    Coordinates the full RAG pipeline and returns the grounded answer.
    """
    try:
        # 1. Rewrite query if history exists
        rewritten_query = rewrite_query(question, history)
        
        # 2. Generate multi-query variations
        queries = generate_multi_queries(rewritten_query)
        
        # 3. Retrieve and deduplicate chunks
        docs = retrieve_and_deduplicate(queries, user_id, k=4)
        
        if not docs:
            return {
                "answer": "I could not find supporting information in the provided knowledge sources."
            }
            
        # 4. Construct context with source metadata
        context_parts = []
        for doc in docs:
            source = os.path.basename(doc.metadata.get("source", "Document"))
            page = doc.metadata.get("page", 0) + 1  # convert 0-indexed to 1-indexed
            context_parts.append(f"[Source: {source}, Page: {page}]\n{doc.page_content}")
            
        context_str = "\n\n---\n\n".join(context_parts)
        
        # 5. Build system prompt for strict factual grounding
        system_prompt = """You are a highly precise, advanced Retrieval-Augmented Generation (RAG) assistant.
Your main objective is to answer the user's question accurately using ONLY the provided document context.

Strict Grounding Rules:
1. Ground every claim and statement you make directly in the provided Document Context. Do NOT make claims that are unsupported by the context.
2. If the answer cannot be found or logically inferred from the context, state exactly: "I could not find supporting information in the provided knowledge sources." rather than fabricating any detail.
3. You must use inline citations for all facts derived from the context. Use the format: [Source_File.pdf, Page X].
4. At the end of your response, list all the cited documents and pages in a structured 'Sources:' bibliography section.
5. Answer in clear markdown format.
"""

        # 6. Format LLM prompt
        prompt = f"""Document Context:
{context_str}

User Question:
{question}

Answer:"""

        # Build message thread
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add history
        for msg in history:
            role = msg.get("role", "user") if isinstance(msg, dict) else getattr(msg, "role", "user")
            content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
            messages.append({"role": role, "content": content})
            
        # Append latest question with context
        messages.append({"role": "user", "content": prompt})
        
        selected_model = "llama-3.1-8b-instant"
        if model:
            model_lower = model.lower()
            if "70b" in model_lower or "versatile" in model_lower:
                selected_model = "llama-3.3-70b-versatile"
                
        # 7. Call LLM
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=selected_model,
            temperature=0.2,
            max_tokens=1500
        )
        
        answer = chat_completion.choices[0].message.content.strip()
        return {"answer": answer}
        
    except Exception as e:
        print("[RAG Engine Error] Pipeline failed:", e)
        return {
            "error": "Query failed",
            "message": str(e)
        }
