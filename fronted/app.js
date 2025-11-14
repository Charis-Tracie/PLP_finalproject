const API_BASE_URL = 'http://localhost:5000/api';
// Helper function for API calls
async function apiCall(endpoint, method = 'GET', data = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Example: Register user
async function registerUser(name, email, password) {
    return await apiCall('/auth/register', 'POST', { name, email, password });
}

// Example: Login user
async function loginUser(email, password) {
    return await apiCall('/auth/login', 'POST', { email, password });
}

// Example: Save message to database
async function saveMessage(text, sender, mood, token) {
    return await apiCall('/messages', 'POST', { text, sender, mood }, token);
}

// Example: Get AI response from server
async function getServerAIResponse(message, mood, token) {
    return await apiCall('/messages/ai-response', 'POST', { message, mood }, token);
}

// ========== STATE MANAGEMENT ==========
let state = {
    userName: '',
    messages: [],
    sessions: [],
    currentMood: null,
    isTyping: false,
    theme: 'light',
    menuOpen: false
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupEventListeners();
});

function setupEventListeners() {
    // Welcome screen enter key
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startJourney();
            }
        });
    }

    // Message input enter key
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
}

// ========== LOCAL STORAGE FUNCTIONS ==========
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
    }
}

function loadUserData() {
    const userData = getFromStorage('mindcare_user');
    const messages = getFromStorage('mindcare_messages');
    const sessions = getFromStorage('mindcare_sessions');
    const theme = getFromStorage('mindcare_theme');
    
    if (userData) {
        state.userName = userData.name;
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userGreeting').textContent = `Hello, ${state.userName}`;
    }
    
    if (messages && messages.length > 0) {
        state.messages = messages;
        renderMessages();
    }
    
    if (sessions && sessions.length > 0) {
        state.sessions = sessions;
        renderSessions();
    }
    
    if (theme) {
        state.theme = theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) {
                themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }
}

// ========== WELCOME SCREEN ==========
function startJourney() {
    const nameInput = document.getElementById('userNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        nameInput.style.borderColor = '#f56565';
        nameInput.focus();
        return;
    }
    
    state.userName = name;
    saveToStorage('mindcare_user', { name, joinedAt: new Date().toISOString() });
    
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userGreeting').textContent = `Hello, ${name}`;
    
    // Send welcome message
    addBotMessage(`Hello ${name}! I'm MindCare AI, your compassionate mental health companion. I'm here to listen, support, and help you navigate your emotions. How are you feeling today?`);
}

// ========== THEME TOGGLE ==========
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme');
    
    const themeBtn = document.getElementById('themeToggle');
    if (state.theme === 'dark') {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    saveToStorage('mindcare_theme', state.theme);
}

