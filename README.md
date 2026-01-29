# UNI POOL - Setup Instructions

## Prerequisites
- Node.js installed
- MongoDB installed and running locally on default port (27017)

## Installation & Setup

1.  **Backend Setup**
    Open a terminal and navigate to the `backend` folder:
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file (already created) with:
    ```
    NODE_ENV=development
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/uni-pool
    JWT_SECRET=UNI_POOL_SECRET_KEY_123
    ```
    Start the backend server:
    ```bash
    npm run dev
    # OR
    node server.js
    ```

2.  **Frontend Setup**
    Open a *new* terminal and navigate to the `frontend` folder:
    ```bash
    cd frontend
    npm install
    npm start
    ```

3.  **Usage**
    - Open your browser at `http://localhost:3000`.
    - Register a new account.
    - Login to access the dashboard.
    - Create a ride or search for existing rides.

## Project Structure
- `backend/`: API server, Database models, Authentication logic.
- `frontend/`: React application, User Interface, Client-side logic.

## Technologies Used
- **MERN Stack**: MongoDB, Express.js, React.js, Node.js
- **Styling**: Tailwind CSS
- **Authentication**: JSON Web Tokens (JWT)
