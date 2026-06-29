import os
from langchain_community.vectorstores import FAISS
from app.rag.embeddings import embeddings

def get_user_vector_path(user_id: int) -> str:
    # Organize user vector stores under a centralized folder
    return f"vector_db_user_{user_id}"


def save_vector_store(chunks, user_id: int):
    """
    Create and save user-scoped FAISS vector database
    """
    path = get_user_vector_path(user_id)
    print(f"[VS] Creating vector store for user {user_id}...")

    db = FAISS.from_documents(chunks, embeddings)
    db.save_local(path)

    print(f"[VS] Vector store saved at: {path}")
    return db


def load_vector_store(user_id: int):
    """
    Load user-scoped FAISS vector database
    """
    path = get_user_vector_path(user_id)
    if not os.path.exists(path):
        print(f"[VS] Vector store not found for user {user_id}")
        return None

    print(f"[VS] Loading vector store for user {user_id}...")

    db = FAISS.load_local(
        path,
        embeddings,
        allow_dangerous_deserialization=True
    )

    print(f"[VS] Vector store loaded for user {user_id}")
    return db