// ========== MENU TOGGLE (PUSH CONTENT ON DESKTOP, OVERLAY ON MOBILE) ==========
function toggleMenu() {
    state.menuOpen = !state.menuOpen;
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    console.log('Menu toggled. Open:', state.menuOpen); // Debug
    
    if (state.menuOpen) {
        sidebar.classList.add('show-mobile');
        overlay.classList.add('active');
        menuBtn.innerHTML = '<i class="fas fa-times"></i>';
        
        // Add class to body to trigger CSS transitions
        document.body.classList.add('menu-open');
        console.log('Body class added:', document.body.classList.contains('menu-open')); // Debug
        
        // Prevent body scroll when menu is open on mobile only
        if (window.innerWidth <= 1024) {
            document.body.style.overflow = 'hidden';
        }
    } else {
        sidebar.classList.remove('show-mobile');
        overlay.classList.remove('active');
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Remove class from body
        document.body.classList.remove('menu-open');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// ========== MOOD SELECTION ==========
function selectMood(mood, emoji, color) {
    state.currentMood = { mood, emoji, color };
    
    // Update UI
    const moodButtons = document.querySelectorAll('.mood-btn');
    moodButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedBtn = document.querySelector(`.mood-btn[data-mood="${mood}"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    document.getElementById('moodStatus').textContent = `Feeling ${mood}`;
}

// ========== MESSAGE HANDLING ==========
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addUserMessage(message);
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Add session
    addSession(message);
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get bot response after delay
    setTimeout(() => {
        hideTypingIndicator();
        const response = getAIResponse(message);
        addBotMessage(response);
    }, 1500);
}

function addUserMessage(text) {
    const message = {
        id: Date.now(),
        text,
        sender: 'user',
        timestamp: new Date().toISOString(),
        mood: state.currentMood
    };
    
    state.messages.push(message);
    saveToStorage('mindcare_messages', state.messages);
    renderMessage(message);
    scrollToBottom();
}

function addBotMessage(text) {
    const message = {
        id: Date.now(),
        text,
        sender: 'bot',
        timestamp: new Date().toISOString()
    };
    
    state.messages.push(message);
    saveToStorage('mindcare_messages', state.messages);
    renderMessage(message);
    scrollToBottom();
}

function renderMessage(message) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (message.sender === 'bot') {
        contentDiv.innerHTML = `
            <div class="bot-header">
                <i class="fas fa-sparkles"></i>
                <span>MindCare AI</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        `;
    } else {
        let moodText = '';
        if (message.mood) {
            moodText = `<div class="message-mood">Mood: ${message.mood.mood} ${message.mood.emoji}</div>`;
        }
        contentDiv.innerHTML = `
            <div class="message-text">${escapeHtml(message.text)}</div>
            ${moodText}
        `;
    }
    
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
}

function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    state.messages.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// ========== SECURITY: ESCAPE HTML ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== AI RESPONSE LOGIC ==========
function getAIResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    
    const responses = {
        greeting: [
            "Hello! It's wonderful to hear from you. I'm here to support you. How can I help you today?",
            "Hi there! Thank you for reaching out. I'm here to listen and support you. What's on your mind?",
            "Welcome! I'm glad you're here. This is a safe space for you. How are you feeling today?"
        ],
        anxiety: [
            "I understand anxiety can be overwhelming. Let's try a grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This can help bring you back to the present moment.",
            "Anxiety is your body's natural response to stress. Remember: this feeling is temporary. Try taking slow, deep breaths - inhale for 4 counts, hold for 4, exhale for 6. You've got this.",
            "Thank you for sharing. When anxiety strikes, remember that it's okay to take a break. Have you tried progressive muscle relaxation? It can really help ease physical tension.",
            "I hear you. Anxiety can feel intense, but you're not alone in this. Let's work through it together. Can you identify what's triggering these feelings right now?"
        ],
        sad: [
            "I hear that you're feeling down. Your feelings are valid, and it's okay to not be okay sometimes. What's one small thing that usually brings you comfort?",
            "Sadness is a natural emotion. Be gentle with yourself. Sometimes just acknowledging how we feel is the first step toward healing. I'm here to listen.",
            "Thank you for trusting me with your feelings. Remember, reaching out like this shows strength. Would you like to talk about what's weighing on your mind?",
            "I'm sorry you're going through this. Sadness can feel heavy, but please know that it's temporary. What has helped you feel better in the past?"
        ],
        stress: [
            "Stress can feel like carrying a heavy weight. Let's lighten that load together. What's the biggest source of stress for you right now?",
            "I understand you're under pressure. Remember to take breaks - even 5 minutes can help. Have you had water and eaten today? Basic self-care matters.",
            "Stress is tough, but you're tougher. Let's break things down into smaller, manageable steps. What's one thing you can do today to ease the pressure?",
            "It sounds like you're dealing with a lot. Let's prioritize together. What's the most urgent thing you need to address right now?"
        ],
        happy: [
            "That's wonderful to hear! Happiness is precious - I'm glad you're experiencing this moment. What's bringing you joy today?",
            "Your positivity is uplifting! It's important to acknowledge and celebrate the good moments. Keep nurturing what makes you happy.",
            "I love hearing this! Positive emotions are just as important to process as difficult ones. What's contributing to your good mood?",
            "That's fantastic! Celebrating the good times is so important. How does this happiness feel in your body?"
        ],
        sleep: [
            "Sleep issues can really impact mental health. Try establishing a bedtime routine: dim lights, no screens 30 minutes before bed, and perhaps some calming music or meditation.",
            "Quality sleep is crucial for wellbeing. Consider keeping your bedroom cool, dark, and quiet. Have you tried progressive relaxation or guided sleep meditations?",
            "Sleep difficulties are common with stress and anxiety. A consistent sleep schedule can help. What's your current bedtime routine like?",
            "I understand how frustrating sleep problems can be. Creating a wind-down routine can signal your body it's time to rest. What relaxation techniques have you tried?"
        ],
        breathing: [
            "Breathing exercises are wonderful! Try this: Breathe in slowly through your nose for 4 counts, hold for 4, then exhale through your mouth for 6 counts. Repeat this 5 times. How do you feel?",
            "Deep breathing activates your body's relaxation response. Let's do the 4-7-8 technique: Inhale for 4, hold for 7, exhale for 8. This can calm your nervous system.",
            "Great choice! Breathing exercises can quickly reduce stress. Try box breathing: Inhale for 4, hold for 4, exhale for 4, hold for 4. Repeat."
        ],
        meditation: [
            "Meditation is a powerful tool for mental health. Start with just 5 minutes a day. Focus on your breath, and when your mind wanders, gently bring it back. Be patient with yourself.",
            "That's great you're interested in meditation! Try a body scan: Close your eyes and slowly bring awareness to each part of your body, from your toes to your head, releasing tension as you go.",
            "Meditation takes practice. Start small - even 2-3 minutes daily can make a difference. Apps like Calm or Headspace can guide you through beginner practices."
        ],
        help: [
            "I'm here to help! You can talk to me about your feelings, learn coping techniques, track your mood, or just have someone listen. What would be most helpful for you right now?",
            "There are many ways I can support you: discussing your emotions, teaching relaxation techniques, or just being a compassionate listener. What's on your mind?",
            "I'm glad you asked! I can help you process emotions, suggest coping strategies, or simply be here to listen without judgment. How can I best support you?"
        ],
        gratitude: [
            "Gratitude is such a powerful practice! It shifts our focus to the positive. What are three things you're grateful for today?",
            "That's beautiful. Practicing gratitude can really improve our mental wellbeing. Would you like to share what you're thankful for?",
            "Gratitude journaling is wonderful for mental health. Even on tough days, finding small things to appreciate can help."
        ],
        crisis: [
            "I'm concerned about what you're sharing. Please know that you deserve support. If you're in immediate danger, please call 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room. You are not alone.",
            "Thank you for trusting me, but I want to connect you with professionals who can provide the help you need right now. Please call 988 or text 'HELLO' to 741741. Your life matters.",
            "What you're feeling is serious, and I want to make sure you get proper support. Please reach out to a crisis counselor at 988 or visit your nearest ER. They can help you through this."
        ],
        default: [
            "Thank you for sharing that with me. I'm here to support you. Can you tell me more about what you're experiencing?",
            "I appreciate you opening up. Your mental health journey is unique, and I'm here to walk alongside you. What would help you most right now?",
            "I'm listening. Remember, there's no judgment here - this is a safe space for you to express yourself. How can I best support you today?",
            "That sounds challenging. I want you to know that what you're feeling is valid. Would you like to explore this further together?",
            "I hear you. It takes courage to share these feelings. What do you need most in this moment?"
        ]
    };
    
    // Check for crisis keywords first
    if (lowerMsg.includes('suicide') || lowerMsg.includes('kill myself') || lowerMsg.includes('end it all') || 
        lowerMsg.includes('want to die') || lowerMsg.includes('no reason to live')) {
        return getRandomResponse(responses.crisis);
    }
    
    // Check for greetings
    if (lowerMsg.match(/^(hi|hello|hey|greetings|good morning|good evening)/)) {
        return getRandomResponse(responses.greeting);
    }
    
    // Check for specific emotions/topics
    if (lowerMsg.includes('anxious') || lowerMsg.includes('anxiety') || lowerMsg.includes('worried') || 
        lowerMsg.includes('panic') || lowerMsg.includes('nervous')) {
        return getRandomResponse(responses.anxiety);
    } else if (lowerMsg.includes('sad') || lowerMsg.includes('depressed') || lowerMsg.includes('down') || 
               lowerMsg.includes('lonely') || lowerMsg.includes('empty')) {
        return getRandomResponse(responses.sad);
    } else if (lowerMsg.includes('stress') || lowerMsg.includes('overwhelm') || lowerMsg.includes('pressure') ||
               lowerMsg.includes('too much')) {
        return getRandomResponse(responses.stress);
    } else if (lowerMsg.includes('happy') || lowerMsg.includes('good') || lowerMsg.includes('great') || 
               lowerMsg.includes('joy') || lowerMsg.includes('excited')) {
        return getRandomResponse(responses.happy);
    } else if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia') || lowerMsg.includes('tired') || 
               lowerMsg.includes('rest') || lowerMsg.includes("can't sleep")) {
        return getRandomResponse(responses.sleep);
    } else if (lowerMsg.includes('breath') || lowerMsg.includes('breathing')) {
        return getRandomResponse(responses.breathing);
    } else if (lowerMsg.includes('meditat') || lowerMsg.includes('mindful')) {
        return getRandomResponse(responses.meditation);
    } else if (lowerMsg.includes('help') || lowerMsg.includes('what can you do') || lowerMsg.includes('how do you work')) {
        return getRandomResponse(responses.help);
    } else if (lowerMsg.includes('thank') || lowerMsg.includes('grateful') || lowerMsg.includes('gratitude')) {
        return getRandomResponse(responses.gratitude);
    } else {
        return getRandomResponse(responses.default);
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

// ========== SESSION MANAGEMENT ==========
function addSession(messagePreview) {
    const session = {
        timestamp: new Date().toISOString(),
        mood: state.currentMood ? state.currentMood.mood : 'Not specified',
        preview: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')
    };
    
    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, 10); // Keep only last 10 sessions
    
    saveToStorage('mindcare_sessions', state.sessions);
    renderSessions();
}

function renderSessions() {
    const container = document.getElementById('sessionsList');
    const clearBtn = document.getElementById('clearBtn');
    
    if (state.sessions.length === 0) {
        container.innerHTML = '<p class="no-sessions">No sessions yet</p>';
        if (clearBtn) clearBtn.classList.add('hidden');
        return;
    }
    
    if (clearBtn) clearBtn.classList.remove('hidden');
    
    container.innerHTML = '';
    state.sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';
        
        const date = new Date(session.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        sessionDiv.innerHTML = `
            <div class="mood">${escapeHtml(session.mood)}</div>
            <div class="date">${formattedDate}</div>
        `;
        
        container.appendChild(sessionDiv);
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history and sessions? This cannot be undone.')) {
        state.messages = [];
        state.sessions = [];
        state.currentMood = null;
        
        saveToStorage('mindcare_messages', []);
        saveToStorage('mindcare_sessions', []);
        
        document.getElementById('messagesContainer').innerHTML = '';
        
        // Clear mood selection
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('moodStatus').textContent = '';
        
        renderSessions();
        
        // Add a fresh welcome message
        addBotMessage(`Hello ${state.userName}! Your history has been cleared. I'm here whenever you need support. How are you feeling today?`);
    }
}

// ========== UTILITY FUNCTIONS ==========
function resetApp() {
    if (confirm('Are you sure you want to reset the app? This will clear all data and log you out.')) {
        localStorage.clear();
        location.reload();
    }
}

// ========== COUNTRY-SPECIFIC RESOURCES ==========
const countryResources = {
    KE: {
        name: 'Kenya',
        crisis: [
            { icon: 'phone', text: 'Crisis Hotline: 1199', tel: '1199', desc: 'Kenya Red Cross 24/7' },
            { icon: 'phone', text: 'Befrienders: +254 722 178 177', tel: '+254722178177', desc: 'Daily 10 AM - 10 PM' },
            { icon: 'phone', text: 'GVRC: +254 709 400 350', tel: '+254709400350', desc: 'Gender Violence Support 24/7' }
        ],
        therapist: { url: 'https://kenyapsychology.org', text: 'Kenya Psychological Association' },
        resources: { url: 'https://www.who.int/kenya/health-topics/mental-health', text: 'WHO Kenya Mental Health' }
    },
    US: {
        name: 'United States',
        crisis: [
            { icon: 'phone', text: 'Crisis Hotline: 988', tel: '988', desc: 'Suicide & Crisis Lifeline 24/7' },
            { icon: 'comment', text: 'Crisis Text: Text HOME to 741741', tel: '', desc: 'Crisis Text Line' },
            { icon: 'phone', text: 'SAMHSA: 1-800-662-4357', tel: '18006624357', desc: 'Treatment Referrals 24/7' }
        ],
        therapist: { url: 'https://www.psychologytoday.com/us/therapists', text: 'Psychology Today Directory' },
        resources: { url: 'https://www.nimh.nih.gov/health/topics', text: 'NIMH Self-Help Resources' }
    },
    GB: {
        name: 'United Kingdom',
        crisis: [
            { icon: 'phone', text: 'Samaritans: 116 123', tel: '116123', desc: '24/7 Free Support' },
            { icon: 'phone', text: 'Crisis Text: Text SHOUT to 85258', tel: '', desc: 'Text Support 24/7' },
            { icon: 'phone', text: 'NHS Mental Health: 111', tel: '111', desc: 'NHS Mental Health Support' }
        ],
        therapist: { url: 'https://www.nhs.uk/service-search/mental-health/find-a-psychological-therapies-service/', text: 'NHS Therapy Services' },
        resources: { url: 'https://www.mind.org.uk/', text: 'Mind UK Resources' }
    },
    CA: {
        name: 'Canada',
        crisis: [
            { icon: 'phone', text: 'Crisis Hotline: 1-833-456-4566', tel: '18334564566', desc: 'Canada Suicide Prevention 24/7' },
            { icon: 'comment', text: 'Crisis Text: Text 45645', tel: '', desc: 'Crisis Text Line' },
            { icon: 'phone', text: 'Kids Help: 1-800-668-6868', tel: '18006686868', desc: 'For Youth 24/7' }
        ],
        therapist: { url: 'https://www.psychologytoday.com/ca/therapists', text: 'Psychology Today Canada' },
        resources: { url: 'https://www.camh.ca/', text: 'CAMH Mental Health Resources' }
    },
    AU: {
        name: 'Australia',
        crisis: [
            { icon: 'phone', text: 'Lifeline: 13 11 14', tel: '131114', desc: '24/7 Crisis Support' },
            { icon: 'phone', text: 'Beyond Blue: 1300 22 4636', tel: '1300224636', desc: 'Mental Health Support 24/7' },
            { icon: 'phone', text: 'Kids Helpline: 1800 55 1800', tel: '1800551800', desc: 'For Youth 5-25 years' }
        ],
        therapist: { url: 'https://www.psychology.org.au/find-a-psychologist', text: 'Find a Psychologist' },
        resources: { url: 'https://www.headtohealth.gov.au/', text: 'Head to Health Resources' }
    },
    IN: {
        name: 'India',
        crisis: [
            { icon: 'phone', text: 'Vandrevala: 1860 2662 345', tel: '18602662345', desc: '24/7 Mental Health Support' },
            { icon: 'phone', text: 'iCall: 9152987821', tel: '9152987821', desc: 'Mon-Sat 8 AM - 10 PM' },
            { icon: 'phone', text: 'AASRA: 91-9820466726', tel: '919820466726', desc: '24/7 Suicide Prevention' }
        ],
        therapist: { url: 'https://www.psychologytoday.com/intl/counselling/in', text: 'Find Therapists in India' },
        resources: { url: 'https://www.nimhans.ac.in/', text: 'NIMHANS Resources' }
    },
    ZA: {
        name: 'South Africa',
        crisis: [
            { icon: 'phone', text: 'LifeLine: 0861 322 322', tel: '0861322322', desc: '24/7 Counselling' },
            { icon: 'phone', text: 'SADAG: 0800 567 567', tel: '0800567567', desc: 'Depression & Anxiety 24/7' },
            { icon: 'comment', text: 'SMS: 31393', tel: '', desc: 'Text Support' }
        ],
        therapist: { url: 'https://www.psyssa.com/', text: 'Psychological Society of SA' },
        resources: { url: 'https://www.sadag.org/', text: 'SADAG Mental Health Resources' }
    },
    NG: {
        name: 'Nigeria',
        crisis: [
            { icon: 'phone', text: 'Mental Health: 0800 CALL MANI', tel: '', desc: 'Free Mental Health Support' },
            { icon: 'phone', text: 'Suicide Research: +234 806 210 6493', tel: '+2348062106493', desc: 'Crisis Support' },
            { icon: 'phone', text: 'Emergency: 112', tel: '112', desc: 'General Emergency' }
        ],
        therapist: { url: 'https://www.psychologytoday.com/intl/counselling/ng', text: 'Find Therapists in Nigeria' },
        resources: { url: 'https://www.who.int/nigeria/health-topics/mental-health', text: 'WHO Nigeria Mental Health' }
    },
    GH: {
        name: 'Ghana',
        crisis: [
            { icon: 'phone', text: 'Mental Health Authority: 0800 463 628', tel: '0800463628', desc: 'Mental Health Support' },
            { icon: 'phone', text: 'Emergency: 112', tel: '112', desc: 'General Emergency Services' },
            { icon: 'phone', text: 'Lifeline Ghana: +233 244 846 701', tel: '+233244846701', desc: 'Crisis Support' }
        ],
        therapist: { url: 'https://www.moh.gov.gh/', text: 'Ghana Ministry of Health' },
        resources: { url: 'https://www.who.int/ghana', text: 'WHO Ghana Resources' }
    }
};

function updateResources() {
    const country = document.getElementById('countrySelect').value;
    const resources = countryResources[country];
    const container = document.getElementById('resourcesList');
    
    if (!resources) return;
    
    // Save selected country
    saveToStorage('mindcare_country', country);
    
    let html = '';
    
    // Add crisis hotlines
    resources.crisis.forEach(item => {
        const tel = item.tel ? `tel:${item.tel}` : '#';
        html += `
            <a href="${tel}" class="resource-link" ${!item.tel ? 'onclick="return false;"' : ''}>
                <i class="fas fa-${item.icon}"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${item.text}</div>
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${item.desc}</div>
                </div>
            </a>
        `;
    });
    
    // Add therapist finder
    html += `
        <a href="${resources.therapist.url}" target="_blank" class="resource-link">
            <i class="fas fa-hospital"></i>
            <div>${resources.therapist.text}</div>
        </a>
    `;
    
    // Add resources link
    html += `
        <a href="${resources.resources.url}" target="_blank" class="resource-link">
            <i class="fas fa-book-open"></i>
            <div>${resources.resources.text}</div>
        </a>
    `;
    
    container.innerHTML = html;
}

// Initialize resources on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set saved country or default to Kenya
    const savedCountry = getFromStorage('mindcare_country') || 'KE';
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
        countrySelect.value = savedCountry;
        updateResources();
    }
});

