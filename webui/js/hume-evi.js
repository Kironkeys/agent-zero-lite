/**
 * Hume EVI (Empathic Voice Interface) Integration for Ghost v9
 * Replaces the existing TTS system with speech-to-speech capabilities
 */

class HumeEVI {
    constructor() {
        this.connected = false;
        this.chatId = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioQueue = [];
        this.isPlaying = false;
        this.currentEmotions = {};
        this.ws = null;
        this.audioStream = null;
        
        // Configuration
        this.config = {
            sampleRate: 16000,
            channels: 1,
            encoding: 'pcm_s16le'
        };
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.speakText = this.speakText.bind(this);
        
        // Initialize audio context
        this.initAudioContext();
        
        // Set up SSE listener for backend notifications
        this.setupSSEListener();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.config.sampleRate
            });
            console.log('[HumeEVI] Audio context initialized');
        } catch (error) {
            console.error('[HumeEVI] Failed to initialize audio context:', error);
        }
    }
    
    setupSSEListener() {
        // Listen for Hume EVI updates via SSE
        if (window.phantomSSE && window.phantomSSE.eventSource()) {
            const eventSource = window.phantomSSE.eventSource();
            
            eventSource.addEventListener('hume_evi', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSSEUpdate(data.data);
                } catch (error) {
                    console.error('[HumeEVI] SSE parse error:', error);
                }
            });
        }
    }
    
    handleSSEUpdate(data) {
        console.log('[HumeEVI] SSE Update:', data);
        
        switch (data.type) {
            case 'message':
                this.handleMessage(data);
                break;
            case 'audio_available':
                this.fetchAndPlayAudio();
                break;
            case 'error':
                this.handleError(data);
                break;
        }
    }
    
    async connect() {
        try {
            console.log('[HumeEVI] Connecting to Hume EVI...');
            
            // First, connect via HTTP endpoint
            const response = await fetch('/hume_evi_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.connected = true;
                this.chatId = result.chat_id;
                console.log('[HumeEVI] Connected successfully:', result);
                
                // Update UI
                this.updateUI('connected');
                
                // Set up WebSocket for audio streaming
                this.setupWebSocket();
                
                return true;
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (error) {
            console.error('[HumeEVI] Connection error:', error);
            this.updateUI('error', error.message);
            return false;
        }
    }
    
    setupWebSocket() {
        try {
            // Create WebSocket connection directly to Hume API
            const wsUrl = this.connectionInfo.websocket_url || 'wss://api.hume.ai/v0/evi/chat';
            
            // Add authentication to WebSocket URL
            const url = new URL(wsUrl);
            url.searchParams.append('access_token', this.connectionInfo.access_token);
            if (this.connectionInfo.config_id) {
                url.searchParams.append('config_id', this.connectionInfo.config_id);
            }
            
            this.ws = new WebSocket(url.toString());
            
            this.ws.onopen = () => {
                console.log('[HumeEVI] WebSocket connected');
            };
            
            this.ws.onmessage = async (event) => {
                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } else {
                    // Binary audio data
                    this.handleAudioData(event.data);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('[HumeEVI] WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('[HumeEVI] WebSocket closed');
                this.ws = null;
            };
            
        } catch (error) {
            console.error('[HumeEVI] WebSocket setup error:', error);
        }
    }
    
    async disconnect() {
        try {
            console.log('[HumeEVI] Disconnecting...');
            
            // Stop any ongoing recording
            this.stopRecording();
            
            // Close WebSocket
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            
            // Disconnect via HTTP endpoint
            const response = await fetch('/hume_evi_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' })
            });
            
            const result = await response.json();
            
            this.connected = false;
            this.chatId = null;
            this.updateUI('disconnected');
            
            console.log('[HumeEVI] Disconnected:', result);
            
        } catch (error) {
            console.error('[HumeEVI] Disconnect error:', error);
        }
    }
    
    async startRecording() {
        try {
            if (!this.connected) {
                console.error('[HumeEVI] Not connected to EVI');
                return;
            }
            
            console.log('[HumeEVI] Starting recording...');
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: this.config.channels,
                    sampleRate: this.config.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.audioStream = stream;
            
            // Create MediaRecorder for capturing audio
            const mimeType = 'audio/webm;codecs=pcm';
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm'
            });
            
            // Handle audio data
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    // Convert to PCM and send via WebSocket
                    const arrayBuffer = await event.data.arrayBuffer();
                    const pcmData = await this.convertToPCM(arrayBuffer);
                    this.ws.send(pcmData);
                }
            };
            
            // Start recording with 100ms chunks
            this.mediaRecorder.start(100);
            this.updateUI('recording');
            
            console.log('[HumeEVI] Recording started');
            
        } catch (error) {
            console.error('[HumeEVI] Recording error:', error);
            this.updateUI('error', 'Microphone access denied');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
            
            // Stop audio stream
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            this.updateUI('connected');
            console.log('[HumeEVI] Recording stopped');
        }
    }
    
    async convertToPCM(arrayBuffer) {
        // Convert WebM audio to PCM format expected by Hume
        // This is a simplified version - you might need a proper decoder
        const audioContext = new OfflineAudioContext(1, 1, this.config.sampleRate);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const pcmData = audioBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array
        const int16Data = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            const s = Math.max(-1, Math.min(1, pcmData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        return int16Data.buffer;
    }
    
    async speakText(text) {
        // For Ghost responses, convert text to speech via EVI
        // This would typically be handled by the backend sending audio
        console.log('[HumeEVI] Speaking text:', text);
        
        // The backend should handle this and send audio via SSE
        // For now, we'll just log it
    }
    
    async fetchAndPlayAudio() {
        try {
            // Fetch audio from backend queue
            const response = await fetch('/hume_evi_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_audio' })
            });
            
            const result = await response.json();
            
            if (result.audio) {
                // Decode base64 audio and add to queue
                const audioData = atob(result.audio);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                
                for (let i = 0; i < audioData.length; i++) {
                    uint8Array[i] = audioData.charCodeAt(i);
                }
                
                this.audioQueue.push(arrayBuffer);
                
                if (!this.isPlaying) {
                    this.playNextAudio();
                }
            }
        } catch (error) {
            console.error('[HumeEVI] Fetch audio error:', error);
        }
    }
    
    async playNextAudio() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const audioData = this.audioQueue.shift();
        
        try {
            // Decode and play audio
            const audioBuffer = await this.audioContext.decodeAudioData(audioData);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            source.onended = () => {
                // Play next audio in queue
                this.playNextAudio();
            };
            
            source.start(0);
            
        } catch (error) {
            console.error('[HumeEVI] Audio playback error:', error);
            this.isPlaying = false;
        }
    }
    
    handleMessage(data) {
        // Display message and emotions in UI
        console.log(`[HumeEVI] ${data.role}: ${data.content}`);
        console.log('[HumeEVI] Emotions:', data.emotions);
        
        this.currentEmotions = data.emotions;
        
        // Update emotion display
        this.updateEmotionDisplay(data.emotions);
    }
    
    handleError(data) {
        console.error(`[HumeEVI] Error ${data.code}: ${data.message}`);
        this.updateUI('error', data.message);
    }
    
    handleWebSocketMessage(data) {
        if (data.type === 'audio_output') {
            // Handle audio from WebSocket
            const audioData = atob(data.data);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }
            
            this.audioQueue.push(arrayBuffer);
            
            if (!this.isPlaying) {
                this.playNextAudio();
            }
        }
    }
    
    updateUI(state, message = '') {
        // Update UI elements based on state
        const statusElement = document.getElementById('hume-status');
        const recordButton = document.getElementById('hume-record-btn');
        
        if (statusElement) {
            switch (state) {
                case 'connected':
                    statusElement.textContent = 'Connected to Hume EVI';
                    statusElement.className = 'hume-status connected';
                    break;
                case 'disconnected':
                    statusElement.textContent = 'Disconnected';
                    statusElement.className = 'hume-status disconnected';
                    break;
                case 'recording':
                    statusElement.textContent = 'Recording...';
                    statusElement.className = 'hume-status recording';
                    break;
                case 'error':
                    statusElement.textContent = `Error: ${message}`;
                    statusElement.className = 'hume-status error';
                    break;
            }
        }
        
        if (recordButton) {
            recordButton.disabled = !this.connected;
            recordButton.textContent = state === 'recording' ? 'Stop' : 'Start Recording';
        }
    }
    
    updateEmotionDisplay(emotions) {
        const emotionContainer = document.getElementById('hume-emotions');
        if (!emotionContainer) return;
        
        // Clear existing emotions
        emotionContainer.innerHTML = '';
        
        // Display top emotions
        Object.entries(emotions).forEach(([emotion, score]) => {
            const emotionElement = document.createElement('div');
            emotionElement.className = 'emotion-score';
            emotionElement.innerHTML = `
                <span class="emotion-name">${emotion}</span>
                <div class="emotion-bar">
                    <div class="emotion-fill" style="width: ${score * 100}%"></div>
                </div>
                <span class="emotion-value">${score.toFixed(2)}</span>
            `;
            emotionContainer.appendChild(emotionElement);
        });
    }
    
    // Get current status
    async getStatus() {
        try {
            const response = await fetch('/hume_evi_direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' })
            });
            
            return await response.json();
        } catch (error) {
            console.error('[HumeEVI] Status error:', error);
            return { connected: false, error: error.message };
        }
    }
}

// Initialize Hume EVI
window.humeEVI = new HumeEVI();

// Export for use in other scripts
window.HumeEVI = HumeEVI;