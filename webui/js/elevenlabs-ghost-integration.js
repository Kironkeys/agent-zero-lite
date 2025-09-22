/**
 * ElevenLabs Conversational AI Integration for Ghost v9
 * WebSocket-based speech-to-speech with tool calling
 */

import { sendMessage, updateChatInput } from '../index.js';

class ElevenLabsGhostIntegration {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isRecording = false;
        this.isSpeaking = false;
        this.button = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioQueue = [];
        this.isPlaying = false;
        
        // ElevenLabs configuration
        this.apiKey = null;
        this.voiceId = null;
        this.agentId = null;
        this.signedUrl = null;
        
        // Audio settings
        this.sampleRate = 16000; // ElevenLabs requires 16kHz
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('[ElevenLabs-Ghost] Initializing...');
        
        // Get button
        this.button = document.getElementById('elevenlabs-button');
        if (!this.button) {
            console.error('[ElevenLabs-Ghost] ElevenLabs button not found!');
            return;
        }
        
        // Get API credentials from backend
        await this.loadCredentials();
        
        // Pre-fetch signed URL for faster connection
        this.prefetchSignedUrl();
        
        // Set up button handler
        this.setupButtonHandler();
        
        // Initialize audio context
        this.initAudioContext();
        
        // Set initial UI state
        this.updateUIState();
    }
    
    async prefetchSignedUrl() {
        // Pre-fetch the signed URL in background for instant connection
        if (this.agentId && this.apiKey) {
            try {
                console.log('[ElevenLabs-Ghost] Pre-fetching signed URL...');
                const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${this.agentId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'xi-api-key': this.apiKey
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.signedUrl = data.signed_url;
                    this.signedUrlTimestamp = Date.now();
                    console.log('[ElevenLabs-Ghost] Pre-fetched signed URL for instant connection');
                    
                    // Refresh URL every 50 seconds (they expire after ~60)
                    if (this.prefetchTimer) {
                        clearTimeout(this.prefetchTimer);
                    }
                    this.prefetchTimer = setTimeout(() => {
                        this.prefetchSignedUrl();
                    }, 50000);
                } else {
                    console.error('[ElevenLabs-Ghost] Failed to pre-fetch:', response.status);
                }
            } catch (error) {
                console.error('[ElevenLabs-Ghost] Pre-fetch error:', error);
                // Retry in 5 seconds
                setTimeout(() => {
                    this.prefetchSignedUrl();
                }, 5000);
            }
        }
    }
    
    async loadCredentials() {
        try {
            const response = await fetch('/api/elevenlabs/credentials');
            const data = await response.json();
            this.apiKey = data.apiKey;
            this.voiceId = data.voiceId || '71rg5fZp3CKz6u0BoSGV';
            this.agentId = data.agentId;
            
            // If no agent ID, we'll need to create one
            if (!this.agentId) {
                console.log('[ElevenLabs-Ghost] No agent ID found, will create one');
                await this.createAgent();
            } else {
                console.log('[ElevenLabs-Ghost] Using existing agent:', this.agentId);
            }
            
            console.log('[ElevenLabs-Ghost] Credentials loaded');
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Failed to load credentials:', error);
            // Use defaults from environment if available
            this.voiceId = '71rg5fZp3CKz6u0BoSGV';
        }
    }
    
    async createAgent() {
        try {
            console.log('[ElevenLabs-Ghost] Creating new agent...');
            
            const agentConfig = {
                conversation_config: {
                    agent: {
                        prompt: {
                            prompt: "You are Ghost, an AI assistant integrated with a powerful system. You have access to various tools and can help with any task. Respond naturally and conversationally.",
                            tools: this.getToolDefinitions()
                        },
                        language: 'en',
                        voice: {
                            voice_id: this.voiceId,
                            model_id: 'eleven_flash_v2_5',
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: 0.0,
                            use_speaker_boost: true
                        }
                    }
                },
                name: "Ghost Assistant"
            };
            
            const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(agentConfig)
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to create agent: ${response.status} - ${error}`);
            }
            
            const data = await response.json();
            this.agentId = data.agent_id;
            console.log('[ElevenLabs-Ghost] Agent created:', this.agentId);
            
            // Save agent ID for future use
            await this.saveAgentId(this.agentId);
            
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Failed to create agent:', error);
            throw error;
        }
    }
    
    async saveAgentId(agentId) {
        try {
            // Save agent ID to backend for persistence
            await fetch('/api/elevenlabs/save-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agentId })
            });
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Failed to save agent ID:', error);
        }
    }
    
    async getSignedUrl() {
        try {
            if (!this.agentId) {
                throw new Error('No agent ID available');
            }
            
            // Get signed URL from ElevenLabs API with agent_id parameter
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
            this.signedUrl = data.signed_url;
            this.signedUrlTimestamp = Date.now();
            return this.signedUrl;
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Failed to get signed URL:', error);
            throw error;
        }
    }
    
    async connect() {
        if (this.isConnected || this.ws) {
            console.log('[ElevenLabs-Ghost] Already connected');
            return;
        }
        
        try {
            this.updateUIState('connecting');
            
            // Use pre-fetched URL if available and fresh, otherwise fetch now
            let signedUrl = this.signedUrl;
            const urlAge = this.signedUrlTimestamp ? Date.now() - this.signedUrlTimestamp : Infinity;
            
            // Refresh if URL is older than 50 seconds or doesn't exist
            if (!signedUrl || urlAge > 50000) {
                console.log('[ElevenLabs-Ghost] Fetching fresh signed URL...');
                signedUrl = await this.getSignedUrl();
            } else {
                console.log(`[ElevenLabs-Ghost] Using pre-fetched URL (${Math.round(urlAge/1000)}s old)`);
            }
            
            console.log('[ElevenLabs-Ghost] Connecting to WebSocket...');
            this.ws = new WebSocket(signedUrl);
            this.ws.binaryType = 'arraybuffer';
            
            this.ws.onopen = () => {
                console.log('[ElevenLabs-Ghost] WebSocket connected');
                this.isConnected = true;
                
                // Send initial configuration
                this.sendConfiguration();
                
                this.updateUIState('connected');
                this.showToast('Connected to ElevenLabs', 'success');
            };
            
            this.ws.onmessage = async (event) => {
                await this.handleMessage(event.data);
            };
            
            this.ws.onerror = (error) => {
                console.error('[ElevenLabs-Ghost] WebSocket error:', error);
                this.showToast('Connection error', 'error');
                this.updateUIState('error');
            };
            
            this.ws.onclose = () => {
                console.log('[ElevenLabs-Ghost] WebSocket closed');
                this.isConnected = false;
                this.isRecording = false;
                this.isSpeaking = false;
                this.ws = null;
                this.updateUIState('inactive');
            };
            
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Connection failed:', error);
            this.showToast('Failed to connect', 'error');
            this.updateUIState('inactive');
        }
    }
    
    sendConfiguration() {
        // Send initial conversation configuration with VAD enabled
        const config = {
            type: 'conversation_initiation_client_data',
            conversation_config: {
                agent: {
                    prompt: {
                        prompt: "You are Ghost, an AI assistant integrated with a powerful system. You have access to various tools and can help with any task. Respond naturally and conversationally.",
                        tools: this.getToolDefinitions()
                    },
                    language: 'en',
                    voice: {
                        voice_id: this.voiceId,
                        model_id: 'eleven_flash_v2_5',
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0, // Can be adjusted for emotion (0-1)
                        use_speaker_boost: true
                    }
                },
                // Enable VAD for automatic silence detection
                vad: {
                    enabled: true,
                    silence_duration_ms: 1000, // Stop after 1 second of silence
                    speech_threshold: 0.5 // Sensitivity for voice detection
                }
            }
        };
        
        this.ws.send(JSON.stringify(config));
        console.log('[ElevenLabs-Ghost] Configuration sent');
    }
    
    getToolDefinitions() {
        // Define tools that ElevenLabs can call
        // These will be handled client-side and passed to Ghost
        return [
            {
                type: 'function',
                name: 'execute_ghost_command',
                description: 'Execute any command or query through the Ghost system',
                parameters: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description: 'The command or query to execute'
                        }
                    },
                    required: ['command']
                }
            },
            {
                type: 'function',
                name: 'search_memory',
                description: 'Search Ghost\'s memory system',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query'
                        }
                    },
                    required: ['query']
                }
            }
        ];
    }
    
    async handleMessage(data) {
        if (typeof data === 'string') {
            // Text message
            const message = JSON.parse(data);
            this.handleTextMessage(message);
        } else if (data instanceof ArrayBuffer) {
            // Binary audio data - ElevenLabs sends raw PCM16 audio
            console.log('[ElevenLabs-Ghost] Received audio data:', data.byteLength, 'bytes');
            await this.handleAudioData(data);
        } else {
            console.log('[ElevenLabs-Ghost] Unknown data type:', typeof data, data);
        }
    }
    
    handleTextMessage(message) {
        console.log('[ElevenLabs-Ghost] Message:', message);
        
        // Check for audio data in various possible fields
        const audioFields = ['audio', 'audio_chunk', 'output_audio_chunk', 'audio_data', 'audio_base64'];
        for (const field of audioFields) {
            if (message[field]) {
                console.log(`[ElevenLabs-Ghost] Found audio in field: ${field}`);
                // Audio is base64 encoded
                const arrayBuffer = this.base64ToArrayBuffer(message[field]);
                this.handleAudioData(arrayBuffer);
                // Don't return here - message might have other data too
            }
        }
        
        switch (message.type) {
            case 'conversation_initiation_metadata':
            case 'conversation_initiation_data':
                console.log('[ElevenLabs-Ghost] Conversation initialized:', message.conversation_id);
                this.conversationId = message.conversation_id;
                break;
                
            case 'audio_event':
                if (message.audio_event && message.audio_event.type === 'started') {
                    this.isSpeaking = true;
                    this.updateUIState('speaking');
                } else if (message.audio_event && message.audio_event.type === 'stopped') {
                    this.isSpeaking = false;
                    this.updateUIState('listening');
                }
                break;
                
            case 'user_transcript':
                // User's speech transcribed
                console.log('[ElevenLabs-Ghost] User said:', message.transcript || message.text);
                // Update UI to show we're processing
                if ((message.transcript || message.text) && (message.transcript || message.text).trim()) {
                    this.updateUIState('processing');
                }
                break;
                
            case 'agent_response':
            case 'assistant_message':
                // Agent's text response
                console.log('[ElevenLabs-Ghost] Agent response:', message.text || message.message);
                break;
                
            case 'tool_call':
                // Tool call request from ElevenLabs
                this.handleToolCall(message);
                break;
                
            case 'interruption':
                // User interrupted the agent
                this.stopAudio();
                this.updateUIState('listening');
                break;
                
            case 'vad_event':
                // Voice Activity Detection events
                if (message.vad_event && message.vad_event.type === 'speech_start') {
                    this.updateUIState('recording');
                } else if (message.vad_event && message.vad_event.type === 'speech_stop') {
                    this.updateUIState('processing');
                }
                break;
                
            case 'error':
                console.error('[ElevenLabs-Ghost] Error:', message.error || message.message);
                this.showToast(`Error: ${message.error || message.message}`, 'error');
                break;
                
            case 'audio':
                // Audio message type
                console.log('[ElevenLabs-Ghost] Audio message received, checking for data...');
                // Log all keys to see what field contains the audio
                const messageKeys = Object.keys(message);
                console.log('[ElevenLabs-Ghost] Message keys:', messageKeys.join(', '));
                console.log('[ElevenLabs-Ghost] Full message:', message);
                
                // Check each key for audio data
                for (const key of messageKeys) {
                    if (key !== 'type' && message[key]) {
                        console.log(`[ElevenLabs-Ghost] Checking field "${key}":`, typeof message[key], message[key].substring ? message[key].substring(0, 50) + '...' : 'not a string');
                        
                        // Try to decode as base64 audio
                        if (typeof message[key] === 'string' && message[key].length > 100) {
                            console.log(`[ElevenLabs-Ghost] Attempting to play audio from field: ${key}`);
                            try {
                                const arrayBuffer = this.base64ToArrayBuffer(message[key]);
                                await this.handleAudioData(arrayBuffer);
                                console.log('[ElevenLabs-Ghost] Audio sent to playback queue');
                                break; // Stop after first audio field
                            } catch (e) {
                                console.error(`[ElevenLabs-Ghost] Failed to decode ${key}:`, e);
                            }
                        }
                    }
                }
                break;
                
            default:
                // Log any unhandled message types for debugging
                if (message.type) {
                    console.log('[ElevenLabs-Ghost] Unhandled message type:', message.type, message);
                }
        }
    }
    
    async handleToolCall(message) {
        console.log('[ElevenLabs-Ghost] Tool call:', message);
        
        const { tool_name, parameters, call_id } = message;
        
        try {
            let result;
            
            switch (tool_name) {
                case 'execute_ghost_command':
                    // Send command to Ghost via text input
                    result = await this.executeGhostCommand(parameters.command);
                    break;
                    
                case 'search_memory':
                    // Search Ghost's memory
                    result = await this.searchGhostMemory(parameters.query);
                    break;
                    
                default:
                    result = { error: `Unknown tool: ${tool_name}` };
            }
            
            // Send tool response back to ElevenLabs
            this.sendToolResponse(call_id, result);
            
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Tool call error:', error);
            this.sendToolResponse(call_id, { error: error.message });
        }
    }
    
    async executeGhostCommand(command) {
        // Send command to Ghost through the chat interface
        console.log('[ElevenLabs-Ghost] Executing Ghost command:', command);
        
        // Update chat input and send
        updateChatInput(command);
        await sendMessage();
        
        // Wait for response (simplified - in production would track response)
        return { success: true, message: 'Command sent to Ghost' };
    }
    
    async searchGhostMemory(query) {
        // Search Ghost's memory system
        console.log('[ElevenLabs-Ghost] Searching memory:', query);
        
        // Send search command to Ghost
        const searchCommand = `search memory for: ${query}`;
        return await this.executeGhostCommand(searchCommand);
    }
    
    sendToolResponse(callId, result) {
        const response = {
            type: 'tool_response',
            call_id: callId,
            result: JSON.stringify(result)
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(response));
            console.log('[ElevenLabs-Ghost] Tool response sent:', response);
        }
    }
    
    async handleAudioData(arrayBuffer) {
        console.log('[ElevenLabs-Ghost] Processing audio data, size:', arrayBuffer.byteLength);
        
        // Ensure playback context is initialized and resumed
        if (!this.playbackContext) {
            this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
            console.log('[ElevenLabs-Ghost] Created playback context with sample rate:', this.sampleRate);
        }
        
        // Resume context if suspended (Chrome requirement)
        if (this.playbackContext.state === 'suspended') {
            await this.playbackContext.resume();
            console.log('[ElevenLabs-Ghost] Resumed playback context');
        }
        
        // Convert ArrayBuffer to base64 for audio playback
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        this.audioQueue.push(base64);
        console.log('[ElevenLabs-Ghost] Audio queued, queue size:', this.audioQueue.length);
        
        if (!this.isPlaying) {
            this.playNextAudio();
        }
    }
    
    async startRecording() {
        if (!this.isConnected || this.isRecording) return;
        
        try {
            console.log('[ElevenLabs-Ghost] Starting continuous recording with VAD...');
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Use Web Audio API for real-time PCM conversion
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: this.sampleRate
                });
            }
            
            // Create source from microphone
            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Create ScriptProcessor for real-time processing (will be replaced with AudioWorklet later)
            const bufferSize = 4096; // Good balance for real-time processing
            this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            
            // Process audio in real-time
            this.scriptProcessor.onaudioprocess = (event) => {
                if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
                
                // Get the input audio data (Float32Array)
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert Float32 to Int16 PCM
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                // Send PCM16 data
                this.sendAudioData(pcm16.buffer);
            };
            
            // Connect the audio graph
            source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);
            
            // Store stream for cleanup
            this.mediaStream = stream;
            this.isRecording = true;
            this.updateUIState('listening');
            
            console.log('[ElevenLabs-Ghost] Continuous recording started with VAD');
            this.showToast('Listening... Speak anytime', 'info');
            
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Failed to start recording:', error);
            this.showToast('Failed to access microphone', 'error');
        }
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        console.log('[ElevenLabs-Ghost] Stopping recording...');
        
        // Disconnect audio nodes
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        this.isRecording = false;
        
        // Send end of audio marker
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'audio_input_end' }));
        }
        
        this.updateUIState('listening');
        console.log('[ElevenLabs-Ghost] Recording stopped');
    }
    
    
    sendAudioData(pcm16Buffer) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // Convert to base64
        const base64 = this.arrayBufferToBase64(pcm16Buffer);
        
        // Send audio chunk in ElevenLabs Conversational AI format
        const audioMessage = {
            user_audio_chunk: base64
        };
        
        this.ws.send(JSON.stringify(audioMessage));
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    async playNextAudio() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            console.log('[ElevenLabs-Ghost] Audio queue empty, stopping playback');
            return;
        }
        
        this.isPlaying = true;
        const base64Audio = this.audioQueue.shift();
        console.log('[ElevenLabs-Ghost] Playing audio, remaining in queue:', this.audioQueue.length);
        
        try {
            const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
            console.log('[ElevenLabs-Ghost] Decoded audio buffer size:', arrayBuffer.byteLength);
            
            // Create or reuse audio context for playback
            if (!this.playbackContext) {
                this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
                console.log('[ElevenLabs-Ghost] Created playback context');
            }
            
            // Resume context if suspended
            if (this.playbackContext.state === 'suspended') {
                await this.playbackContext.resume();
                console.log('[ElevenLabs-Ghost] Resumed suspended context');
            }
            
            // ElevenLabs sends raw PCM16 audio at 16kHz
            // Convert raw PCM16 to Float32Array for Web Audio API
            const int16Array = new Int16Array(arrayBuffer);
            const float32Array = new Float32Array(int16Array.length);
            
            console.log('[ElevenLabs-Ghost] Converting PCM16 samples:', int16Array.length);
            
            for (let i = 0; i < int16Array.length; i++) {
                // Convert int16 to float32 (-1 to 1 range)
                float32Array[i] = int16Array[i] / 32768.0;
            }
            
            // Create AudioBuffer from the float32 data
            const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, this.sampleRate);
            audioBuffer.getChannelData(0).set(float32Array);
            
            console.log('[ElevenLabs-Ghost] Created audio buffer, duration:', audioBuffer.duration, 'seconds');
            
            const source = this.playbackContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Add gain node for volume control and debugging
            const gainNode = this.playbackContext.createGain();
            gainNode.gain.value = 1.0;
            
            source.connect(gainNode);
            gainNode.connect(this.playbackContext.destination);
            
            source.onended = () => {
                console.log('[ElevenLabs-Ghost] Audio chunk finished playing');
                this.playNextAudio();
            };
            
            source.start(0);
            console.log('[ElevenLabs-Ghost] Started audio playback');
            
        } catch (error) {
            console.error('[ElevenLabs-Ghost] Audio playback error:', error, error.stack);
            this.playNextAudio(); // Skip to next
        }
    }
    
    stopAudio() {
        this.audioQueue = [];
        this.isPlaying = false;
    }
    
    async disconnect() {
        console.log('[ElevenLabs-Ghost] Disconnecting...');
        
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Stop audio playback
        this.stopAudio();
        
        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.updateUIState('inactive');
        console.log('[ElevenLabs-Ghost] Disconnected');
    }
    
    setupButtonHandler() {
        this.button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!this.isConnected) {
                // Connect and immediately start recording with VAD
                await this.connect();
                // Auto-start recording after connection with VAD
                setTimeout(() => {
                    if (this.isConnected) {
                        this.startRecording();
                    }
                }, 500);
            } else if (this.isConnected) {
                // Toggle connection - disconnect if already connected
                await this.disconnect();
            }
        });
    }
    
    initAudioContext() {
        // Initialize audio context for audio processing (will be created when needed)
        // We don't create it here to avoid Chrome's AudioContext limit
        this.audioContext = null;
    }
    
    updateUIState(state = null) {
        if (!this.button) return;
        
        // Remove all state classes
        this.button.classList.remove(
            'elevenlabs-inactive',
            'elevenlabs-connecting',
            'elevenlabs-connected',
            'elevenlabs-listening',
            'elevenlabs-recording',
            'elevenlabs-speaking',
            'elevenlabs-processing',
            'elevenlabs-error'
        );
        
        // Determine state
        if (state) {
            this.button.classList.add(`elevenlabs-${state}`);
        } else if (!this.isConnected) {
            this.button.classList.add('elevenlabs-inactive');
        } else if (this.isRecording) {
            this.button.classList.add('elevenlabs-recording');
        } else if (this.isSpeaking) {
            this.button.classList.add('elevenlabs-speaking');
        } else {
            this.button.classList.add('elevenlabs-connected');
        }
        
        // Update status text based on state
        let statusText = 'Click to connect';
        if (state === 'listening') {
            statusText = 'Listening... Speak anytime';
        } else if (state === 'recording') {
            statusText = 'Recording your speech...';
        } else if (state === 'processing') {
            statusText = 'Processing...';
        } else if (state === 'speaking') {
            statusText = 'ElevenLabs is speaking';
        } else if (state === 'connecting') {
            statusText = 'Connecting...';
        } else if (state === 'error') {
            statusText = 'Connection error';
        } else if (this.isConnected) {
            statusText = 'Click to disconnect';
        }
        
        this.button.setAttribute('data-status', statusText);
    }
    
    showToast(message, type = 'info') {
        // Use Ghost's toast system if available
        if (window.toastMessage) {
            window.toastMessage(message);
        } else {
            console.log(`[ElevenLabs-Ghost] ${type}: ${message}`);
        }
    }
}

// Initialize the integration
window.elevenLabsGhost = new ElevenLabsGhostIntegration();

// Export for debugging
export default ElevenLabsGhostIntegration;