# 🚀 Ultimate Deployment Guide: Uni-Pool

This guide allows you to deploy your project permanently with a professional split architecture:
- **Frontend** on Vercel (Fast, Global CDN)
- **Backend** on Render (Reliable API Hosting)

---

## ✅ Phase 1: Deploy Backend (Render)

1.  **Push your latest code to GitHub** needed to contain the new `render.yaml` file.
    ```bash
    git add .
    git commit -m "Added deployment configs"
    git push origin main
    ```

2.  **Go to [Render Dashboard](https://dashboard.render.com/)**.
3.  Click **New +** -> **Blueprint**.
4.  Connect your `uni-pool` repository.
5.  Render will automatically detect the `render.yaml` file.
6.  It will ask for environment variables. Fill them in:
    *   `MONGO_URI`: (Your full MongoDB Connection String)
    *   `JWT_SECRET`: (Any secret password)
7.  Click **Apply**.
8.  **Wait** for the deployment to finish (~2-5 mins).
9.  **Copy your Backend URL**. It will look like: `https://uni-pool-backend.onrender.com`.

---

## ✅ Phase 2: Deploy Frontend (Vercel)

1.  **Before you start**:
    *   Open `frontend/vercel.json`.
    *   Replace `https://uni-pool-backend.onrender.com` with **YOUR ACTUAL BACKEND URL** from Phase 1.
    *   Commit and push this change:
        ```bash
        git add frontend/vercel.json
        git commit -m "Update backend URL for production"
        git push origin main
        ```

2.  **Go to [Vercel Dashboard](https://vercel.com/new)**.
3.  **Import** your `uni-pool` repository.
4.  **Configure Project**:
    *   **Root Directory**: Click "Edit" and select `frontend`.
    *   **Framework Preset**: Create React App (should be auto-detected).
    *   **Build Command**: `npm run build` (default).
5.  **Environment Variables**:
    *   Add `REACT_APP_API_URL` -> Set value to **YOUR BACKEND URL** (e.g., `https://uni-pool-backend.onrender.com/api`).
        *(Note: `vercel.json` handles rewrites, but setting this variable ensures the code knows where to point cleanly).*
6.  Click **Deploy**.

---

## 🌍 Success!
You now have two links:
*   **The App**: `https://uni-pool-frontend.vercel.app` (Share this one!)
*   **The API**: `https://uni-pool-backend.onrender.com`

### How Local Development Works Now
*   **Run Backend**: `cd backend && npm run dev` (Port 5000)
*   **Run Frontend**: `cd frontend && npm start` (Port 3000)
    *   The frontend now proxies requests to Port 5000 automatically.
    *   No more CORS errors!