// ========== MENTAL HEALTH TRACKER ==========
let moodChart = null;

function toggleTracker() {
    const trackerContainer = document.getElementById('trackerContainer');
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // On mobile, close menu when opening tracker
    if (window.innerWidth <= 1024 && state.menuOpen) {
        sidebar.classList.remove('show-mobile');
        overlay.classList.remove('active');
        state.menuOpen = false;
        const menuBtn = document.getElementById('menuToggle');
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.style.overflow = '';
    }
    
    if (trackerContainer.classList.contains('hidden')) {
        trackerContainer.classList.remove('hidden');
        if (chatContainer) chatContainer.style.display = 'none';
        renderMoodTracker();
    } else {
        trackerContainer.classList.add('hidden');
        if (chatContainer) chatContainer.style.display = 'flex';
    }
}

function getMoodValue(mood) {
    const moodValues = {
        'Happy': 5,
        'Neutral': 3,
        'Anxious': 2,
        'Sad': 2,
        'Angry': 1
    };
    return moodValues[mood] || 3;
}

function getMoodColor(mood) {
    const moodColors = {
        'Happy': '#48bb78',
        'Neutral': '#a0aec0',
        'Anxious': '#ecc94b',
        'Sad': '#4299e1',
        'Angry': '#f56565'
    };
    return moodColors[mood] || '#a0aec0';
}

