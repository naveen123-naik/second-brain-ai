# 🌍 Second Brain AI - Deployment Guide

This guide walks you through deploying the **Second Brain AI** application to production. 

Following the standard and most robust design pattern for this tech stack (due to Python serverless size limitations for ML dependencies like HuggingFace and FAISS):
*   **React Frontend**: Hosted on **Vercel**
*   **FastAPI Backend**: Hosted on **Render** (or **Railway**)
*   **Vector & PostgreSQL Databases**: Hosted on **Railway** or **Supabase**

---

## 1️⃣ PostgreSQL Database Setup

Your production backend needs a hosted PostgreSQL database.

### Option A: Railway (Quickest)
1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project** -> **Provision PostgreSQL**.
3. Once created, click on the **Postgres** service card, go to the **Variables** tab, and copy the `DATABASE_URL`.

### Option B: Supabase (Free Tier)
1. Go to [supabase.com](https://supabase.com) and create a project.
2. Go to **Project Settings** -> **Database**.
3. Copy the **URI** connection string under **Connection string** (make sure to replace `[YOUR-PASSWORD]` with your database password).

---

## 2️⃣ FastAPI Backend Deployment (Render or Railway)

Deploying the FastAPI backend to a service that supports persistent containers is crucial for running Python ML models and writing FAISS vectors.

### Option A: Hosting on Render
1. Go to [render.com](https://render.com) and log in.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   *   **Name**: `second-brain-api`
   *   **Runtime**: `Python 3`
   *   **Root Directory**: `backend` *(Very Important)*
   *   **Build Command**: `pip install -r requirements.txt`
   *   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Go to the **Environment** tab and add the following Env Variables:
   *   `DATABASE_URL` = (Your hosted Postgres connection string from Step 1)
   *   `GROQ_API_KEY` = (Your Groq API key)
   *   `OPENAI_API_KEY` = (Your OpenAI API key)
   *   `ELEVENLABS_API_KEY` = (Optional, ElevenLabs Voice API key)
6. Click **Deploy Web Service**.
7. Once deployed, copy the **Service URL** (e.g., `https://second-brain-api.onrender.com`).

---

## 3️⃣ React Frontend Deployment (Vercel)

Now we deploy the frontend to Vercel and connect it to your hosted backend.

### Deploying via Vercel Web Dashboard
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Connect your GitHub repository.
4. Configure the project settings:
   *   **Framework Preset**: `Vite`
   *   **Root Directory**: Click *Edit* and select the `frontend` folder *(Very Important)*
   *   **Build Command**: `npm run build`
   *   **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add:
   *   **Key**: `VITE_API_URL`
   *   **Value**: `https://second-brain-api.onrender.com` (Your Render/Railway Backend URL from Step 2)
6. Click **Deploy**.

---

## 4️⃣ Update Google API Redirect URIs (Optional)

If you are using Google Calendar and Gmail integrations:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services** -> **Credentials**.
3. Edit your OAuth 2.0 Client ID.
4. Under **Authorized redirect URIs**, add your production frontend domain (e.g., `https://second-brain-ai.vercel.app/oauth2callback`).
5. Update the `client_secret.json` credentials configuration in your backend deployment if needed.

---

## 5️⃣ Production Network & Global Accessibility Checklist

To ensure your application is accessible globally from any network, device, and location, follow this checklist for hosting configurations and environment settings.

### Hosting & Network Requirements
1. **0.0.0.0 Server Binding:** Make sure your backend server binds to `0.0.0.0` (not `127.0.0.1` or `localhost`) to accept connections from external networks.
   - For Docker: The CMD in `Dockerfile` is pre-configured with `"--host", "0.0.0.0"`.
   - For manual web services: The start command must be `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
2. **Reverse Proxy & HTTPS:** 
   - Ensure the server is behind a reverse proxy (e.g. Render's Load Balancer, Vercel router) that terminates SSL certificates (HTTPS) and forwards traffic to the backend.
   - If running Uvicorn manually, add the `--proxy-headers` flag so Uvicorn properly trusts forwarding headers (like `X-Forwarded-Proto`).
3. **Open Ports:** Verify hosting provider firewalls allow incoming traffic on standard public web ports:
   - **Port 80** (HTTP) - auto-redirected to HTTPS by the reverse proxy
   - **Port 443** (HTTPS) - secure communication

### CORS & Cookies Configuration
When hosting the React frontend and FastAPI backend on separate domains (e.g., `https://second-brain-ai.vercel.app` and `https://second-brain-api.onrender.com`), configure these parameters:
1. **`ENV` environment variable:** Set to `production` on your hosting dashboard. This automatically activates secure SameSite=None cookie behaviors.
2. **`FRONTEND_URL` environment variable:** Add your deployment frontend URL (e.g. `https://second-brain-ai.vercel.app`).
   - For multiple frontends (e.g. production and staging), set them as a comma-separated list: `https://my-app.vercel.app,https://my-app-staging.vercel.app`.
   - Localhost origins are automatically excluded in production mode for server-side security.

### Troubleshooting Network Errors
* **CORS Policy Violations:** If the browser console raises "CORS blocked" errors:
  - Check the backend logs. Our middleware logs detailed CORS warnings (`CORS validation warning: Origin '...' is not in allowed origins list`).
  - Make sure the domain in the error matches what you set in the `FRONTEND_URL` env variable exactly (without trailing slashes).
* **Login Fails on Production (Cookie loops):**
  - Verify that the backend has `ENV=production` set. If it is unset or set to `development`, the backend will issue cookies with `SameSite=Lax` and `Secure=False` over plain HTTP, which modern browsers reject when originating from cross-site frontend hosts.
* **Database Connection Issues:**
  - SQLAlchemy requires `postgresql://` protocol. If your DB provider (e.g. Render/Railway) provides a URI starting with `postgres://`, our config dynamically normalizes it, but verify database credentials and network permissions (e.g., allow external access/any IP on Supabase database).

