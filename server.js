// ========== IMPORTS ==========
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();

// ========== OPENAI CONFIGURATION ==========
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not found in .env file');
    console.warn('⚠️  AI responses will use fallback logic');
}

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files from 'public' folder

// ========== DATABASE CONNECTION ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindcare';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ========== MONGOOSE SCHEMAS ==========

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
});

// Message Schema
const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        enum: ['user', 'bot'],
        required: true
    },
    mood: {
        mood: String,
        emoji: String,
        color: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Session Schema
const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mood: {
        type: String,
        required: true
    },
    preview: {
        type: String
    },
    messageCount: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Mood Log Schema
const moodLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mood: {
        type: String,
        required: true
    },
    emoji: String,
    notes: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// ========== MODELS ==========
const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Session = mongoose.model('Session', sessionSchema);
const MoodLog = mongoose.model('MoodLog', moodLogSchema);

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ========== ROOT ROUTE ==========
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ========== API INFO ROUTE ==========
app.get('/api', (req, res) => {
    res.json({
        message: 'MindCare AI API',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login'
            },
            messages: {
                getAll: 'GET /api/messages',
                create: 'POST /api/messages',
                aiResponse: 'POST /api/messages/ai-response',
                deleteAll: 'DELETE /api/messages'
            },
            sessions: {
                getAll: 'GET /api/sessions',
                create: 'POST /api/sessions'
            },
            moods: {
                getHistory: 'GET /api/moods',
                log: 'POST /api/moods',
                stats: 'GET /api/moods/stats'
            },
            user: {
                getProfile: 'GET /api/user/profile',
                updateProfile: 'PUT /api/user/profile'
            }
        },
        status: 'active'
    });
});

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last active
        user.lastActive = new Date();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// ========== MESSAGE ROUTES ==========

// Get all messages for a user
app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.user.userId })
            .sort({ timestamp: 1 })
            .limit(100);
        
        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }
});

// Save a message
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { text, sender, mood } = req.body;

        if (!text || !sender) {
            return res.status(400).json({ error: 'Text and sender are required' });
        }

        const message = new Message({
            userId: req.user.userId,
            text,
            sender,
            mood
        });

        await message.save();

        res.status(201).json({ message: 'Message saved', data: message });
    } catch (error) {
        console.error('Save message error:', error);
        res.status(500).json({ error: 'Failed to save message', details: error.message });
    }
});

// Get AI response
app.post('/api/messages/ai-response', authenticateToken, async (req, res) => {
    try {
        const { message, mood } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Generate AI response
        const response = generateAIResponse(message, mood);

        // Save bot message
        const botMessage = new Message({
            userId: req.user.userId,
            text: response,
            sender: 'bot'
        });

        await botMessage.save();

        res.json({ response, messageId: botMessage._id });
    } catch (error) {
        console.error('AI response error:', error);
        res.status(500).json({ error: 'Failed to get AI response', details: error.message });
    }
});

// Delete all messages for a user
app.delete('/api/messages', authenticateToken, async (req, res) => {
    try {
        await Message.deleteMany({ userId: req.user.userId });
        res.json({ message: 'All messages deleted' });
    } catch (error) {
        console.error('Delete messages error:', error);
        res.status(500).json({ error: 'Failed to delete messages', details: error.message });
    }
});

// ========== SESSION ROUTES ==========

// Get all sessions
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user.userId })
            .sort({ timestamp: -1 })
            .limit(10);
        
        res.json({ sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
    }
});

// Create a session
app.post('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const { mood, preview } = req.body;

        if (!mood) {
            return res.status(400).json({ error: 'Mood is required' });
        }

        const session = new Session({
            userId: req.user.userId,
            mood,
            preview,
            messageCount: 1
        });

        await session.save();

        res.status(201).json({ message: 'Session created', data: session });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Failed to create session', details: error.message });
    }
});

// ========== MOOD LOG ROUTES ==========

// Get mood history
app.get('/api/moods', authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const moods = await MoodLog.find({
            userId: req.user.userId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: -1 });

        res.json({ moods });
    } catch (error) {
        console.error('Get moods error:', error);
        res.status(500).json({ error: 'Failed to fetch moods', details: error.message });
    }
});

// Log a mood
app.post('/api/moods', authenticateToken, async (req, res) => {
    try {
        const { mood, emoji, notes } = req.body;

        if (!mood) {
            return res.status(400).json({ error: 'Mood is required' });
        }

        const moodLog = new MoodLog({
            userId: req.user.userId,
            mood,
            emoji,
            notes
        });

        await moodLog.save();

        res.status(201).json({ message: 'Mood logged', data: moodLog });
    } catch (error) {
        console.error('Log mood error:', error);
        res.status(500).json({ error: 'Failed to log mood', details: error.message });
    }
});

// Get mood statistics
app.get('/api/moods/stats', authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const moods = await MoodLog.find({
            userId: req.user.userId,
            timestamp: { $gte: startDate }
        });

        // Calculate statistics
        const moodCounts = {};
        moods.forEach(log => {
            moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
        });

        const totalMoods = moods.length;
        const moodPercentages = {};
        
        Object.keys(moodCounts).forEach(mood => {
            moodPercentages[mood] = ((moodCounts[mood] / totalMoods) * 100).toFixed(2);
        });

        res.json({
            totalLogs: totalMoods,
            moodCounts,
            moodPercentages,
            period: `${days} days`
        });
    } catch (error) {
        console.error('Get mood stats error:', error);
        res.status(500).json({ error: 'Failed to get mood stats', details: error.message });
    }
});

