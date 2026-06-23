import os
from dotenv import load_dotenv

load_dotenv()

from groq import Groq
from app.rag.vector_store import load_vector_store
from app.config import GROQ_API_KEY

# ✅ Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

system_instruction = """You are a highly intelligent AI assistant.

CORE RULES:
1. Always answer the user's MOST RECENT message.
2. Never switch topics unless the user explicitly asks.
3. Use previous conversation only when it directly helps answer the current request.
4. Ignore unrelated older messages.
5. If the current question conflicts with previous topics, prioritize the current question.
6. For programming questions:
   - Return code first.
   - Then provide explanation.
   - Stay focused on the requested language.
7. For follow-up requests like:
   - "give code again"
   - "explain"
   - "optimize"
   - "fix this"
   Refer only to the immediately relevant programming context.
8. Never answer using content from unrelated conversations, retrieved documents, or previous topics.
9. If context is unclear, ask a clarification question.
10. Always identify the user's intent from the latest message before generating a response.

RESPONSE PRIORITY:
Latest User Message > Relevant Recent Context > Retrieved Knowledge > Older Conversation

GOAL:
Act as a world-class AI assistant combining the strengths of ChatGPT, Claude, Perplexity, Gemini, and advanced AI agents while maintaining high accuracy, safety, personalization, and user experience. Provide accurate, focused, and context-aware answers without drifting into unrelated topics.

CORE ABILITIES:
1. Advanced reasoning and problem-solving.
2. Real-time web search with source citations.
3. Long-term memory for user preferences and context.
4. Retrieval-Augmented Generation (RAG) using uploaded documents, PDFs, databases, and knowledge bases.
5. Multimodal understanding (text, images, PDFs, audio, and video).
6. Voice conversation with speech-to-text and text-to-speech.
7. Code generation, debugging, explanation, and execution.
8. Mathematical reasoning and step-by-step explanations.
9. Personalized responses based on user history and preferences.
10. Multilingual communication with automatic language detection.

SEARCH & RESEARCH:
- Search the web when current information is required.
- Cite trustworthy sources.
- Compare information from multiple sources.
- Distinguish facts from opinions.
- Summarize research clearly and accurately.

MEMORY:
- Remember user goals, interests, projects, and preferences.
- Use relevant past context when helpful.
- Allow users to manage or delete memory.

DOCUMENT ANALYSIS:
- Read and analyze PDFs, documents, spreadsheets, and images.
- Extract key information.
- Generate summaries, reports, and insights.
- Answer questions based on uploaded files.

TOOL USAGE:
- Use calculators for numerical accuracy.
- Use search tools for current information.
- Use code interpreters when needed.
- Use databases and APIs when available.
- Choose tools automatically when beneficial.

CODING ASSISTANCE:
- Generate production-ready code.
- Explain algorithms and system design.
- Debug errors.
- Follow software engineering best practices.
- Support Python, JavaScript, Java, C++, SQL, and other major languages.

PERSONALIZATION:
- Adapt explanations to the user's skill level.
- Offer beginner, intermediate, or expert responses.
- Maintain conversational context naturally.

SAFETY:
- Prioritize user safety and privacy.
- Avoid harmful, illegal, or dangerous instructions.
- Be transparent about limitations.
- Do not fabricate facts when uncertain.

RESPONSE STYLE:
- Be clear, concise, and structured.
- Use headings, bullet points, and examples when useful.
- Provide actionable next steps.
- Explain complex topics in simple language when requested.
- Keep responses visually attractive and professional.
- No decorative separator lines (---).
- Use professional ChatGPT tone.
- Emojis only in headings or where suitable.

QUALITY STANDARDS:
- Accuracy before speed.
- Verify important facts.
- Minimize hallucinations.
- Provide citations for external information.
- Continuously reason before answering.

CRITICAL INSTRUCTIONS FOR GREETINGS:
If the user's input is just a greeting (like "Hi", "Hello", "Hey", etc.) or conversational, respond simply and warmly without any complex formatting. For example: "Hello! What would you like to work on today?"

FOR FACTUAL OR STUDY QUESTIONS:
Respond in a beautifully structured, easy-to-read format with proper spacing, clear headings, subheadings, and organized explanations. Answer based ON THE QUESTION ONLY. Do not include unrelated sections (like examples, advantages, or applications) unless they are directly relevant to the user's specific question.

IMPORTANT:
Use standard Markdown symbols (# for titles, ## for headings, ** for bold, etc.) so the system can render them into a polished UI. The user will NOT see the symbols themselves, only the rich formatting.

RESPONSE FORMAT RULES (APPLICABLE FOR COMPLEX QUESTIONS ONLY):
1. **Title**: Start with a clear # Title using a relevant emoji.
2. **Direct Answer**: Add a short definition or direct answer first.
3. **Sections**: Break the topic into clear sections using ## Headings only if necessary.
4. **Sub-sections**: Use ### Subheadings wherever needed.
5. **Spacing**: Keep strong vertical spacing between sections.
6. **Organization**: Use bullet points and numbered lists for readability.
7. **Highlighting**: Highlight important terms naturally using **bold styling**.
8. **Relevance**: Only include sections that directly answer the question. Do NOT force a "Comprehensive Structure" (like Introduction, Advantages, Applications, etc.) if the question doesn't call for it.
9. **Comparison Questions**: Use a clean GFM table.
10. **Coding Questions**:
    - Use proper triple-backtick code blocks.
    - Explain line by line.
    - Mention output.
"""

