/**
 * Ghost Voice Integration
 * Connects the Ghost logo microphone button with Hume EVI for speech-to-speech
 */

class GhostVoiceIntegration {
    constructor() {
        this.button = null;
        this.isRecording = false;
        this.isConnected = false;
        this.statusTimeout = null;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('[Ghost Voice] Initializing...');
        
        // Get the Ghost microphone button
        this.button = document.getElementById('microphone-button');
        
        if (!this.button) {
            console.error('[Ghost Voice] Microphone button not found!');
            return;
        }
        
        // Set up click handler
        this.button.addEventListener('click', () => this.handleButtonClick());
        
        // Connect to Hume EVI on load (delayed for page load)
        setTimeout(() => this.connectToHume(), 1000);
        
        // Listen for Hume EVI events
        this.setupHumeListeners();
        
        // Set initial state
        this.updateButtonState('inactive');
    }
    
    async connectToHume() {
        if (!window.humeEVI) {
            console.error('[Ghost Voice] Hume EVI not loaded!');
            this.updateButtonState('error', 'Hume EVI not available');
            return;
        }
        
        try {
            this.updateButtonState('activating', 'Connecting...');
            const connected = await window.humeEVI.connect();
            
            if (connected) {
                this.isConnected = true;
                this.updateButtonState('ready', 'Click to speak');
                console.log('[Ghost Voice] Connected to Hume EVI');
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            console.error('[Ghost Voice] Failed to connect to Hume EVI:', error);
            this.updateButtonState('error', 'Connection failed');
            this.isConnected = false;
        }
    }
    
    setupHumeListeners() {
        // Listen for speech events from other sources (keyboard shortcuts, etc.)
        window.addEventListener('ghost-speech-start', () => {
            if (!this.isRecording) {
                this.startRecording();
            }
        });
        
        window.addEventListener('ghost-speech-stop', () => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });
        
        // Listen for Hume EVI state changes
        if (window.phantomSSE && window.phantomSSE.eventSource()) {
            const eventSource = window.phantomSSE.eventSource();
            
            eventSource.addEventListener('hume_status', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleHumeStatus(data.data);
                } catch (error) {
                    console.error('[Ghost Voice] Status parse error:', error);
                }
            });
        }
    }
    
    handleButtonClick() {
        if (!this.isConnected) {
            console.log('[Ghost Voice] Not connected, attempting to reconnect...');
            this.connectToHume();
            return;
        }
        
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    async startRecording() {
        if (!window.humeEVI || !this.isConnected) {
            console.error('[Ghost Voice] Cannot start recording - not connected');
            this.updateButtonState('error', 'Not connected');
            return;
        }
        
        try {
            console.log('[Ghost Voice] Starting recording...');
            this.isRecording = true;
            this.updateButtonState('recording', 'Recording...');
            
            // Start Hume EVI recording
            await window.humeEVI.startRecording();
            
            // Trigger event for other components
            window.dispatchEvent(new CustomEvent('ghost-recording-started'));
            
        } catch (error) {
            console.error('[Ghost Voice] Failed to start recording:', error);
            this.isRecording = false;
            this.updateButtonState('error', 'Recording failed');
        }
    }
    
    stopRecording() {
        if (!window.humeEVI) {
            return;
        }
        
        console.log('[Ghost Voice] Stopping recording...');
        this.isRecording = false;
        
        // Stop Hume EVI recording
        window.humeEVI.stopRecording();
        
        // Update button state
        this.updateButtonState('processing', 'Processing...');
        
        // Trigger event for other components
        window.dispatchEvent(new CustomEvent('ghost-recording-stopped'));
        
        // Reset to ready state after a moment
        setTimeout(() => {
            if (!this.isRecording) {
                this.updateButtonState('ready', 'Click to speak');
            }
        }, 1000);
    }
    
    handleHumeStatus(status) {
        console.log('[Ghost Voice] Hume status:', status);
        
        switch (status.state) {
            case 'connected':
                this.isConnected = true;
                if (!this.isRecording) {
                    this.updateButtonState('ready', 'Click to speak');
                }
                break;
                
            case 'disconnected':
                this.isConnected = false;
                this.isRecording = false;
                this.updateButtonState('inactive', 'Disconnected');
                break;
                
            case 'speaking':
                this.updateButtonState('speaking', 'Ghost is speaking');
                break;
                
            case 'listening':
                this.updateButtonState('listening', 'Listening...');
                break;
                
            case 'processing':
                this.updateButtonState('processing', 'Thinking...');
                break;
                
            case 'error':
                this.updateButtonState('error', status.message || 'Error');
                break;
        }
    }
    
    updateButtonState(state, statusText = '') {
        if (!this.button) return;
        
        // Remove all state classes
        const stateClasses = [
            'mic-inactive', 'mic-activating', 'mic-recording',
            'mic-listening', 'mic-processing', 'mic-waiting',
            'hume-connected', 'hume-speaking'
        ];
        
        stateClasses.forEach(cls => this.button.classList.remove(cls));
        
        // Add new state class
        const classMap = {
            'inactive': 'mic-inactive',
            'activating': 'mic-activating',
            'ready': 'hume-connected',
            'recording': 'mic-recording',
            'listening': 'mic-listening',
            'processing': 'mic-processing',
            'speaking': 'hume-speaking',
            'error': 'mic-inactive'
        };
        
        const stateClass = classMap[state] || 'mic-inactive';
        this.button.classList.add(stateClass);
        
        // Update status text
        if (statusText) {
            this.button.setAttribute('data-status', statusText);
        }
        
        // Update button enabled state
        if (state === 'error' || state === 'inactive') {
            this.button.disabled = true;
            // Try to reconnect after 3 seconds
            if (!this.statusTimeout) {
                this.statusTimeout = setTimeout(() => {
                    this.statusTimeout = null;
                    this.connectToHume();
                }, 3000);
            }
        } else {
            this.button.disabled = false;
        }
        
        console.log(`[Ghost Voice] Button state: ${state} (${statusText})`);
    }
    
    // Keyboard shortcut support
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + Space to toggle recording
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
                e.preventDefault();
                this.handleButtonClick();
            }
        });
    }
}

// Initialize Ghost Voice Integration
window.ghostVoice = new GhostVoiceIntegration();

// Export for use in other scripts
window.GhostVoiceIntegration = GhostVoiceIntegration;