/**
 * Hume EVI Integration for Ghost v9 Microphone Button
 * Simplified speech-to-speech integration
 */

class HumeGhostIntegration {
    constructor() {
        this.socket = null;
        this.accessToken = null;
        this.isConnected = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioQueue = [];
        this.audioPlayer = null;
        this.heartbeatInterval = null;
        this.lastUserMessage = null;  // Track last user message for routing
        
        // Get the microphone button
        this.micButton = document.getElementById('microphone-button');
        
        // Configuration
        this.config = {
            socketUrl: 'wss://api.hume.ai/v0/assistant/chat',
            sampleRate: 16000
        };
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);
        this.handleMicClick = this.handleMicClick.bind(this);
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('[HumeGhost] Initializing...');
        console.log('[HumeGhost] Looking for microphone button...');
        
        // Replace microphone button click handler
        if (this.micButton) {
            console.log('[HumeGhost] Microphone button found:', this.micButton);
            // Remove existing handlers
            const newButton = this.micButton.cloneNode(true);
            this.micButton.parentNode.replaceChild(newButton, this.micButton);
            this.micButton = newButton;
            
            // Add our handler
            this.micButton.addEventListener('click', this.handleMicClick);
            console.log('[HumeGhost] Microphone button handler attached');
        } else {
            console.error('[HumeGhost] Microphone button not found! ID: microphone-button');
        }
        
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize audio player
        this.initAudioPlayer();
    }
    
    initAudioPlayer() {
        // Improved audio player with Web Audio API for smoother playback
        const audioContext = this.audioContext;
        let nextStartTime = 0;
        
        this.audioPlayer = {
            queue: [],
            isPlaying: false,
            audioBuffers: [],
            currentSource: null,
            
            async play(audioData) {
                try {
                    // Convert base64 to ArrayBuffer
                    const binaryString = atob(audioData);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // Decode audio data using Web Audio API
                    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
                    
                    // Schedule playback with proper timing
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    
                    // Calculate when to start this chunk
                    const currentTime = audioContext.currentTime;
                    const startTime = Math.max(currentTime, nextStartTime);
                    
                    // Schedule the audio
                    source.start(startTime);
                    
                    // Update next start time for seamless playback
                    nextStartTime = startTime + audioBuffer.duration;
                    
                    // Store reference for interruption
                    this.currentSource = source;
                    
                    source.onended = () => {
                        if (this.currentSource === source) {
                            this.currentSource = null;
                        }
                    };
                    
                } catch (error) {
                    console.error('[HumeGhost] Audio decode error:', error);
                    // Fallback to simple audio element
                    try {
                        const audio = new Audio();
                        const blob = new Blob([atob(audioData)], { type: 'audio/wav' });
                        audio.src = URL.createObjectURL(blob);
                        audio.play().catch(e => console.error('[HumeGhost] Fallback play error:', e));
                    } catch (fallbackError) {
                        console.error('[HumeGhost] Fallback error:', fallbackError);
                    }
                }
            },
            
            stop() {
                // Stop current playback
                if (this.currentSource) {
                    try {
                        this.currentSource.stop();
                    } catch (e) {}
                    this.currentSource = null;
                }
                
                // Reset timing
                nextStartTime = 0;
                this.queue = [];
                this.isPlaying = false;
            }
        };
    }
    
    async handleMicClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[HumeGhost] Microphone clicked!');
        console.log('[HumeGhost] Connected:', this.isConnected);
        console.log('[HumeGhost] Recording:', this.isRecording);
        
        // Simple 2-state toggle
        if (!this.isConnected) {
            console.log('[HumeGhost] Not connected - connecting...');
            // Connect - recording will auto-start in onopen callback
            await this.connect();
        } else {
            console.log('[HumeGhost] Connected - disconnecting...');
            // Stop everything and disconnect
            if (this.isRecording) {
                console.log('[HumeGhost] Stopping recording first...');
                await this.stopRecording();
            }
            await this.disconnect();
        }
    }
    
    async connect() {
        try {
            console.log('[HumeGhost] Getting access token...');
            
            // Get access token from backend
            const response = await fetch('/hume_evi_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            });
            
            const data = await response.json();
            
            if (!data.success || !data.access_token) {
                throw new Error(data.error || 'Failed to get access token');
            }
            
            this.accessToken = data.access_token;
            console.log('[HumeGhost] Got access token');
            
            // Connect WebSocket with your custom config
            const configId = '37e6eaa3-bfa7-42fa-b591-8978e957b8f6';  // Your custom voice config
            const socketUrl = `${this.config.socketUrl}?access_token=${this.accessToken}&config_id=${configId}`;
            this.socket = new WebSocket(socketUrl);
            
            this.socket.onopen = () => {
                console.log('[HumeGhost] WebSocket connected');
                this.isConnected = true;
                this.updateButtonState('connected');
                
                // Start heartbeat to keep connection alive
                this.startHeartbeat();
                
                // Send session settings WITHOUT tools - we'll handle intents differently
                const sessionSettings = {
                    type: 'session_settings',
                    system_prompt: `You are Ghost, an advanced AI assistant. I have access to your memory system and can search for information when you ask.

When users ask about memories or want to search, just respond naturally and I'll help retrieve the information.

Be conversational and natural. Don't mention tools or technical details.`,
                    language_model: {
                        model_provider: 'OPEN_AI',
                        model_resource: 'gpt-4o-mini',
                        temperature: 0.7
                    }
                    // NO TOOLS - we'll intercept user messages instead
                };
                
                console.log('[HumeGhost] Sending session settings with tools:', sessionSettings);
                this.socket.send(JSON.stringify(sessionSettings));
                
                // Auto-start recording after connection is established
                console.log('[HumeGhost] Socket opened, will auto-start recording in 800ms...');
                setTimeout(async () => {
                    if (this.isConnected && !this.isRecording) {
                        console.log('[HumeGhost] Auto-starting recording from onopen...');
                        await this.startRecording();
                    }
                }, 800);
            };
            
            this.socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };
            
            this.socket.onerror = (error) => {
                console.error('[HumeGhost] WebSocket error:', error);
                this.updateButtonState('error');
            };
            
            this.socket.onclose = (event) => {
                console.log('[HumeGhost] WebSocket closed:', event.code, event.reason);
                this.isConnected = false;
                this.isRecording = false;
                this.updateButtonState('disconnected');
                this.stopHeartbeat();
                
                // Auto-reconnect if it was an unexpected disconnect
                if (event.code !== 1000 && event.code !== 1001) {
                    console.log('[HumeGhost] Unexpected disconnect, will auto-reconnect on next click');
                }
            };
            
        } catch (error) {
            console.error('[HumeGhost] Connection error:', error);
            alert('Failed to connect to Hume: ' + error.message);
            this.updateButtonState('error');
        }
    }
    
    async disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.isRecording = false;
        this.updateButtonState('disconnected');
    }
    
    async startRecording() {
        console.log('[HumeGhost] startRecording called - Connected:', this.isConnected, 'Recording:', this.isRecording);
        
        if (!this.isConnected) {
            console.log('[HumeGhost] Cannot start recording - not connected');
            return;
        }
        
        if (this.isRecording) {
            console.log('[HumeGhost] Already recording');
            return;
        }
        
        try {
            console.log('[HumeGhost] Starting recording...');
            
            // Resume audio context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('[HumeGhost] Audio context resumed');
            }
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: this.config.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    // Convert to base64 and send
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result.split(',')[1];
                        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                            this.socket.send(JSON.stringify({
                                type: 'audio_input',
                                data: base64
                            }));
                        }
                    };
                    reader.readAsDataURL(event.data);
                }
            };
            
            // Start recording with 100ms chunks
            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.updateButtonState('recording');
            
            console.log('[HumeGhost] Recording started');
            
        } catch (error) {
            console.error('[HumeGhost] Recording error:', error);
            alert('Failed to start recording: ' + error.message);
        }
    }
    
    async stopRecording() {
        if (!this.isRecording) return;
        
        console.log('[HumeGhost] Stopping recording...');
        
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.mediaRecorder = null;
        }
        
        this.isRecording = false;
        this.updateButtonState('connected');
    }
    
    async handleMemoryRequest(query) {
        console.log('[HumeGhost] Handling memory request:', query);
        
        try {
            // Call Ghost backend for memory search
            const response = await fetch('/hume_tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool_name: 'search_ghost_memory',
                    parameters: { query: query }
                })
            });
            
            const result = await response.json();
            console.log('[HumeGhost] Memory search result:', result);
            
            // Send the result as a user message to make Hume speak it
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const memoryResponse = {
                    type: 'user_input', 
                    text: `Here's what I found: ${result.result || 'No memories found.'}`
                };
                console.log('[HumeGhost] Sending memory result as user input');
                this.socket.send(JSON.stringify(memoryResponse));
            }
        } catch (error) {
            console.error('[HumeGhost] Memory request error:', error);
        }
    }
    
    async sendToGhostChat(message) {
        console.log('[HumeGhost] Sending to Ghost chat:', message);
        
        try {
            // First try to use the main chat's sendMessage function if available
            // Import sendMessage from index.js if needed
            let sendMessageFunc = window.sendMessage;
            if (!sendMessageFunc && window.indexModule) {
                sendMessageFunc = window.indexModule.sendMessage;
            }
            
            // Get the correct chat input element
            const chatInput = document.getElementById('chat-input');
            
            if (sendMessageFunc && typeof sendMessageFunc === 'function' && chatInput) {
                console.log('[HumeGhost] Using sendMessage for seamless integration');
                
                // Set the message in the input field (Ghost expects it here)
                chatInput.value = message;
                console.log('[HumeGhost] Set chat input to:', message);
                
                // Call the main sendMessage function (this handles everything)
                await sendMessageFunc();
                console.log('[HumeGhost] Called sendMessage function');
                
                // Input is cleared by sendMessage automatically
                
                // Wait for Ghost to complete processing
                let checkInterval;
                let checkCount = 0;
                const maxChecks = 30; // Max 30 seconds
                
                checkInterval = setInterval(() => {
                    checkCount++;
                    
                    // Check if Ghost is still processing (look for "Waiting for input" status)
                    const statusElement = document.querySelector('#chat-status');
                    const isWaiting = statusElement?.textContent?.includes('Waiting for input');
                    
                    // Get all messages with agent type (Ghost's responses)
                    const assistantMessages = document.querySelectorAll('.msg[data-type="agent"], .msg-agent');
                    
                    // If waiting for input (done responding) or max checks reached, get the final response
                    if (isWaiting || checkCount >= maxChecks) {
                        clearInterval(checkInterval);
                        
                        if (assistantMessages.length > 0) {
                            // Get the last assistant message (the final response)
                            const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
                            let finalResponse = lastAssistantMsg.textContent || lastAssistantMsg.innerText || '';
                            
                            // Skip if it's just a status message
                            if (finalResponse.includes('Searching for') || 
                                finalResponse.includes('Using tool') ||
                                finalResponse.includes('minimize') ||
                                finalResponse.includes('expand')) {
                                console.log('[HumeGhost] Skipping intermediate status message');
                                return;
                            }
                            
                            console.log('[HumeGhost] Got final response from UI:', finalResponse.substring(0, 100) + '...');
                            
                            // Send to Hume EVI to speak with its amazing voice
                            if (this.socket && this.socket.readyState === WebSocket.OPEN && finalResponse) {
                                console.log('[HumeGhost] Using Hume EVI voice for Ghost response');
                                
                                // Clean for speech
                                let cleanResponse = finalResponse;
                                cleanResponse = cleanResponse.replace(/```[\s\S]*?```/g, '');
                                cleanResponse = cleanResponse.replace(/[*_#]+/g, '');
                                cleanResponse = cleanResponse.replace(/https?:\/\/[^\s]+/g, 'link');
                                cleanResponse = cleanResponse.replace(/\|/g, ', '); // Replace table separators
                                cleanResponse = cleanResponse.replace(/[-]{3,}/g, ''); // Remove horizontal lines
                                
                                // Remove common UI elements
                                cleanResponse = cleanResponse.replace(/minimize|expand|Copy|content_copy|volume_up/g, '');
                                cleanResponse = cleanResponse.trim();
                                
                                if (cleanResponse.length > 500) {
                                    cleanResponse = cleanResponse.substring(0, 500) + '... I have more information if you need it.';
                                }
                                
                                // Try multiple strategies to make Hume speak verbatim
                                
                                // Send as assistant_message with role override
                                // This might make Hume speak as if it generated the response
                                const assistantMsg = {
                                    type: 'assistant_message',
                                    message: {
                                        role: 'assistant',
                                        content: cleanResponse
                                    },
                                    models: {
                                        prosody: {
                                            guidance: 1.0,  // Low guidance for more natural speech
                                            deterministic: true  // Consistent output
                                        }
                                    }
                                };
                                console.log('[HumeGhost] Sending as assistant_message to Hume');
                                this.socket.send(JSON.stringify(assistantMsg));
                                
                                // Strategy 2: Send as system message (might bypass Hume's processing)
                                setTimeout(() => {
                                    const systemMsg = {
                                        type: 'system',
                                        content: cleanResponse
                                    };
                                    console.log('[HumeGhost] Sending as system message to Hume');
                                    this.socket.send(JSON.stringify(systemMsg));
                                }, 200);
                                
                                // Strategy 3: Send as audio_input text (might trigger direct TTS)
                                setTimeout(() => {
                                    const audioMsg = {
                                        type: 'audio_input',
                                        text: cleanResponse
                                    };
                                    console.log('[HumeGhost] Sending as audio_input to Hume');
                                    this.socket.send(JSON.stringify(audioMsg));
                                }, 400);
                                
                                // Strategy 4: Use the injection approach that worked before
                                setTimeout(() => {
                                    const injectMsg = {
                                        type: 'user_input',
                                        text: `Say exactly this with no changes: "${cleanResponse}"`
                                    };
                                    console.log('[HumeGhost] Sending injection message to Hume');
                                    this.socket.send(JSON.stringify(injectMsg));
                                }, 600);
                            }
                        }
                    }
                }, 1000); // Check every second
                
                return;
            }
            
            // Fallback to direct API call if sendMessage not available
            console.log('[HumeGhost] Fallback to direct API call');
            
            // Get current context ID from the chat system
            const contextId = window.app?.chatManager?.contextId || window.contextId || '';
            
            // Get CSRF token if needed (same as main chat)
            let headers = { 'Content-Type': 'application/json' };
            
            // Check if we need CSRF token (from api.js pattern)
            if (window.getCsrfToken) {
                try {
                    const token = await window.getCsrfToken();
                    headers['X-CSRF-Token'] = token;
                } catch (e) {
                    console.warn('[HumeGhost] Could not get CSRF token:', e);
                }
            }
            
            // Send message to Ghost's main chat API (same as text input)
            const response = await fetch('/message', {
                method: 'POST',
                headers: headers,
                credentials: 'same-origin',
                body: JSON.stringify({
                    text: message,
                    context: contextId,
                    source: 'hume_voice'
                })
            });
            
            const result = await response.json();
            console.log('[HumeGhost] Ghost response:', result);
            
            // Update context ID if provided
            if (result.context) {
                window.contextId = result.context;
            }
            
            // Send Ghost's response back to Hume to speak it
            if (this.socket && this.socket.readyState === WebSocket.OPEN && result.message) {
                // Clean the response for speech (remove markdown, etc)
                let cleanResponse = result.message;
                // Remove code blocks
                cleanResponse = cleanResponse.replace(/```[\s\S]*?```/g, '');
                // Remove markdown formatting
                cleanResponse = cleanResponse.replace(/[*_#]+/g, '');
                // Remove URLs
                cleanResponse = cleanResponse.replace(/https?:\/\/[^\s]+/g, 'link');
                
                // Truncate very long responses
                if (cleanResponse.length > 500) {
                    cleanResponse = cleanResponse.substring(0, 500) + '... I have more information if you need it.';
                }
                
                // Send as assistant input to make Hume speak naturally
                // Using assistant_input type instead of user_input to avoid loops
                const speakResponse = {
                    type: 'assistant_input',
                    text: cleanResponse
                };
                console.log('[HumeGhost] Sending Ghost response to Hume for speech');
                this.socket.send(JSON.stringify(speakResponse));
            }
            
            return result;
        } catch (error) {
            console.error('[HumeGhost] Error sending to Ghost:', error);
            return null;
        }
    }
    
    async handleToolCall(toolCall) {
        console.log('[HumeGhost] Executing tool:', toolCall.name, toolCall.parameters);
        
        // Parse parameters if they're a string
        let params = toolCall.parameters;
        if (typeof params === 'string') {
            try {
                params = JSON.parse(params);
            } catch (e) {
                console.log('[HumeGhost] Parameters already parsed or invalid JSON');
            }
        }
        
        try {
            // Send tool call to Ghost backend
            const response = await fetch('/hume_tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool_name: toolCall.name,
                    parameters: params
                })
            });
            
            const result = await response.json();
            console.log('[HumeGhost] Tool result:', result);
            
            // Format the response properly for Hume
            // Hume expects the content to be a string representation
            let responseContent = '';
            if (result.result) {
                if (typeof result.result === 'string') {
                    responseContent = result.result;
                } else if (Array.isArray(result.result)) {
                    // If it's an array of memories, format nicely
                    responseContent = result.result.map(item => 
                        typeof item === 'string' ? item : JSON.stringify(item)
                    ).join('\n');
                } else {
                    responseContent = JSON.stringify(result.result);
                }
            } else {
                responseContent = JSON.stringify(result);
            }
            
            // Try the format Hume expects - tool_response with content
            const toolResponse = {
                type: 'tool_response',
                tool_call_id: toolCall.tool_call_id || toolCall.id,
                content: responseContent,
                tool_name: toolCall.name  // Add tool name for clarity
            };
            
            console.log('[HumeGhost] Sending tool response to Hume:', toolResponse);
            console.log('[HumeGhost] Response content:', responseContent);
            
            // Send result back to Hume
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(toolResponse));
                console.log('[HumeGhost] Tool response sent successfully');
                
                // HACK: Send the result as a user message to force Hume to speak it
                setTimeout(() => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        // Send the tool result as if the user is asking Hume to read it
                        const forceSpeak = {
                            type: 'user_input',
                            text: `Based on the tool result, please tell me: ${responseContent}`
                        };
                        console.log('[HumeGhost] Forcing Hume to speak result via user_input');
                        this.socket.send(JSON.stringify(forceSpeak));
                    }
                }, 300);
            } else {
                console.error('[HumeGhost] WebSocket not open, cannot send response');
            }
        } catch (error) {
            console.error('[HumeGhost] Tool execution error:', error);
            
            // Send error back to Hume
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const errorResponse = {
                    type: 'tool_error',
                    tool_call_id: toolCall.tool_call_id || toolCall.id,
                    error: error.message,
                    content: `Error: ${error.message}`
                };
                console.log('[HumeGhost] Sending error response:', errorResponse);
                this.socket.send(JSON.stringify(errorResponse));
            }
        }
    }
    
    async handleMessage(message) {
        console.log('[HumeGhost] Message:', message.type);
        
        switch (message.type) {
            case 'audio_output':
                // Play audio response
                if (message.data) {
                    this.audioPlayer.play(message.data);
                }
                break;
                
            case 'user_message':
                // User's transcribed text
                const userMessage = message.message?.content || '';
                console.log('[HumeGhost] User said:', userMessage);
                
                // Store the user's message
                this.lastUserMessage = userMessage;
                
                // ALWAYS route to Ghost for seamless integration
                // Send immediately to Ghost (don't wait for Hume's response)
                // But avoid feedback loops by checking for our own injected messages
                if (userMessage && 
                    !userMessage.startsWith("Here's what I found:") &&
                    !userMessage.startsWith("Please say:") &&
                    !userMessage.startsWith("Based on the tool result")) {
                    console.log('[HumeGhost] Sending to Ghost chat:', userMessage);
                    this.sendToGhostChat(userMessage);
                }
                break;
                
            case 'assistant_message':
                // Log Hume's response but we already sent to Ghost
                const humeResponse = message.message?.content || '';
                console.log('[HumeGhost] Hume would have said:', humeResponse);
                console.log('[HumeGhost] But we already routed to Ghost for full capabilities');
                break;
                
            case 'tool_call':
                // Hume is calling a tool - handle it locally
                console.log('[HumeGhost] Tool call received:', message);
                console.log('[HumeGhost] Message keys:', Object.keys(message));
                console.log('[HumeGhost] Full message structure:', JSON.stringify(message, null, 2));
                
                // Enhanced debugging - check all possible nested structures
                console.log('[HumeGhost] Checking message properties:');
                console.log('- message.tool_call:', message.tool_call);
                console.log('- message.tool_calls:', message.tool_calls);
                console.log('- message.function_call:', message.function_call);
                console.log('- message.name:', message.name);
                console.log('- message.function:', message.function);
                console.log('- message.tool:', message.tool);
                console.log('- message.call:', message.call);
                console.log('- message.data:', message.data);
                console.log('- message.content:', message.content);
                
                // Try multiple extraction strategies
                let toolCall = null;
                let toolName = null;
                let toolParams = null;
                
                // Strategy 1: Direct tool_call property
                if (message.tool_call) {
                    toolCall = message.tool_call;
                    toolName = toolCall.name || toolCall.function?.name;
                    toolParams = toolCall.parameters || toolCall.arguments;
                }
                
                // Strategy 2: tool_calls array
                else if (message.tool_calls && message.tool_calls.length > 0) {
                    toolCall = message.tool_calls[0];
                    toolName = toolCall.name || toolCall.function?.name;
                    toolParams = toolCall.parameters || toolCall.arguments;
                }
                
                // Strategy 3: Direct on message
                else if (message.name) {
                    toolName = message.name;
                    toolParams = message.parameters || message.arguments;
                    toolCall = { name: toolName, parameters: toolParams };
                }
                
                // Strategy 4: Nested function call
                else if (message.function_call) {
                    toolCall = message.function_call;
                    toolName = toolCall.name;
                    toolParams = toolCall.arguments;
                }
                
                console.log('[HumeGhost] Extracted - toolName:', toolName, 'toolParams:', toolParams, 'toolCall:', toolCall);
                
                if (toolName && toolCall) {
                    console.log('[HumeGhost] Executing tool:', toolName);
                    this.handleToolCall({
                        name: toolName,
                        parameters: toolParams,
                        tool_call_id: toolCall.tool_call_id || toolCall.id || 'hume-call-' + Date.now()
                    }).catch(err => {
                        console.error('[HumeGhost] Tool call error:', err);
                    });
                } else {
                    console.error('[HumeGhost] Could not extract tool call from message');
                    console.error('[HumeGhost] Message dump:', JSON.stringify(message, null, 2));
                }
                break;
                
            case 'tool_response':
                // Response from tool execution
                console.log('[HumeGhost] Tool response received from Hume:', message);
                break;
                
            case 'tool_error':
                // Tool error from Hume
                console.log('[HumeGhost] Tool error from Hume:', message);
                break;
                
            case 'user_interruption':
                // User interrupted - stop playback
                console.log('[HumeGhost] User interrupted');
                this.audioPlayer.stop();
                break;
                
            case 'error':
                console.error('[HumeGhost] Error:', message);
                break;
                
            case 'assistant_input':
                console.log('[HumeGhost] Assistant input:', message);
                break;
                
            case 'chat_update':
                console.log('[HumeGhost] Chat update:', message);
                break;
                
            default:
                console.log('[HumeGhost] Unhandled message type:', message.type, message);
                // Log the full message to understand what we're missing
                if (message.type) {
                    console.log('[HumeGhost] Full unhandled message:', JSON.stringify(message, null, 2));
                }
                break;
        }
    }
    
    updateButtonState(state) {
        if (!this.micButton) return;
        
        // Remove all state classes
        this.micButton.classList.remove('mic-inactive', 'mic-recording', 'mic-connected', 'mic-error');
        
        // Remove any inline styles
        this.micButton.style.boxShadow = '';
        
        switch (state) {
            case 'disconnected':
                this.micButton.classList.add('mic-inactive');
                this.micButton.title = 'Click to connect to Hume EVI';
                break;
            case 'connected':
                this.micButton.classList.add('mic-connected');
                this.micButton.title = 'Connected - will start recording soon';
                break;
            case 'recording':
                this.micButton.classList.add('mic-recording');
                this.micButton.title = 'Recording - Click to stop';
                break;
            case 'error':
                this.micButton.classList.add('mic-error');
                this.micButton.title = 'Error - click to reconnect';
                break;
        }
    }
    
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startHeartbeat() {
        // Send a ping every 30 seconds to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                // Send a minimal message to keep connection alive
                // Hume doesn't have a specific ping message, so we'll just check connection
                console.log('[HumeGhost] Heartbeat - connection alive');
            } else {
                console.log('[HumeGhost] Heartbeat - connection lost, stopping heartbeat');
                this.stopHeartbeat();
            }
        }, 30000); // 30 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}

// Initialize when DOM is ready
async function initHumeIntegration() {
    // First, try to import sendMessage from index.js
    try {
        const indexModule = await import('/index.js');
        if (indexModule.sendMessage) {
            window.sendMessage = indexModule.sendMessage;
            console.log('[HumeGhost] Successfully imported sendMessage from index.js');
        }
    } catch (e) {
        console.warn('[HumeGhost] Could not import sendMessage:', e);
    }
    
    // Wait a bit for Alpine.js to render the button
    setTimeout(() => {
        const button = document.getElementById('microphone-button');
        if (button) {
            console.log('[HumeGhost] Button found, initializing integration');
            window.humeGhost = new HumeGhostIntegration();
        } else {
            console.error('[HumeGhost] Button still not found after timeout');
            // Try one more time after another delay
            setTimeout(() => {
                console.log('[HumeGhost] Final attempt to initialize');
                window.humeGhost = new HumeGhostIntegration();
            }, 2000);
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHumeIntegration);
} else {
    initHumeIntegration();
}

console.log('[HumeGhost] Integration script loaded');