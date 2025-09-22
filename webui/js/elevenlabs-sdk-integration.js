// ElevenLabs SDK Integration for Ghost v9.5
// Uses the official @elevenlabs/client SDK for proper WebSocket handling

class ElevenLabsSDKIntegration {
    constructor() {
        console.log('[ElevenLabs-SDK] Initializing integration...');
        
        // Core properties
        this.conversation = null;
        this.isConnected = false;
        this.apiKey = null;
        this.agentId = null;
        
        // UI elements
        this.button = document.getElementById('elevenlabs-button');
        if (!this.button) {
            console.error('[ElevenLabs-SDK] Button not found');
            return;
        }
        
        // Load credentials and initialize
        this.init();
    }
    
    async init() {
        // Load API credentials
        await this.loadCredentials();
        
        // Set up button handler
        this.setupButtonHandler();
        
        // Set initial UI state
        this.updateUIState('inactive');
        
        console.log('[ElevenLabs-SDK] Initialization complete');
    }
    
    async loadCredentials() {
        try {
            const response = await fetch('/api/elevenlabs/credentials');
            if (response.ok) {
                const data = await response.json();
                this.apiKey = data.apiKey;
                this.agentId = data.agentId;
                
                if (!this.agentId) {
                    console.log('[ElevenLabs-SDK] No agent ID found, creating new agent...');
                    await this.createAgent();
                }
                
                console.log('[ElevenLabs-SDK] Credentials loaded');
            }
        } catch (error) {
            console.error('[ElevenLabs-SDK] Failed to load credentials:', error);
        }
    }
    
