/**
 * WebContainer Loader - Handles loading the WebContainer API
 */

// Store WebContainer globally
window.WebContainerAPI = null;

// Load WebContainer API from CDN with fallbacks
async function loadWebContainerAPI() {
    const cdnUrls = [
        'https://unpkg.com/@webcontainer/api@latest/dist/index.js',
        'https://cdn.jsdelivr.net/npm/@webcontainer/api@latest/dist/index.js',
        'https://esm.sh/@webcontainer/api'
    ];

    for (const url of cdnUrls) {
        try {
            console.log(`Attempting to load WebContainer API from: ${url}`);
            
            // Try dynamic import
            const module = await import(url);
            window.WebContainerAPI = module;
            console.log('✅ WebContainer API loaded successfully');
            return module;
        } catch (error) {
            console.warn(`Failed to load from ${url}:`, error);
        }
    }

    // If all CDNs fail, try loading from local fallback
    console.error('❌ All CDN attempts failed. WebContainers require an internet connection.');
    
    // Show user-friendly error
    showWebContainerError();
    
    throw new Error('Failed to load WebContainer API from any source');
}

function showWebContainerError() {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            max-width: 500px;
            z-index: 10000;
        ">
            <h2 style="color: #e53e3e; margin-bottom: 15px;">WebContainer Loading Error</h2>
            <p style="color: #333; margin-bottom: 20px;">
                WebContainers couldn't load. This could be due to:
            </p>
            <ul style="color: #666; margin-bottom: 20px; padding-left: 20px;">
                <li>Network connectivity issues</li>
                <li>Firewall blocking CDN access</li>
                <li>Browser extensions blocking scripts</li>
            </ul>
            <p style="color: #333; margin-bottom: 20px;">
                <strong>Alternative:</strong> For now, Ghost can still generate code that you can copy and run locally.
            </p>
            <button onclick="this.parentElement.remove()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            ">Close</button>
        </div>
    `;
    
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = errorHtml;
    document.body.appendChild(errorDiv.firstElementChild);
}

// Alternative: Use iframe-based WebContainer (simpler but limited)
class SimpleWebContainer {
    constructor() {
        this.iframe = null;
        this.ready = false;
    }

    async boot() {
        console.log('Using fallback iframe-based container');
        
        // Create hidden iframe
        this.iframe = document.createElement('iframe');
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        
        // Create a simple HTML template
        const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview</title>
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <style>
                    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel" id="app-code">
                    // App code will be injected here
                </script>
            </body>
            </html>
        `;
        
        this.iframe.srcdoc = htmlTemplate;
        this.ready = true;
        
        return this;
    }

    async mount(files) {
        if (!this.ready) await this.boot();
        
        // Find App.tsx or App.jsx
        const appFile = files['src/App.tsx'] || files['src/App.jsx'] || files['App.tsx'] || files['App.jsx'];
        
        if (appFile && this.iframe.contentWindow) {
            // Inject the React code
            const code = `
                ${appFile.file ? appFile.file.contents : appFile}
                
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(App));
            `;
            
            // Update iframe content
            const doc = this.iframe.contentDocument;
            const scriptElement = doc.getElementById('app-code');
            if (scriptElement) {
                scriptElement.textContent = code;
                
                // Re-run Babel
                if (this.iframe.contentWindow.Babel) {
                    const output = this.iframe.contentWindow.Babel.transform(code, { presets: ['react'] }).code;
                    const newScript = doc.createElement('script');
                    newScript.textContent = output;
                    doc.body.appendChild(newScript);
                }
            }
        }
    }

    async spawn(command, args) {
        // Simulate spawn for fallback
        console.log(`Simulating: ${command} ${args.join(' ')}`);
        return {
            output: { pipeTo: () => {} },
            exit: Promise.resolve(0)
        };
    }

    on(event, callback) {
        // Simulate events
        if (event === 'server-ready') {
            setTimeout(() => callback(3000, 'http://localhost:3000'), 1000);
        }
    }

    getUrl(port) {
        return `http://localhost:${port}`;
    }
}

// Export a wrapper that tries real WebContainer first, then fallback
window.WebContainerService = {
    async getContainer() {
        try {
            // Try to load real WebContainer API
            const api = await loadWebContainerAPI();
            if (api && api.WebContainer) {
                return await api.WebContainer.boot();
            }
        } catch (error) {
            console.warn('Falling back to simple container:', error);
        }
        
        // Fallback to simple iframe-based container
        return new SimpleWebContainer();
    }
};

console.log('WebContainer loader initialized');