function getMoodEmoji(avgValue) {
    if (avgValue >= 4.5) return '😊 Great';
    if (avgValue >= 3.5) return '🙂 Good';
    if (avgValue >= 2.5) return '😐 Okay';
    if (avgValue >= 1.5) return '😔 Low';
    return '😢 Struggling';
}

function getTrend(data) {
    if (data.length < 2) return '📊 Building';
    
    const recent = data.slice(-3);
    const earlier = data.slice(-6, -3);
    
    if (recent.length === 0 || earlier.length === 0) return '📊 Tracking';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.5) return '📈 Improving';
    if (recentAvg < earlierAvg - 0.5) return '📉 Declining';
    return '➡️ Stable';
}

function getMoodAdvice(avgMood, trend) {
    const trendDirection = trend.split(' ')[0];
    
    // Critical - needs immediate support
    if (avgMood < 1.5) {
        return {
            type: 'critical',
            message: "I'm concerned about how you're feeling. Please reach out for immediate support. You don't have to go through this alone.",
            suggestions: [
                
                "Contact a mental health professional ",
                " Reach out to someone you trust immediately",
                
                " Use the crisis resources in your menu"
            ],
            encouragement: "You are important. Your feelings are valid. Help is available and people care about you. Please reach out now."
        };
    }
    
    // Very low - needs support
    if (avgMood < 2.5) {
        if (trendDirection === '📈') {
            return {
                type: 'improving',
                message: "I see you're starting to feel a bit better - that's a positive sign! Let's keep building on this progress.",
                suggestions: [
                    " Keep doing what's helping - you're on the right track",
                    " Set one small achievable goal for today",
                    
                    " Try a 10-minute walk in fresh air",
                    " Journal about one thing that went well today"
                ],
                encouragement: "You're making progress! Every small step forward matters. I'm proud of you for continuing to try. Keep going! 💪"
            };
        } 
    }
    
    // Moderate - maintaining
    if (avgMood < 3.5) {
        if (trendDirection === '📈') {
            return {
                type: 'improving',
                message: "Great progress! You're moving in a positive direction. Let's keep this momentum going!",
                suggestions: [
                    "🎉 Celebrate your progress - you deserve recognition!",
                    " Keep up your healthy routines and habits",
                    " Continue any mindfulness or relaxation practices",
                    
                    
                ],
                encouragement: "You're doing amazing! The effort you're putting in is paying off. Keep believing in yourself - you're stronger than you know! 🌟"
            };
        } else if (trendDirection === '📉') {
            return {
                type: 'support',
                message: "I notice things have been tougher recently. Let's work on getting you back to feeling better.",
                suggestions: [
                    
                    " Ask for help - it's a sign of strength, not weakness",
                    " Schedule something to look forward to",
                    "Challenge negative thoughts with evidence"
                ],
                encouragement: "Ups and downs are normal in recovery. This setback doesn't erase your progress. You have the strength to bounce back. 💙"
            };
        } else {
            return {
                type: 'maintain',
                message: "You're maintaining a steady balance. That's valuable - let's keep you here and continue building resilience.",
                suggestions: [
                    " Focus on small, consistent healthy habits",
                    " Practice gratitude - write down 3 things daily",
                    " Nurture your support network"
                    
                    
                ],
                encouragement: "Stability is progress! You're managing well. Keep taking care of yourself - you're worth it! 🌻"
            };
        }
    }
    
    // Good - thriving
    if (avgMood < 4.5) {
        return {
            type: 'thriving',
            message: "You're doing really well! Your positive momentum shows the work you're putting into your wellbeing.",
            suggestions: [
                " Acknowledge how far you've come - be proud!",
                
                " Consider helping others - it boosts wellbeing",
                "Keep challenging yourself to grow",
                " Explore new activities that bring joy"
            ],
            encouragement: "You're thriving! Your dedication to your mental health is inspiring. Keep up the excellent work - you're an example of resilience! 🌈✨"
        };
    }
    
    // Excellent - flourishing
    return {
        type: 'excellent',
        message: "Wow! You're in an excellent place mentally. Your consistent effort has paid off beautifully!",
        suggestions: [
           
            " Set new personal growth goals",
            " Continue your self-care practices religiously",
            " Reflect on what's working and document it",
            " Celebrate yourself - you've earned it!"
        ],
        encouragement: "You're absolutely crushing it! Your mental health journey is an inspiration. Remember this feeling and the work that got you here. You're proof that healing and growth are possible! 🎉🌟"
    };
}