    async createAgent() {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_config: {
                        name: 'Ghost Assistant',
                        system_prompt: 'You are Ghost, a helpful AI assistant.',
                        language: 'en',
                        voice_id: '71rg5fZp3CKz6u0BoSGV'
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.agentId = data.agent_id;
                
                // Save agent ID for persistence
                await fetch('/api/elevenlabs/save-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentId: this.agentId })
                });
                
                console.log('[ElevenLabs-SDK] Agent created:', this.agentId);
            }
        } catch (error) {
            console.error('[ElevenLabs-SDK] Failed to create agent:', error);
        }
    }
    
    async connect() {
        if (this.isConnected || !this.agentId) {
            console.log('[ElevenLabs-SDK] Already connected or no agent ID');
            return;
        }
        
        try {
            console.log('[ElevenLabs-SDK] Starting conversation with agent:', this.agentId);
            this.updateUIState('connecting');
            
            // Check if ElevenLabs SDK is loaded - try different possible locations
            const ElevenLabs = window.ElevenLabs || window.ElevenLabsClient || window.elevenlabs;
            
            if (!ElevenLabs) {
                console.error('[ElevenLabs-SDK] Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('eleven')));
                throw new Error('ElevenLabs SDK not loaded - check console for available globals');
            }
            
            console.log('[ElevenLabs-SDK] Found SDK at:', ElevenLabs);
            
            // Get signed URL for WebSocket connection
            const signedUrl = await this.getSignedUrl();
            
            // Try to find the Conversation class
            const Conversation = ElevenLabs.Conversation || ElevenLabs.ConversationClient || ElevenLabs;
            
            // Start conversation using the SDK
            this.conversation = await Conversation.startSession({
                signedUrl: signedUrl,  // Use signed URL instead of agentId for auth
                
                // Event handlers
                onConnect: () => {
                    console.log('[ElevenLabs-SDK] Connected successfully');
                    this.isConnected = true;
                    this.updateUIState('listening');
                    this.showToast('Connected to ElevenLabs', 'success');
                },
                
                onMessage: (message) => {
                    console.log('[ElevenLabs-SDK] Message:', message);
                    // Handle different message types
                    this.handleMessage(message);
                },
                
                onError: (error) => {
                    console.error('[ElevenLabs-SDK] Error:', error);
                    this.showToast('Connection error', 'error');
                    this.updateUIState('error');
                },
                
                onStatusChange: (status) => {
                    console.log('[ElevenLabs-SDK] Status change:', status);
                    if (status === 'disconnected') {
                        this.isConnected = false;
                        this.updateUIState('inactive');
                    }
                },
                
                onModeChange: (mode) => {
                    console.log('[ElevenLabs-SDK] Mode change:', mode);
                    // Update UI based on mode (speaking/listening)
                    if (mode === 'speaking') {
                        this.updateUIState('speaking');
                    } else if (mode === 'listening') {
                        this.updateUIState('listening');
                    }
                },
                
                // Client-side tools for Ghost integration
                clientTools: {
                    execute_ghost_command: async (parameters) => {
                        console.log('[ElevenLabs-SDK] Executing Ghost command:', parameters.command);
                        
                        // Send command to Ghost through the chat interface
                        updateChatInput(parameters.command);
                        await sendMessage();
                        
                        return { success: true, message: 'Command sent to Ghost' };
                    },
                    
                    search_memory: async (parameters) => {
                        console.log('[ElevenLabs-SDK] Searching memory:', parameters.query);
                        
                        // Send search command to Ghost
                        const searchCommand = `search memory for: ${parameters.query}`;
                        updateChatInput(searchCommand);
                        await sendMessage();
                        
                        return { success: true, message: 'Memory search initiated' };
                    }
                }
            });
            
            console.log('[ElevenLabs-SDK] Conversation started successfully');
            
        } catch (error) {
            console.error('[ElevenLabs-SDK] Failed to connect:', error);
            console.error('[ElevenLabs-SDK] Error details:', {
                message: error.message,
                stack: error.stack,
                agentId: this.agentId,
                hasApiKey: !!this.apiKey
            });
            this.showToast(`Failed to connect: ${error.message}`, 'error');
            this.updateUIState('error');
            this.isConnected = false;
        }
    }
    
    async getSignedUrl() {
        try {
            const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${this.agentId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get signed URL: ${response.status}`);
            }
            
            const data = await response.json();
            return data.signed_url;
        } catch (error) {
            console.error('[ElevenLabs-SDK] Failed to get signed URL:', error);
            throw error;
        }
    }
    
    handleMessage(message) {
        // Handle different message types from the SDK
        if (message.type === 'user_transcript') {
            console.log('[ElevenLabs-SDK] User said:', message.text);
            // Could display user transcript if needed
        } else if (message.type === 'agent_response') {
            console.log('[ElevenLabs-SDK] Agent said:', message.text);
            // Could display agent response if needed
        } else if (message.type === 'tool_call') {
            console.log('[ElevenLabs-SDK] Tool call:', message);
            // Tool calls are handled by clientTools
        }
    }
    
    async disconnect() {
        if (!this.isConnected || !this.conversation) {
            return;
        }
        
        console.log('[ElevenLabs-SDK] Disconnecting...');
        
        try {
            // End the conversation
            await this.conversation.endSession();
            this.conversation = null;
            this.isConnected = false;
            this.updateUIState('inactive');
            console.log('[ElevenLabs-SDK] Disconnected');
        } catch (error) {
            console.error('[ElevenLabs-SDK] Error disconnecting:', error);
        }
    }
    
    setupButtonHandler() {
        this.button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!this.isConnected) {
                // Connect to ElevenLabs
                await this.connect();
            } else {
                // Disconnect
                await this.disconnect();
            }
        });
    }
    
    updateUIState(state = 'inactive') {
        // Remove all state classes
        const states = ['elevenlabs-inactive', 'elevenlabs-connecting', 'elevenlabs-connected', 
                       'elevenlabs-listening', 'elevenlabs-recording', 'elevenlabs-speaking', 
                       'elevenlabs-processing', 'elevenlabs-error'];
        states.forEach(s => this.button.classList.remove(s));
        
        // Add new state class
        this.button.classList.add(`elevenlabs-${state}`);
        
        // Update tooltip
        const statusMessages = {
            'inactive': 'Click to connect',
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'listening': 'Listening...',
            'recording': 'Recording...',
            'speaking': 'Speaking...',
            'processing': 'Processing...',
            'error': 'Connection error'
        };
        
        this.button.setAttribute('data-status', statusMessages[state] || 'Ready');
    }
    
    showToast(message, type = 'info') {
        console.log(`[ElevenLabs-SDK] ${type.toUpperCase()}: ${message}`);
        // Could implement actual toast UI here
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.elevenLabsSDK = new ElevenLabsSDKIntegration();
    });
} else {
    window.elevenLabsSDK = new ElevenLabsSDKIntegration();
}