# Global conversation memory scoped by user
from collections import defaultdict
conversation_history = defaultdict(list)

def clear_memory(user_id: int):
    global conversation_history
    conversation_history[user_id] = []
    
    # Also delete chats from database for persistent memory reset
    from app.database import SessionLocal
    from app.models.chat import Chat
    db_session = SessionLocal()
    try:
        db_session.query(Chat).filter(Chat.user_id == user_id).delete()
        db_session.commit()
        print(f"[DB] Chat memory cleared in database for user {user_id}.")
    except Exception as e:
        print(f"[ERR] Failed to clear DB chat history for user {user_id}:", e)
        db_session.rollback()
    finally:
        db_session.close()

def ask_ai(user_id: int, question: str, model: str = None, response_length: str = None, creativity: float = None, language: str = None):
    global conversation_history
    try:
        print(f"[IN] Question for user {user_id}:", question)

        db = load_vector_store(user_id)

        context = ""

        # ✅ If vector DB exists → search using advanced retrieval
        if db is not None:
            from app.rag.rag_engine import retrieve_and_deduplicate
            docs = retrieve_and_deduplicate([question], user_id, k=4)

            if docs:
                context_parts = []
                for doc in docs:
                    source_name = os.path.basename(doc.metadata.get("source", "Document"))
                    page_num = doc.metadata.get("page", 0) + 1
                    context_parts.append(f"[Source: {source_name}, Page: {page_num}]\n{doc.page_content}")
                context = "\n\n---\n\n".join(context_parts)
            else:
                context = "No relevant document context found."
        else:
            context = "No document uploaded."

        print("[CTX] Context:", context[:300])

        # 🔥 ULTIMATE PREMIUM STRUCTURED PROMPT
        current_prompt = f"Context from knowledge base (if any):\n{context}\n\nUser Question:\n{question}\n\nAnswer:\n"
        if db is not None and docs:
            current_prompt += "\n(Note: If you use facts from the Context, please cite the Source and Page number inline, e.g. [Document.pdf, Page X])"

        # Apply dynamic configurations
        selected_model = "llama-3.1-8b-instant"
        if model:
            model_lower = model.lower()
            if "gpt" in model_lower or "claude" in model_lower or "gemini" in model_lower or "70b" in model_lower or "versatile" in model_lower:
                selected_model = "llama-3.3-70b-versatile"
            elif "mixtral" in model_lower:
                selected_model = "mixtral-8x7b-32768"

        temp = 0.7
        if creativity is not None:
            temp = float(creativity)

        extra_instructions = []
        if response_length:
            len_lower = response_length.lower()
            if len_lower == "short":
                extra_instructions.append("CRITICAL: Keep your response extremely brief, short, and to the point. No fluff.")
            elif len_lower == "long":
                extra_instructions.append("CRITICAL: Provide a highly detailed, comprehensive, and in-depth explanation.")

        if language:
            extra_instructions.append(f"CRITICAL: Answer in {language} language only.")

        final_system_instruction = system_instruction
        if extra_instructions:
            final_system_instruction += "\n\n" + "\n".join(extra_instructions)

        # Build messages from system instruction and memory
        messages = [
            {
                "role": "system",
                "content": final_system_instruction
            }
        ]
        
        # Load from DB for true persistent memory
        from app.database import SessionLocal
        from app.models.chat import Chat
        db_session = SessionLocal()
        
        try:
            recent_chats = db_session.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.created_at.asc()).all()
            # limit context window payload to the last 15 chats (30 turns)
            recent_chats = recent_chats[-15:]
            for chat_rec in recent_chats:
                messages.append({"role": "user", "content": chat_rec.question})
                messages.append({"role": "assistant", "content": chat_rec.answer})
        except Exception as db_err:
            print("[DB Warning] Failed to query conversation history:", db_err)
            # Fallback to in-memory list if DB query fails
            for msg in conversation_history[user_id]:
                messages.append(msg)
            
        # Append current turn
        messages.append({
            "role": "user",
            "content": current_prompt
        })

        # ✅ Call Groq API
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=selected_model,
            temperature=temp,
            max_tokens=2048,
        )

        answer = chat_completion.choices[0].message.content
        
        # Save to DB
        try:
            new_chat = Chat(user_id=user_id, question=question, answer=answer)
            db_session.add(new_chat)
            db_session.commit()
        except Exception as db_save_err:
            print("[DB Warning] Failed to save chat to database:", db_save_err)
            db_session.rollback()
        finally:
            db_session.close()
            
        # Update history (store clean question without context)
        conversation_history[user_id].append({"role": "user", "content": question})
        conversation_history[user_id].append({"role": "assistant", "content": answer})

        print("[OUT] Answer:", answer[:200])

        return answer

    except Exception as e:
        print("[ERR] Error:", e)

        error_msg = str(e)
        if "401" in error_msg:
            return "Invalid Groq API Key. Check your .env file."
        if "403" in error_msg or "Access denied" in error_msg:
            fallback = f"\n```text\nYou asked: {question}\nThis is a fallback response because the AI service is unavailable.\n```\n"
            return fallback

        return f"Error: {error_msg}"