function showMoodAdvice(avgMood, trend) {
    const advice = getMoodAdvice(avgMood, trend);
    const trackerContainer = document.getElementById('trackerContainer');
    
    // Check if advice section already exists
    let adviceSection = document.getElementById('moodAdvice');
    
    if (!adviceSection) {
        adviceSection = document.createElement('div');
        adviceSection.id = 'moodAdvice';
        adviceSection.className = 'mood-advice';
        trackerContainer.appendChild(adviceSection);
    }
    
    // Color coding based on type
    const typeColors = {
        critical: '#f56565',
        support: '#4299e1',
        improving: '#48bb78',
        maintain: '#ecc94b',
        thriving: '#48bb78',
        excellent: '#667eea'
    };
    
    const typeIcons = {
        critical: '🆘',
        support: '💙',
        improving: '📈',
        maintain: '⚖️',
        thriving: '🌟',
        excellent: '🎉'
    };
    
    let suggestionsHTML = advice.suggestions.map(s => `<li>${s}</li>`).join('');
    
    adviceSection.innerHTML = `
        <div class="advice-header" style="background: ${typeColors[advice.type]};">
            <span class="advice-icon">${typeIcons[advice.type]}</span>
            <h4>Your Mental Health Insights</h4>
        </div>
        <div class="advice-content">
            <p class="advice-message"><strong>${advice.message}</strong></p>
            <div class="advice-suggestions">
                <h5>💡 Suggestions for you:</h5>
                <ul>${suggestionsHTML}</ul>
            </div>
            <div class="advice-encouragement">
                <p>${advice.encouragement}</p>
            </div>
        </div>
    `;
}