// ========== USER ROUTES ==========

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { name },
            { new: true }
        ).select('-password');

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});

// ========== AI RESPONSE GENERATOR ==========
function generateAIResponse(userMessage, mood) {
    const lowerMsg = userMessage.toLowerCase();
    
    const responses = {
        greeting: [
            "Hello! It's wonderful to hear from you. I'm here to support you. How can I help you today?",
            "Hi there! Thank you for reaching out. I'm here to listen and support you. What's on your mind?"
        ],
        anxiety: [
            "I understand anxiety can be overwhelming. Let's try a grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
            "Anxiety is your body's natural response to stress. Try taking slow, deep breaths - inhale for 4 counts, hold for 4, exhale for 6.",
            "When anxiety strikes, remember that it's okay to take a break. Have you tried progressive muscle relaxation?"
        ],
        sad: [
            "I hear that you're feeling down. Your feelings are valid. What's one small thing that usually brings you comfort?",
            "Sadness is a natural emotion. Be gentle with yourself. Sometimes just acknowledging how we feel is the first step toward healing.",
            "Thank you for trusting me with your feelings. Remember, reaching out like this shows strength."
        ],
        stress: [
            "Stress can feel like carrying a heavy weight. Let's lighten that load together. What's the biggest source of stress for you right now?",
            "I understand you're under pressure. Remember to take breaks - even 5 minutes can help. Have you had water and eaten today?",
            "Stress is tough, but you're tougher. Let's break things down into smaller, manageable steps."
        ],
        happy: [
            "That's wonderful to hear! Happiness is precious - I'm glad you're experiencing this moment. What's bringing you joy today?",
            "Your positivity is uplifting! It's important to acknowledge and celebrate the good moments.",
            "I love hearing this! Positive emotions are just as important to process as difficult ones."
        ],
        crisis: [
            "I'm concerned about what you're sharing. Please reach out for immediate support. You can call 988 (US) or your local crisis line. You don't have to go through this alone.",
            "Your life matters. Please contact a crisis counselor at 988 or visit your nearest emergency room. Help is available and people care about you."
        ],
        default: [
            "Thank you for sharing that with me. I'm here to support you. Can you tell me more about what you're experiencing?",
            "I appreciate you opening up. Your mental health journey is unique, and I'm here to walk alongside you.",
            "I'm listening. Remember, there's no judgment here - this is a safe space for you to express yourself."
        ]
    };

    // Check for crisis keywords
    if (lowerMsg.includes('suicide') || lowerMsg.includes('kill myself') || lowerMsg.includes('want to die')) {
        return getRandomResponse(responses.crisis);
    }

    // Check for greetings
    if (lowerMsg.match(/^(hi|hello|hey)/)) {
        return getRandomResponse(responses.greeting);
    }

    // Check for emotions
    if (lowerMsg.includes('anxious') || lowerMsg.includes('anxiety') || lowerMsg.includes('worried')) {
        return getRandomResponse(responses.anxiety);
    } else if (lowerMsg.includes('sad') || lowerMsg.includes('depressed') || lowerMsg.includes('down')) {
        return getRandomResponse(responses.sad);
    } else if (lowerMsg.includes('stress') || lowerMsg.includes('overwhelm')) {
        return getRandomResponse(responses.stress);
    } else if (lowerMsg.includes('happy') || lowerMsg.includes('good') || lowerMsg.includes('great')) {
        return getRandomResponse(responses.happy);
    }

    return getRandomResponse(responses.default);
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ====================================');
    console.log('   MindCare AI Server Running');
    console.log('====================================== 🚀');
    console.log('');
    console.log(`📱 Frontend URL: http://localhost:${PORT}`);
    console.log(`🔌 API Base URL: http://localhost:${PORT}/api`);
    console.log('');
    console.log('📋 Available API Endpoints:');
    console.log('   Auth:');
    console.log(`     POST http://localhost:${PORT}/api/auth/register`);
    console.log(`     POST http://localhost:${PORT}/api/auth/login`);
    console.log('   Messages:');
    console.log(`     GET  http://localhost:${PORT}/api/messages`);
    console.log(`     POST http://localhost:${PORT}/api/messages`);
    console.log(`     POST http://localhost:${PORT}/api/messages/ai-response`);
    console.log('   Moods:');
    console.log(`     GET  http://localhost:${PORT}/api/moods`);
    console.log(`     POST http://localhost:${PORT}/api/moods`);
    console.log(`     GET  http://localhost:${PORT}/api/moods/stats`);
    console.log('   User:');
    console.log(`     GET  http://localhost:${PORT}/api/user/profile`);
    console.log(`     PUT  http://localhost:${PORT}/api/user/profile`);
    console.log('');
    console.log('🔗 API Documentation: http://localhost:' + PORT + '/api');
    console.log('');
    console.log('====================================== 🚀');
    console.log('');
});