# Deployment Guide for Uni-Pool

To make your application accessible to the world with an official link (like `https://unipool.onrender.com`), follow this guide to deploy your app to **Render** (a free and popular hosting provider).

## Prerequisites

1.  **GitHub Account**: You need a GitHub account to store your code.
2.  **Render Account**: You need a free account at [render.com](https://render.com).

## Step 1: Push Code to GitHub

Since you are running this locally, you first need to put your code on GitHub.

1.  **Initialize Git** (if not already done):
    Open a new terminal in your project root (`c:\Users\Lokesh\OneDrive\Desktop\uni-pool-project`) and run:
    ```bash
    git init
    git add .
    git commit -m "Initial commit - Full Stack App"
    ```

2.  **Create a Repository on GitHub**:
    *   Go to [GitHub.com](https://github.com/new).
    *   Create a new repository name `uni-pool-project`.
    *   Make it **Public** (or Private, Render supports both).
    *   Do **NOT** initialize with README or .gitignore (you have these).

3.  **Push to GitHub**:
    *   Copy the commands GitHub gives you under "…or push an existing repository from the command line". It looks like this:
    ```bash
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/uni-pool-project.git
    git push -u origin main
    ```

## Step 2: Deploy to Render

1.  Log in to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account and select your `uni-pool-project` repository.
4.  Configure the service:
    *   **Name**: `uni-pool` (or whatever you like)
    *   **Region**: Choose the one closest to you (e.g., Singapore or Oregon).
    *   **Branch**: `main`
    *   **Root Directory**: Leave blank (it's the root).
    *   **Runtime**: `Node`
    *   **Build Command**: `npm run build`
        *   *(This will run the script we added: installs backend/frontend deps and builds the React app)*
    *   **Start Command**: `node backend/server.js`
        *   *(Example: `node backend/server.js` starts the API which also serves the frontend)*

5.  **Environment Variables**:
    You MUST add your `.env` secrets here so the live server works.
    Click **"Advanced"** or scroll to **"Environment Variables"** and add:
    
    | Key | Value |
    | :--- | :--- |
    | `NODE_ENV` | `production` |
    | `MONGO_URI` | *Your actual MongoDB Connection String* |
    | `JWT_SECRET` | `UNI_POOL_SECRET_KEY_123` (or a secure random string) |
    | `REACT_APP_GOOGLE_MAPS_API_KEY` | *Your Google Maps API Key* |

6.  Click **Create Web Service**.

## Step 3: Success!

Render will now:
1.  Clone your code.
2.  Run `npm run build` (installing everything).
3.  Start your server with `node backend/server.js`.

Once complete, you will get a link like: **https://uni-pool.onrender.com**

This link is permanent, secure (HTTPS), and accessible from anywhere in the world!
