from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import os
import json
import shutil
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.utils.auth import get_verified_user

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangchainDocument

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class AnalyzeRequest(BaseModel):
    filename: str


def extract_text_from_file(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            text = "\n".join([doc.page_content for doc in documents])
            return text, len(documents)
        except Exception as e:
            print("PDF extraction failed:", e)
            return "", 0
    elif ext in [".txt", ".md"]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            return text, 1
        except Exception as e:
            print("TXT extraction failed:", e)
            return "", 0
    else:
        return "", 0


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    try:
        # Save file to user-scoped folder
        user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
        os.makedirs(user_upload_dir, exist_ok=True)
        file_path = os.path.join(user_upload_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Load file content
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
            documents = loader.load()
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            documents = [LangchainDocument(page_content=content, metadata={"source": file_path})]

        # Split text into chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        chunks = splitter.split_documents(documents)

        # Save to user-scoped vector store database
        from app.rag.vector_store import save_vector_store
        save_vector_store(chunks, current_user.id)

        # Save metadata for active file state tracking
        meta_path = os.path.join(user_upload_dir, f"{file.filename}.meta.json")
        meta_data = {
            "filename": file.filename,
            "chunks": len(chunks),
            "uploaded_at": datetime.utcnow().isoformat()
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, indent=2)

        # Save record to Database
        db_doc = db.query(Document).filter(
            Document.filename == file.filename,
            Document.user_id == current_user.id
        ).first()
        
        if not db_doc:
            db_doc = Document(
                user_id=current_user.id,
                filename=file.filename,
                filepath=file_path,
                uploaded_at=datetime.utcnow()
            )
            db.add(db_doc)
        else:
            db_doc.uploaded_at = datetime.utcnow()
        db.commit()

        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "chunks": len(chunks),
            "vector_store": "created"
        }

    except Exception as e:
        return {
            "message": "Upload failed",
            "error": str(e)
        }


@router.post("/analyze")
async def analyze_file(
    request: AnalyzeRequest,
    current_user: User = Depends(get_verified_user)
):
    filename = request.filename
    user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
    file_path = os.path.join(user_upload_dir, filename)

    if not os.path.exists(file_path):
        return {"error": "File not found", "message": f"File {filename} does not exist."}

    # Check cached report first
    report_cache_path = os.path.join(user_upload_dir, f"{filename}.report.json")
    if os.path.exists(report_cache_path):
        try:
            with open(report_cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Failed to read cached report:", e)

    text, pages = extract_text_from_file(file_path)
    if not text:
        return {"error": "Extraction failed", "message": "Failed to extract text from file."}

    # Limit text size for the API prompt
    if len(text) > 25000:
        text_content = text[:18000] + "\n\n... [TRUNCATED FOR ANALYSIS] ...\n\n" + text[-7000:]
    else:
        text_content = text

    prompt = f"""You are an expert document analysis system.
Analyze the provided document text and generate a structured Document Analysis Report.
You must return a JSON object with the following fields:
{{
  "type": "Document Type (e.g., PDF Document, Research Paper, Financial Report, Text File)",
  "pages": "Number of pages (e.g., 5 pages, 1 page)",
  "language": "Primary language of the document (e.g., English, Spanish)",
  "executive_summary": "A comprehensive 2 to 5 paragraph summary of the document, explaining the main background, context, and key findings.",
  "main_topics": [
    "Topic 1 Name",
    "Topic 2 Name",
    "Topic 3 Name",
    "Topic 4 Name"
  ],
  "detailed_analysis": [
    {{
      "topic": "Topic 1 Name",
      "key_points": [
        "Key Point 1 of Topic 1",
        "Key Point 2 of Topic 1",
        "Key Point 3 of Topic 1"
      ],
      "findings": "Details about findings, discoveries, or data related to Topic 1."
    }},
    {{
      "topic": "Topic 2 Name",
      "key_points": [
        "Key Point 1 of Topic 2",
        "Key Point 2 of Topic 2",
        "Key Point 3 of Topic 2"
      ],
      "findings": "Details about findings, discoveries, or data related to Topic 2."
    }}
  ],
  "data_statistics": [
    {{
      "metric": "Metric or Item 1 name",
      "value": "Value or statistics for Item 1"
    }},
    {{
      "metric": "Metric or Item 2 name",
      "value": "Value or statistics for Item 2"
    }},
    {{
      "metric": "Metric or Item 3 name",
      "value": "Value or statistics for Item 3"
    }}
  ],
  "key_insights": [
    "Key Insight 1 from the document",
    "Key Insight 2 from the document",
    "Key Insight 3 from the document",
    "Key Insight 4 from the document"
  ],
  "risks_limitations": [
    "Limitation, risk, or boundary 1",
    "Limitation, risk, or boundary 2",
    "Limitation, risk, or boundary 3"
  ],
  "recommendations": [
    "Recommendation 1 (specific, actionable)",
    "Recommendation 2 (specific, actionable)",
    "Recommendation 3 (specific, actionable)"
  ],
  "conclusion": "A professional concluding statement of 1-2 paragraphs summarizing the document's value and impact.",
  "quick_takeaways": [
    "Most important takeaway point",
    "Second important takeaway point",
    "Third important takeaway point",
    "Fourth important takeaway point"
  ]
}}

Document Text:
{text_content}
"""

    try:
        from app.rag.pipeline import client

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional document analysis agent. You analyze the text and output ONLY a valid JSON object matching the requested schema."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=3000
        )

        response_text = chat_completion.choices[0].message.content
        report_data = json.loads(response_text)

        # Ensure pages field is populated if pages count was detected from loader
        if pages > 0 and (not report_data.get("pages") or report_data.get("pages") == "unknown" or report_data.get("pages") == ""):
            report_data["pages"] = f"{pages} page{'s' if pages > 1 else ''}"

        # Cache the report
        try:
            with open(report_cache_path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
        except Exception as cache_err:
            print("Failed to write report cache:", cache_err)

        return report_data

    except Exception as e:
        print("Analysis generation failed:", e)
        return {
            "error": "Analysis failed",
            "message": str(e)
        }


class QueryRequest(BaseModel):
    question: str
    history: list = []


@router.post("/query")
async def query_document(
    request: QueryRequest,
    current_user: User = Depends(get_verified_user)
):
    question = request.question.strip()
    if not question:
        return {"error": "Empty question", "message": "Please provide a question."}

    from app.rag.vector_store import load_vector_store
    db = load_vector_store(current_user.id)
    if db is None:
        return {"error": "No database found", "message": "Please upload a document first to index it."}

    try:
        from app.rag.rag_engine import query_rag
        res = query_rag(question, current_user.id, history=request.history)
        return res
    except Exception as e:
        print("Document query failed:", e)
        return {"error": "Query failed", "message": str(e)}


@router.get("/active")
async def get_active_document(
    current_user: User = Depends(get_verified_user)
):
    """
    Retrieve details of the active (most recently uploaded) document for the user.
    """
    user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
    if not os.path.exists(user_upload_dir):
        return {"active": False}

    meta_files = [f for f in os.listdir(user_upload_dir) if f.endswith(".meta.json")]
    if not meta_files:
        return {"active": False}

    latest_meta = None
    latest_time = 0

    for f in meta_files:
        path = os.path.join(user_upload_dir, f)
        mtime = os.path.getmtime(path)
        if mtime > latest_time:
            latest_time = mtime
            latest_meta = path

    if latest_meta:
        try:
            with open(latest_meta, "r", encoding="utf-8") as file:
                data = json.load(file)
                # Check if the actual file also exists
                actual_file = os.path.join(user_upload_dir, data["filename"])
                if os.path.exists(actual_file):
                    return {"active": True, **data}
        except Exception as e:
            print("Failed to read active meta:", e)

    return {"active": False}


@router.get("/report")
async def get_document_report(
    filename: str,
    current_user: User = Depends(get_verified_user)
):
    """
    Retrieve the cached analysis report for a file if it exists.
    """
    user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
    report_path = os.path.join(user_upload_dir, f"{filename}.report.json")
    if os.path.exists(report_path):
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return {"error": "Read failed", "message": str(e)}
    return {"error": "Not found", "message": "No report exists for this file."}


@router.post("/clear")
async def clear_active_document(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """
    Delete all uploaded documents, metadata, and reset the FAISS vector database for the current user.
    """
    user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{current_user.id}")
    try:
        # Clear user's uploads folder
        if os.path.exists(user_upload_dir):
            shutil.rmtree(user_upload_dir)
            os.makedirs(user_upload_dir, exist_ok=True)
        
        # Clear user's FAISS vector db folder
        from app.rag.vector_store import get_user_vector_path
        user_vector_path = get_user_vector_path(current_user.id)
        if os.path.exists(user_vector_path):
            shutil.rmtree(user_vector_path)
            
        # Delete documents from DB
        db.query(Document).filter(Document.user_id == current_user.id).delete()
        db.commit()

        return {"message": "All documents and vector stores cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": "Clear failed", "message": str(e)}