function renderMoodTracker() {
    // Get mood data from messages
    const moodData = [];
    const dates = [];
    const colors = [];
    
    // Group messages by date and get mood
    const messagesByDate = {};
    
    state.messages.forEach(msg => {
        if (msg.sender === 'user' && msg.mood) {
            const date = new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (!messagesByDate[date]) {
                messagesByDate[date] = [];
            }
            messagesByDate[date].push(msg.mood.mood);
        }
    });
    
    // Calculate average mood per day
    Object.keys(messagesByDate).forEach(date => {
        const moods = messagesByDate[date];
        const avgMood = moods.reduce((sum, mood) => sum + getMoodValue(mood), 0) / moods.length;
        const dominantMood = moods[moods.length - 1]; // Use last mood of the day
        
        dates.push(date);
        moodData.push(avgMood);
        colors.push(getMoodColor(dominantMood));
    });
    
    // Update stats
    document.getElementById('totalDays').textContent = dates.length;
    
    const avgMoodValue = moodData.length > 0 
        ? moodData.reduce((a, b) => a + b, 0) / moodData.length 
        : 0;
    document.getElementById('avgMood').textContent = getMoodEmoji(avgMoodValue);
    const trendText = getTrend(moodData);
    document.getElementById('trendIcon').textContent = trendText;
    
    // Show personalized advice
    if (dates.length > 0) {
        showMoodAdvice(avgMoodValue, trendText);
    }
    
    // Create or update chart
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;
    
    if (moodChart) {
        moodChart.destroy();
    }
    
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#f7fafc' : '#1a202c';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.length > 0 ? dates : ['No data yet'],
            datasets: [{
                label: 'Mood Level',
                data: moodData.length > 0 ? moodData : [3],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.length > 0 ? colors : ['#a0aec0'],
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return 'Mood: ' + getMoodEmoji(value);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: textColor,
                        callback: function(value) {
                            const labels = ['', '😢', '😔', '😐', '🙂', '😊'];
                            return labels[value] || '';
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

// Update chart when theme changes
const originalToggleTheme = toggleTheme;
toggleTheme = function() {
    originalToggleTheme();
    if (moodChart) {
        renderMoodTracker();
    }
};