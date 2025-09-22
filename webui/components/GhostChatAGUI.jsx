/**
 * Ghost Chat with AG-UI Protocol and CopilotKit
 * Uses Browser-Use Cloud for visual browser automation
 */

import React, { useState, useEffect } from 'react';
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { HttpAgent } from "@ag-ui/client";
import "@copilotkit/react-ui/styles.css";

export function GhostChatAGUI() {
  const [browserPreviewUrl, setBrowserPreviewUrl] = useState(null);
  const [browserStatus, setBrowserStatus] = useState('idle');
  const [entityGraph, setEntityGraph] = useState([]);
  const [duplicateEntities, setDuplicateEntities] = useState([]);
  const [showEntityPanel, setShowEntityPanel] = useState(false);
  
  // Create AG-UI agent connection
  const agent = new HttpAgent({
    url: "http://localhost:50002/api/ag-ui",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem('ghost-token')}`,
      "Content-Type": "application/json"
    }
  });
  
  // Subscribe to AG-UI events
  useEffect(() => {
    const subscription = agent.subscribe({
      next: (event) => {
        console.log('AG-UI Event:', event);
        
        switch(event.type) {
          case 'TOOL_CALL_START':
            if (event.toolCallName === 'browser_cloud') {
              setBrowserStatus('starting');
              console.log('🌐 Browser Cloud starting...');
            }
            break;
            
          case 'STATE_DELTA':
            // Handle state updates (browser preview URL)
            if (event.delta) {
              event.delta.forEach(patch => {
                if (patch.path === '/browser_preview_url') {
                  setBrowserPreviewUrl(patch.value);
                  setBrowserStatus('active');
                  console.log('📺 Browser preview:', patch.value);
                }
                if (patch.path === '/browser_status') {
                  setBrowserStatus(patch.value);
                }
              });
            }
            break;
            
          case 'TOOL_CALL_END':
            console.log('✅ Tool call completed');
            break;
            
          case 'RUN_ERROR':
            console.error('❌ Error:', event.message);
            setBrowserStatus('error');
            break;
        }
      },
      error: (error) => {
        console.error('AG-UI Error:', error);
        setBrowserStatus('error');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [agent]);
  
  return (
    <div className="ghost-chat-container" style={{
      display: 'flex',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
    }}>
      {/* Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CopilotKit runtimeUrl="/api/ag-ui">
          <CopilotChat
            instructions="You are Ghost, an AI assistant with browser automation capabilities via Browser-Use Cloud."
            labels={{
              title: "Ghost AI Assistant",
              initial: "How can I help you today? I can browse websites, fill forms, and control IDEs for you."
            }}
            style={{
              height: '100%',
              background: 'transparent'
            }}
          />
        </CopilotKit>
      </div>
      
      {/* Browser Preview Panel */}
      {browserPreviewUrl && (
        <div style={{
          width: '60%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #00ff00',
          background: '#0a0a0a'
        }}>
          {/* Status Bar */}
          <div style={{
            padding: '10px 20px',
            background: 'rgba(0, 255, 0, 0.1)',
            borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: browserStatus === 'active' ? '#00ff00' : '#ffaa00',
              animation: browserStatus === 'starting' ? 'pulse 1s infinite' : 'none'
            }}></span>
            <span style={{ color: '#00ff00', fontFamily: 'monospace' }}>
              Browser Cloud: {browserStatus}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => pauseBrowser()}
                style={{
                  padding: '5px 15px',
                  background: 'rgba(255, 193, 7, 0.2)',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  color: '#ffc107',
                  cursor: 'pointer'
                }}
              >
                ⏸️ Pause
              </button>
              <button
                onClick={() => resumeBrowser()}
                style={{
                  padding: '5px 15px',
                  background: 'rgba(0, 255, 0, 0.2)',
                  border: '1px solid #00ff00',
                  borderRadius: '4px',
                  color: '#00ff00',
                  cursor: 'pointer'
                }}
              >
                ▶️ Resume
              </button>
            </div>
          </div>
          
          {/* Browser iframe */}
          <iframe
            src={browserPreviewUrl}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              background: '#fff'
            }}
            title="Browser Cloud Preview"
          />
        </div>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .ghost-chat-container :global(.copilot-chat) {
          background: transparent !important;
        }
        
        .ghost-chat-container :global(.copilot-message) {
          background: rgba(0, 255, 0, 0.05) !important;
          border: 1px solid rgba(0, 255, 0, 0.2) !important;
        }
      `}</style>
    </div>
  );
  
  // Helper functions
  function pauseBrowser() {
    // Send pause event through AG-UI
    agent.emit({
      type: 'CUSTOM',
      name: 'browser_pause',
      value: { action: 'pause' }
    });
  }
  
  function resumeBrowser() {
    // Send resume event through AG-UI
    agent.emit({
      type: 'CUSTOM',
      name: 'browser_resume',
      value: { action: 'resume' }
    });
  }
}