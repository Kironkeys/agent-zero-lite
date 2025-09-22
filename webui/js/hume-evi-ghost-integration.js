/**
 * Hume EVI Integration for Ghost v9
 * Replaces microphone functionality with EVI speech-to-speech
 */

import { sendMessage, updateChatInput } from '../index.js';

class HumeEVIGhostIntegration {
    constructor() {
        this.humeEVI = null;
        this.isConnected = false;
        this.isRecording = false;
        this.micButton = null;
        this.endChatButton = null;
        this.isAutoConnecting = false;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('[HumeEVI-Ghost] Initializing...');
        
        // Get microphone button
        this.micButton = document.getElementById('microphone-button');
        if (!this.micButton) {
            console.error('[HumeEVI-Ghost] Microphone button not found!');
            return;
        }
        
        // Create end chat button
        this.createEndChatButton();
        
        // Initialize Hume EVI
        this.initHumeEVI();
        
        // Set up button handlers
        this.setupButtonHandlers();
        
        // Set initial UI state
        this.updateUIState();
        
        // Don't auto-connect - wait for user to click
    }
    
    initHumeEVI() {
        if (!window.HumeEVIComplete) {
            console.error('[HumeEVI-Ghost] HumeEVIComplete not found! Make sure hume-evi-complete.js is loaded.');
            return;
        }
        
        this.humeEVI = new window.HumeEVIComplete();
        
        // Set up event handlers
        this.humeEVI.onConnectionStateChange = (connected, error) => {
            this.isConnected = connected;
            this.updateUIState();
            
            if (connected) {
                console.log(`[HumeEVI-Ghost] Connected! Chat ID: ${this.humeEVI.chatId}`);
                this.showToast('Connected to Hume EVI', 'success');
            } else {
                console.log('[HumeEVI-Ghost] Disconnected');
                if (error) {
                    console.error('[HumeEVI-Ghost] Connection error:', error);
                    this.showToast(`Connection error: ${error}`, 'error');
                }
            }
        };
        
        this.humeEVI.onRecordingStateChange = (recording, error) => {
            this.isRecording = recording;
            this.updateUIState();
            
            if (error) {
                console.error('[HumeEVI-Ghost] Recording error:', error);
                this.showToast(`Recording error: ${error}`, 'error');
            }
        };
        
        this.humeEVI.onEmotionsUpdate = (emotions) => {
            // Could display emotions in UI if desired
            console.log('[HumeEVI-Ghost] Emotions:', emotions);
        };
    }
    
    async autoConnect() {
        if (this.isAutoConnecting) return;
        
        this.isAutoConnecting = true;
        console.log('[HumeEVI-Ghost] Auto-connecting to Hume EVI...');
        
        try {
            await this.humeEVI.connect();
        } catch (error) {
            console.error('[HumeEVI-Ghost] Auto-connect failed:', error);
            this.showToast('Failed to connect to Hume EVI', 'error');
        } finally {
            this.isAutoConnecting = false;
        }
    }
    
    createEndChatButton() {
        // Find the button container (where the mic button is)
        const buttonContainer = this.micButton?.parentElement;
        if (!buttonContainer) return;
        
        // Create end chat button
        this.endChatButton = document.createElement('button');
        this.endChatButton.className = 'chat-button end-chat-button';
        this.endChatButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        `;
        this.endChatButton.title = 'End Hume EVI Chat';
        this.endChatButton.style.display = 'none'; // Hidden by default
        
        // Insert after mic button
        this.micButton.parentNode.insertBefore(this.endChatButton, this.micButton.nextSibling);
    }
    
    setupButtonHandlers() {
        // Microphone button - tap to toggle recording
        this.micButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Connect first if not connected
            if (!this.isConnected && !this.isAutoConnecting) {
                await this.autoConnect();
                // After connecting, immediately start recording to trigger mic permissions
                setTimeout(() => {
                    if (this.isConnected) {
                        this.startRecording();
                    }
                }, 500);
                return;
            }
            
            // If connected, toggle recording
            if (this.isConnected) {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            }
        });
        
        // End chat button
        this.endChatButton?.addEventListener('click', () => {
            this.endChat();
        });
    }
    
    async startRecording() {
        if (!this.isConnected || this.isRecording) return;
        
        console.log('[HumeEVI-Ghost] Starting recording...');
        await this.humeEVI.startRecording();
    }
    
    async stopRecording() {
        if (!this.isRecording) return;
        
        console.log('[HumeEVI-Ghost] Stopping recording...');
        this.humeEVI.stopRecording();
    }
    
    async endChat() {
        if (!this.isConnected) return;
        
        console.log('[HumeEVI-Ghost] Ending chat...');
        await this.humeEVI.disconnect();
        
        // Don't auto-reconnect - user must click Ghost button again
        this.isConnected = false;
        this.updateUIState();
    }
    
    updateUIState() {
        if (!this.micButton) return;
        
        // Update button classes
        this.micButton.classList.toggle('mic-inactive', !this.isConnected);
        this.micButton.classList.toggle('mic-listening', this.isConnected && !this.isRecording);
        this.micButton.classList.toggle('mic-recording', this.isRecording);
        
        // Update Ghost logo animation
        const ghostLogo = this.micButton.querySelector('.ghost-logo');
        if (ghostLogo) {
            if (this.isRecording) {
                ghostLogo.style.animation = 'pulse 1s infinite';
            } else if (this.isConnected) {
                ghostLogo.style.animation = 'glow 2s ease-in-out infinite';
            } else {
                ghostLogo.style.animation = 'none';
            }
        }
        
        // Button is always enabled - shows different states
        this.micButton.disabled = false;
        
        // Show/hide end chat button
        if (this.endChatButton) {
            this.endChatButton.style.display = this.isConnected ? 'flex' : 'none';
        }
    }
    
    showToast(message, type = 'info') {
        // Use Ghost's toast system if available
        if (window.toastMessage) {
            window.toastMessage(message);
        } else {
            console.log(`[HumeEVI-Ghost] ${type}: ${message}`);
        }
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    /* Ghost logo animations */
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes glow {
        0% { filter: brightness(1.0) drop-shadow(0 0 2px rgba(255, 255, 255, 0.3)); }
        50% { filter: brightness(1.2) drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)); }
        100% { filter: brightness(1.0) drop-shadow(0 0 2px rgba(255, 255, 255, 0.3)); }
    }
    
    /* Button states */
    #microphone-button.mic-inactive .ghost-logo {
        opacity: 0.5;
        filter: grayscale(100%);
    }
    
    #microphone-button.mic-listening .ghost-logo {
        opacity: 1;
        filter: none;
    }
    
    #microphone-button.mic-recording .ghost-logo {
        opacity: 1;
        filter: none;
    }
    
    /* End chat button */
    .end-chat-button {
        background: rgba(255, 59, 48, 0.1);
        border: 1px solid rgba(255, 59, 48, 0.3);
        color: #ff3b30;
        transition: all 0.2s ease;
    }
    
    .end-chat-button:hover {
        background: rgba(255, 59, 48, 0.2);
        border-color: rgba(255, 59, 48, 0.5);
    }
    
    .end-chat-button svg {
        width: 20px;
        height: 20px;
    }
`;
document.head.appendChild(style);

// Initialize the integration
window.humeEVIGhost = new HumeEVIGhostIntegration();

// Export for debugging
export default HumeEVIGhostIntegration;