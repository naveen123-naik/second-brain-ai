# 🧠 Second Brain AI

AI Personal Knowledge Agent that remembers, organizes, and answers questions from your personal data using RAG and OpenAI.

---

## 🚀 Overview

Second Brain AI is a full-stack AI application that acts as a **personal knowledge assistant**.

It allows users to:

* Upload PDFs and documents
* Chat with personal knowledge
* Use voice assistant
* Read emails
* View calendar events
* Get AI-generated insights
* Store memory using RAG pipeline

This project demonstrates **GenAI, RAG, FastAPI, React, OpenAI, FAISS, PostgreSQL, and Google APIs**.

---

## 🧠 Features

### 📄 Document Upload

Upload PDFs and create embeddings.

### 💬 AI Chat

Ask questions from personal knowledge.

### 🎤 Voice Assistant

Speak and get AI responses.

### 📧 Email Integration

Fetch Gmail emails.

### 📅 Calendar Integration

Fetch Google Calendar events.

### 🔍 Semantic Search

AI retrieves relevant knowledge using RAG.

### 🧾 Auto Summaries

AI summarizes documents and emails.

---

## 🏗 Tech Stack

### Backend

* FastAPI
* OpenAI
* LangChain
* FAISS
* PostgreSQL
* Whisper
* ElevenLabs
* Google APIs

### Frontend

* React
* Vite
* Tailwind
* Axios
* React Router

### AI

* RAG Pipeline
* OpenAI GPT
* Embeddings
* Vector Database

### Deployment

* Docker
* Render / Railway
* Vercel

---

## 📁 Project Structure

```
second-brain-ai

backend
    app
        main.py
        config.py
        database.py
        rag
        routes
        services
        models

frontend
    src
        api
        components
        pages

docker-compose.yml
README.md
```

---

## ⚙️ Setup

### 1️⃣ Clone Repository

```
git clone https://github.com/your-username/second-brain-ai
cd second-brain-ai
```

---

### 2️⃣ Backend Setup

```
cd backend
pip install -r requirements.txt
```

Create `.env`

```
OPENAI_API_KEY=your_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/secondbrain
ELEVENLABS_API_KEY=your_key
```

Run:

```
uvicorn app.main:app --reload
```

---

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 🐳 Docker Setup

```
docker-compose up --build
```

---

## 🔐 Google API Setup

1. Open Google Cloud Console
2. Create project
3. Enable Gmail API
4. Enable Calendar API
5. Create OAuth credentials
6. Download client_secret.json
7. Place inside backend folder

---

## 🌍 Deployment

### Backend

Render / Railway

### Frontend

Vercel

---

## 📸 Screenshots

Add screenshots here:

```
dashboard.png
chat.png
upload.png
voice.png
email.png
calendar.png
```

---

## 🧪 API Endpoints

```
POST /upload
POST /chat
POST /voice
GET /email
GET /calendar
```

---

## 💼 Resume Project Description

AI Personal Knowledge Agent (Second Brain AI)

Built a full-stack AI assistant using FastAPI, React, and OpenAI with RAG pipeline to store and retrieve personal knowledge. Implemented document upload, semantic search, voice assistant, Gmail and Google Calendar integration, and vector database using FAISS.

---

## 🧠 Future Improvements

* AI Agent
* Multi-user support
* Authentication
* Memory graph
* Notion integration
* Slack integration
* Mobile app

---

## 👨‍💻 Author

Contributor

---

## ⭐ Star the Repository

If you like this project, give it a star.
