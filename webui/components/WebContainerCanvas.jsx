import React, { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Loader2, MousePointerClick, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

const WebContainerCanvas = ({ onElementSelected }) => {
  const [container, setContainer] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, booting, installing, ready, error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPicking, setIsPicking] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Boot WebContainer on component mount
  useEffect(() => {
    bootContainer();
  }, []);

  const bootContainer = async () => {
    try {
      setStatus('booting');
      setError(null);
      
      // Boot the WebContainer
      const instance = await WebContainer.boot();
      setContainer(instance);
      
      // Listen for server ready events
      instance.on('server-ready', (port, url) => {
        console.log(`Server ready on port ${port}: ${url}`);
        setPreviewUrl(url);
        setStatus('ready');
      });

      instance.on('error', (error) => {
        console.error('Container error:', error);
        setError(error.message);
        setStatus('error');
      });

      setStatus('ready');
    } catch (err) {
      console.error('Failed to boot WebContainer:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  // Load files from Ghost's dyad_app_builder output
  const loadFiles = async (files) => {
    if (!container) {
      console.error('Container not ready');
      return;
    }

    try {
      setStatus('installing');
      
      // Create file structure
      const fileStructure = {};
      for (const [path, content] of Object.entries(files)) {
        const parts = path.split('/');
        let current = fileStructure;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = current[part].directory;
        }
        
        const fileName = parts[parts.length - 1];
        current[fileName] = {
          file: { contents: content }
        };
      }

      // Mount the files
      await container.mount(fileStructure);
      
      // Create default config files if not present
      await ensureConfigFiles(container);
      
      // Install dependencies
      const installProcess = await container.spawn('npm', ['install']);
      
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('npm install:', data);
        }
      }));

      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        throw new Error(`npm install failed with code ${installExitCode}`);
      }

      // Start dev server
      const devProcess = await container.spawn('npm', ['run', 'dev', '--', '--port', '3000']);
      
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('dev server:', data);
        }
      }));

      // Wait for server to be ready (WebContainer will emit server-ready event)
      
    } catch (err) {
      console.error('Failed to load files:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  // Ensure required config files exist
  const ensureConfigFiles = async (container) => {
    // Check if package.json exists
    try {
      await container.fs.readFile('/package.json');
    } catch {
      // Create default package.json
      const packageJson = {
        name: "ghost-app",
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.20.0",
          "lucide-react": "^0.294.0"
        },
        devDependencies: {
          "@types/react": "^18.2.43",
          "@types/react-dom": "^18.2.17",
          "@vitejs/plugin-react": "^4.2.1",
          "autoprefixer": "^10.4.16",
          "postcss": "^8.4.32",
          "tailwindcss": "^3.3.0",
          "typescript": "^5.2.2",
          "vite": "^5.0.8"
        }
      };
      await container.fs.writeFile('/package.json', JSON.stringify(packageJson, null, 2));
    }

    // Check if vite.config.js exists
    try {
      await container.fs.readFile('/vite.config.js');
    } catch {
      const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})`;
      await container.fs.writeFile('/vite.config.js', viteConfig);
    }

    // Check if index.html exists
    try {
      await container.fs.readFile('/index.html');
    } catch {
      const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ghost App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      await container.fs.writeFile('/index.html', indexHtml);
    }
  };

  // Inject element selector into iframe
  const injectElementSelector = () => {
    if (!iframeRef.current?.contentWindow) return;

    const script = `
      (function() {
        if (window.__ghostElementSelector) return;
        
        window.__ghostElementSelector = true;
        let overlay = null;
        let isActive = false;
        
        function createOverlay() {
          overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.pointerEvents = 'none';
          overlay.style.border = '2px solid #3b82f6';
          overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          overlay.style.zIndex = '9999';
          overlay.style.transition = 'all 0.2s ease';
          overlay.style.display = 'none';
          document.body.appendChild(overlay);
        }
        
        function updateOverlay(element) {
          if (!overlay || !element) return;
          const rect = element.getBoundingClientRect();
          overlay.style.left = rect.left + 'px';
          overlay.style.top = rect.top + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.display = 'block';
        }
        
        function getElementInfo(element) {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          // Try to find React component name
          let componentName = 'Unknown';
          const reactKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance'));
          if (reactKey) {
            const fiber = element[reactKey];
            componentName = fiber?.elementType?.name || fiber?.elementType?.displayName || 'Component';
          }
          
          return {
            tagName: element.tagName.toLowerCase(),
            className: element.className,
            id: element.id,
            componentName,
            text: element.textContent?.substring(0, 100),
            position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            styles: {
              color: computedStyle.color,
              backgroundColor: computedStyle.backgroundColor,
              fontSize: computedStyle.fontSize,
              padding: computedStyle.padding,
              margin: computedStyle.margin
            },
            path: getElementPath(element)
          };
        }
        
        function getElementPath(element) {
          const path = [];
          while (element && element !== document.body) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
              selector += '#' + element.id;
            } else if (element.className) {
              selector += '.' + element.className.split(' ').join('.');
            }
            path.unshift(selector);
            element = element.parentElement;
          }
          return path.join(' > ');
        }
        
        function handleMouseMove(e) {
          if (!isActive) return;
          const element = document.elementFromPoint(e.clientX, e.clientY);
          if (element && element !== overlay) {
            updateOverlay(element);
            element.style.cursor = 'pointer';
          }
        }
        
        function handleClick(e) {
          if (!isActive) return;
          e.preventDefault();
          e.stopPropagation();
          
          const element = document.elementFromPoint(e.clientX, e.clientY);
          if (element && element !== overlay) {
            const componentInfo = getElementInfo(element);
            window.parent.postMessage({
              type: 'element-selected',
              payload: componentInfo
            }, '*');
            deactivate();
          }
        }
        
        function activate() {
          isActive = true;
          if (!overlay) createOverlay();
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('click', handleClick, true);
          document.body.style.cursor = 'crosshair';
        }
        
        function deactivate() {
          isActive = false;
          if (overlay) overlay.style.display = 'none';
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('click', handleClick, true);
          document.body.style.cursor = 'auto';
        }
        
        window.addEventListener('message', (e) => {
          if (e.data?.type === 'activate-element-selector') {
            activate();
          } else if (e.data?.type === 'deactivate-element-selector') {
            deactivate();
          }
        });
        
        window.parent.postMessage({ type: 'element-selector-ready' }, '*');
      })();
    `;

    try {
      iframeRef.current.contentWindow.eval(script);
    } catch (err) {
      console.error('Failed to inject element selector:', err);
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('Preview iframe loaded');
    setTimeout(() => {
      injectElementSelector();
    }, 1000);
  };

  // Toggle element picker
  const toggleElementPicker = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    const newIsPicking = !isPicking;
    setIsPicking(newIsPicking);
    
    iframeRef.current.contentWindow.postMessage({
      type: newIsPicking ? 'activate-element-selector' : 'deactivate-element-selector'
    }, '*');
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'element-selected') {
        setSelectedElement(event.data.payload);
        setIsPicking(false);
        if (onElementSelected) {
          onElementSelected(event.data.payload);
        }
      } else if (event.data?.type === 'element-selector-ready') {
        console.log('Element selector initialized');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected]);

  // Expose loadFiles method to parent
  useEffect(() => {
    window.webContainerCanvas = {
      loadFiles
    };
  }, [container]);

  // Reload preview
  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  // Open in new tab
  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="web-container-canvas h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            WebContainer Preview
          </span>
          {status === 'booting' && (
            <span className="text-xs text-yellow-400">Booting...</span>
          )}
          {status === 'installing' && (
            <span className="text-xs text-blue-400">Installing dependencies...</span>
          )}
          {status === 'ready' && (
            <span className="text-xs text-green-400">Ready</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">Error</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleElementPicker}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${
              isPicking ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
            title="Select element to edit"
            disabled={status !== 'ready'}
          >
            <MousePointerClick size={18} />
          </button>
          
          <button
            onClick={reloadPreview}
            className="p-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title="Reload preview"
            disabled={!previewUrl}
          >
            <RefreshCw size={18} />
          </button>
          
          <button
            onClick={openInNewTab}
            className="p-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title="Open in new tab"
            disabled={!previewUrl}
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative bg-white">
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-50 border-b border-red-200 p-3 z-10">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {status === 'booting' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Booting WebContainer...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          </div>
        )}
        
        {status === 'installing' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Installing dependencies...</p>
              <p className="text-sm text-gray-500 mt-2">Setting up your app</p>
            </div>
          </div>
        )}
        
        {status === 'ready' && previewUrl && (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            title="App Preview"
          />
        )}
        
        {status === 'ready' && !previewUrl && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">Waiting for design task</p>
              <p className="text-sm mt-2">Ask Ghost to create an app</p>
            </div>
          </div>
        )}
        
        {isPicking && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-20">
            <div className="flex items-center gap-2">
              <MousePointerClick size={16} />
              <span className="text-sm font-medium">Click any element to edit</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Selected Element Info */}
      {selectedElement && (
        <div className="p-3 bg-gray-800 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Selected: <span className="text-white font-mono">
              {selectedElement.componentName || selectedElement.tagName}
            </span>
            {selectedElement.className && (
              <span className="ml-2 text-gray-500">
                .{selectedElement.className.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebContainerCanvas;