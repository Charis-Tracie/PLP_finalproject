# MindCare AI - Mental Health Chatbot 

A compassionate AI-driven mental health chatbot with a modern interface, secure backend, and helpful mental‑wellness tools.

---

## Features

### **Frontend**

* Beautiful gradient UI with dark/light mode

   Real‑time chat interface
*  Mood tracking with an emoji selector
*  Session history & analytics
* 📱Fully responsive design
*  Privacy‑focused layout

### **Backend**

*  User authentication (JWT)
*  MongoDB database integration
*  Message persistence
*  Mood logging & statistics
*  AI response system
*  Security features (CORS, Helmet, Rate Limiting)

---

## Installation

### **Prerequisites**

* Node.js (v16+)
* MongoDB (local or cloud via Atlas)
* npm or yarn

---

## **Step 1: Clone the Project**

```bash
# Create project directory
mkdir mindcare-ai
cd mindcare-ai
```

---

## **Step 2: Project Structure**

```
mindcare-ai/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── .env
├── package.json
└── README.md
```

Copy the provided code into the appropriate files.

---

## **Step 3: Install Dependencies**

```bash
npm install
```

Dependencies include:

* express
* mongoose
* bcryptjs
* jsonwebtoken
* cors
* dotenv
* helmet
* express-rate-limit

---

## **Step 4: Configure Environment Variables**

Create/edit the `.env` file:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mindcare
JWT_SECRET=your-super-secret-key
```

Replace `JWT_SECRET` with a strong value in production.

---

## **Step 5: Set Up MongoDB**

### **Option A: Local MongoDB**

Start MongoDB locally:

```bash
mongod
```

### **Option B: MongoDB Atlas**

1. Create an account at MongoDB Atlas
2. Create a cluster
3. Get the connection string
4. Update `.env`:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindcare
```

---

## **Step 6: Start the Server**

```bash
npm run dev   # Development mode
npm start     # Production mode
```

Server runs at: [**http://localhost:5000**](http://localhost:5000)

---

## **Step 7: Access the Application**

Open your browser:

```
http://localhost:5000
```

---

## 📁 Project Structure (Detailed)

```
mindcare-ai/
├── public/              # Frontend files
│   ├── index.html       # Main UI
│   ├── styles.css       # Styles
│   └── app.js           # Frontend logic
├── server.js            # Backend server
├── .env                 # Environment variables
├── package.json         # Dependencies
└── README.md            # Documentation
```

---

## 🔌 API Endpoints

### **Authentication**

* `POST /api/auth/register` — Register user
* `POST /api/auth/login` — Login

### **Messages**

* `GET /api/messages` — Fetch user messages
* `POST /api/messages` — Save a message
* `POST /api/messages/ai-response` — AI reply
* `DELETE /api/messages` — Clear messages

### **Sessions**

* `GET /api/sessions`
* `POST /api/sessions`

### **Moods**

* `GET /api/moods`
* `POST /api/moods`
* `GET /api/moods/stats`

### **User**

* `GET /api/user/profile`
* `PUT /api/user/profile`

---

##  Security Features

* JWT Authentication
* Password hashing (bcrypt)
* CORS configuration
* Helmet security headers
* Rate Limiting
* Input validation & sanitization

---

##  Customization

### **Change Colors** (in `styles.css`):

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --mood-happy: #48bb78;
}
```

### **Add More AI Responses**

Modify `generateAIResponse()` in `server.js`.

### **Use Real AI (OpenAI/Claude)**

Add your API keys to `.env`, then replace the mock response function with:

**OpenAI:**

```js
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**Claude:**

```js
const Anthropic = require('@anthropic-ai/sdk');
```

---

## 📊 Database Schema

### **Users**

```json
{
  "name": "String",
  "email": "String",
  "password": "String",
  "createdAt": "Date",
  "lastActive": "Date"
}
```

### **Messages**

```json
{
  "userId": "ObjectId",
  "text": "String",
  "sender": "user | bot",
  "mood": { "mood": "String", "emoji": "String", "color": "String" },
  "timestamp": "Date"
}
```

### **Sessions**

```json
{
  "userId": "ObjectId",
  "mood": "String",
  "preview": "String",
  "messageCount": "Number",
  "timestamp": "Date"
}
```

### **MoodLogs**

```json
{
  "userId": "ObjectId",
  "mood": "String",
  "emoji": "String",
  "notes": "String",
  "timestamp": "Date"
}
```

---

##  Deployment



### **Vercel**

```bash
vercel
```



---

##  Environment Variables Reference

| Variable          | Description               | Required           |
| ----------------- | ------------------------- | ------------------ |
| PORT              | Server port               | No (default: 5000) |
| MONGODB_URI       | MongoDB connection string | Yes                |
| JWT_SECRET        | Secret key for JWT        | Yes                |
| OPENAI_API_KEY    | OpenAI access key         | Optional           |
| ANTHROPIC_API_KEY | Claude access key         | Optional           |

---

##  Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/NewFeature`
3. Commit: `git commit -m "Add new feature"`
4. Push: `git push origin feature/NewFeature`
5. Open a Pull Request

---

##  Disclaimer

MindCare AI is a supportive tool—not a replacement for professional mental health care.
If you or someone you know is in crisis, contact local emergency services.

---

##  Acknowledgments

* Font Awesome
* MongoDB
* Express.js
* Mental health professionals

---

### Made with 💙 for mental health awareness
