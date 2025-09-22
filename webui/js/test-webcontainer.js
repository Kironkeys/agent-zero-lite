/**
 * Test WebContainer Integration
 * Direct app loading for testing
 */

function testWebContainer() {
    console.log('[Test] Triggering WebContainer with test app');
    
    // Find the design iframe
    const designFrame = document.querySelector('#designs-browser-iframe');
    
    if (designFrame && designFrame.contentWindow) {
        // Create a simple test app
        const testApp = {
            'package.json': {
                file: {
                    contents: JSON.stringify({
                        name: "test-landing",
                        version: "1.0.0",
                        type: "module",
                        scripts: {
                            dev: "vite",
                            build: "vite build"
                        },
                        dependencies: {
                            "react": "^18.2.0",
                            "react-dom": "^18.2.0"
                        },
                        devDependencies: {
                            "@vitejs/plugin-react": "^4.2.0",
                            "vite": "^5.0.0"
                        }
                    }, null, 2)
                }
            },
            'vite.config.js': {
                file: {
                    contents: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()]\n});"
                }
            },
            'index.html': {
                file: {
                    contents: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Test App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>'
                }
            },
            'src/main.jsx': {
                file: {
                    contents: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);"
                }
            },
            'src/App.jsx': {
                file: {
                    contents: "import React from 'react';\n\nfunction App() {\n  return (\n    <div style={{\n      minHeight: '100vh',\n      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',\n      display: 'flex',\n      alignItems: 'center',\n      justifyContent: 'center',\n      color: 'white',\n      fontFamily: 'system-ui'\n    }}>\n      <div style={{ textAlign: 'center' }}>\n        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀 Ghost Builder</h1>\n        <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>WebContainer Test Successful!</p>\n        <p style={{ opacity: 0.8 }}>The preview system is working</p>\n        <button style={{\n          marginTop: '2rem',\n          padding: '12px 24px',\n          fontSize: '1.1rem',\n          background: 'white',\n          color: '#667eea',\n          border: 'none',\n          borderRadius: '8px',\n          cursor: 'pointer'\n        }}>Get Started</button>\n      </div>\n    </div>\n  );\n}\n\nexport default App;"
                }
            }
        };
        
        // Send directly to design frame
        designFrame.contentWindow.postMessage({
            type: 'load-test-app',
            files: testApp
        }, '*');
        
        console.log('[Test] Sent test app to WebContainer');
    } else {
        console.error('[Test] Design frame not found');
    }
}

// Make it available globally
window.testWebContainer = testWebContainer;

// Auto-trigger when page is ready
function waitForDesignFrame() {
    const designFrame = document.querySelector('#designs-browser-iframe');
    if (designFrame && designFrame.contentWindow) {
        // Wait a bit for iframe to fully load
        setTimeout(() => {
            console.log('[Test] Auto-triggering WebContainer test...');
            testWebContainer();
        }, 3000);
    } else {
        // Keep trying
        setTimeout(waitForDesignFrame, 500);
    }
}

// Start waiting when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDesignFrame);
} else {
    waitForDesignFrame();
}