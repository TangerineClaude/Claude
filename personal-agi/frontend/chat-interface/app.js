// API Configuration
const API_BASE = window.location.origin + '/api';

// State
let conversationHistory = [];
let isTyping = false;

// DOM Elements
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const modelSelect = document.getElementById('modelSelect');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    loadContextSummary();
    loadActiveTasks();

    chatForm.addEventListener('submit', handleSubmit);
    messageInput.addEventListener('input', autoResize);
    messageInput.addEventListener('keydown', handleKeyDown);
});

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('/health');
        const data = await response.json();

        if (data.status === 'healthy') {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        }
    } catch (error) {
        statusText.textContent = 'Disconnected';
        console.error('Server health check failed:', error);
    }
}

// Load context summary
async function loadContextSummary() {
    try {
        const response = await fetch(`${API_BASE}/conversation/summary`);
        const data = await response.json();

        if (data.success) {
            const summary = data.summary;
            document.getElementById('contextSummary').innerHTML = `
                <div class="stat-item">
                    <div class="stat-label">Conversations</div>
                    <div class="stat-value">${summary.totalConversations}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Memories</div>
                    <div class="stat-value">${summary.totalMemories}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Active Projects</div>
                    <div class="stat-value">${summary.activeProjects}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load context summary:', error);
    }
}

// Load active tasks
async function loadActiveTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks/list`);
        const data = await response.json();

        if (data.success && data.tasks.length > 0) {
            document.getElementById('activeTasks').innerHTML = data.tasks
                .map(task => `
                    <div class="task-item">
                        ${task.description.substring(0, 50)}...
                        <div class="task-status ${task.status}">${task.status}</div>
                    </div>
                `)
                .join('');
        } else {
            document.getElementById('activeTasks').innerHTML = '<p class="loading">No active tasks</p>';
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message || isTyping) return;

    // Clear input
    messageInput.value = '';
    autoResize();

    // Add user message to UI
    addMessage(message, 'user');

    // Show typing indicator
    showTyping();

    try {
        const selectedModel = modelSelect.value === 'auto' ? null : modelSelect.value;

        const response = await fetch(`${API_BASE}/conversation/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                options: {
                    model: selectedModel
                }
            })
        });

        const data = await response.json();

        // Remove typing indicator
        hideTyping();

        if (data.success) {
            // Add agent response to UI
            addMessage(data.message, 'assistant', {
                model: data.model,
                tokens: data.usage.totalTokens,
                cost: data.cost.totalCost,
                latency: data.latency
            });

            // Update context summary
            loadContextSummary();
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        hideTyping();
        addMessage(`Error: ${error.message}`, 'error');
        console.error('Chat error:', error);
    }
}

// Add message to UI
function addMessage(text, type, meta = null) {
    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) {
        welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = type === 'user' ? '👤' : '🤖';

    let metaHTML = '';
    if (meta) {
        metaHTML = `
            <div class="message-meta">
                <span>🤖 ${meta.model}</span>
                <span>🎫 ${meta.tokens} tokens</span>
                <span>💰 $${meta.cost.toFixed(6)}</span>
                <span>⚡ ${meta.latency}ms</span>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
            ${metaHTML}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show typing indicator
function showTyping() {
    isTyping = true;
    sendButton.disabled = true;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTyping() {
    isTyping = false;
    sendButton.disabled = false;

    const typing = document.getElementById('typing-indicator');
    if (typing) {
        typing.remove();
    }
}

// Auto-resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
}

// Send suggestion
function sendSuggestion(text) {
    messageInput.value = text;
    chatForm.dispatchEvent(new Event('submit'));
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Refresh data periodically
setInterval(() => {
    checkServerStatus();
    loadActiveTasks();
}, 30000); // Every 30 seconds
