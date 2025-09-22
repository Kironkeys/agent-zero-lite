/**
 * WebContainer Service for Ghost
 * Manages WebContainer instances for running React/TypeScript apps in the browser
 */

class WebContainerService {
    constructor() {
        this.container = null;
        this.previewUrl = null;
        this.isBooting = false;
        this.isReady = false;
        this.listeners = {};
        this.files = {};
    }

    /**
     * Initialize WebContainer (call once on page load)
     */
    async init() {
        if (this.container || this.isBooting) {
            console.log('WebContainer already initialized or booting');
            return this.container;
        }

        try {
            this.isBooting = true;
            this.emit('status', { state: 'booting', message: 'Starting WebContainer...' });

            // Dynamically import WebContainer API
            const { WebContainer } = await import('https://unpkg.com/@webcontainer/api@1.1.9/dist/index.js');
            
            // Boot the container
            this.container = await WebContainer.boot();
            
            // Listen for server ready events
            this.container.on('server-ready', (port, url) => {
                console.log(`Dev server ready on port ${port}: ${url}`);
                this.previewUrl = url;
                this.isReady = true;
                this.emit('preview-ready', { url, port });
                this.emit('status', { state: 'ready', message: 'Preview ready', url });
            });

            // Listen for errors
            this.container.on('error', (error) => {
                console.error('WebContainer error:', error);
                this.emit('error', error);
                this.emit('status', { state: 'error', message: error.message });
            });

            this.isBooting = false;
            this.emit('status', { state: 'idle', message: 'WebContainer ready' });
            
            return this.container;
        } catch (error) {
            this.isBooting = false;
            console.error('Failed to boot WebContainer:', error);
            this.emit('error', error);
            this.emit('status', { state: 'error', message: error.message });
            throw error;
        }
    }

    /**
     * Load files from Dyad-formatted output
     */
    async loadFromDyadOutput(dyadContent) {
        if (!this.container) {
            await this.init();
        }

        try {
            this.emit('status', { state: 'processing', message: 'Processing files...' });
            
            // Parse Dyad tags
            const files = this.parseDyadTags(dyadContent);
            
            // Add essential config files
            this.addConfigFiles(files);
            
            // Store files for reference
            this.files = files;
            
            // Mount files to WebContainer
            await this.mountFiles(files);
            
            // Install dependencies and start dev server
            await this.startDevServer();
            
            return this.previewUrl;
        } catch (error) {
            console.error('Failed to load Dyad output:', error);
            this.emit('error', error);
            this.emit('status', { state: 'error', message: error.message });
            throw error;
        }
    }

    /**
     * Parse Ghost/Dyad write tags from Ghost output (supports both formats)
     */
    parseDyadTags(content) {
        const files = {};
        // Support both ghost-write and dyad-write tags
        const patterns = [
            /<ghost-write\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/ghost-write>/g,
            /<dyad-write\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-write>/g
        ];
        
        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
            const [, path, fileContent] = match;
            
            // Clean content (remove code block markers if present)
            let cleanContent = fileContent.trim();
            const lines = cleanContent.split('\n');
            
            // Remove opening ``` if present
            if (lines[0] && lines[0].trim().startsWith('```')) {
                lines.shift();
            }
            
            // Remove closing ``` if present
            if (lines[lines.length - 1] && lines[lines.length - 1].trim().startsWith('```')) {
                lines.pop();
            }
            
            // Remove "use client" directives for now
            cleanContent = lines.join('\n')
                .replace(/["']use client["'];?\s*\n/g, '');
            
                files[path] = cleanContent;
            }
        }
        
        return files;
    }

    /**
     * Add essential config files if not present
     */
    addConfigFiles(files) {
        // Add package.json if not present
        if (!files['package.json']) {
            files['package.json'] = JSON.stringify({
                name: 'ghost-app',
                version: '0.1.0',
                type: 'module',
                scripts: {
                    dev: 'vite',
                    build: 'vite build',
                    preview: 'vite preview'
                },
                dependencies: {
                    'react': '^18.2.0',
                    'react-dom': '^18.2.0',
                    'react-router-dom': '^6.20.0',
                    'lucide-react': '^0.294.0',
                    '@radix-ui/react-slot': '^1.0.2',
                    'class-variance-authority': '^0.7.0',
                    'clsx': '^2.0.0',
                    'tailwind-merge': '^2.1.0',
                    'tailwindcss-animate': '^1.0.7'
                },
                devDependencies: {
                    '@types/react': '^18.2.43',
                    '@types/react-dom': '^18.2.17',
                    '@vitejs/plugin-react': '^4.2.1',
                    'autoprefixer': '^10.4.16',
                    'postcss': '^8.4.32',
                    'tailwindcss': '^3.3.0',
                    'typescript': '^5.2.2',
                    'vite': '^5.0.8'
                }
            }, null, 2);
        }

        // Add vite.config.js if not present
        if (!files['vite.config.js']) {
            files['vite.config.js'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})`;
        }

        // Add index.html if not present
        if (!files['index.html']) {
            files['index.html'] = `<!doctype html>
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
        }

        // Add tailwind.config.js if not present
        if (!files['tailwind.config.js']) {
            files['tailwind.config.js'] = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
        }

        // Add postcss.config.js if not present
        if (!files['postcss.config.js']) {
            files['postcss.config.js'] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
        }

        // Add tsconfig.json if not present
        if (!files['tsconfig.json']) {
            files['tsconfig.json'] = JSON.stringify({
                compilerOptions: {
                    target: 'ES2020',
                    useDefineForClassFields: true,
                    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                    module: 'ESNext',
                    skipLibCheck: true,
                    moduleResolution: 'bundler',
                    allowImportingTsExtensions: true,
                    resolveJsonModule: true,
                    isolatedModules: true,
                    noEmit: true,
                    jsx: 'react-jsx',
                    strict: true,
                    noUnusedLocals: true,
                    noUnusedParameters: true,
                    noFallthroughCasesInSwitch: true
                },
                include: ['src'],
                references: [{ path: './tsconfig.node.json' }]
            }, null, 2);
        }

        // Add tsconfig.node.json if not present
        if (!files['tsconfig.node.json']) {
            files['tsconfig.node.json'] = JSON.stringify({
                compilerOptions: {
                    composite: true,
                    skipLibCheck: true,
                    module: 'ESNext',
                    moduleResolution: 'bundler',
                    allowSyntheticDefaultImports: true
                },
                include: ['vite.config.js']
            }, null, 2);
        }
    }

    /**
     * Mount files to WebContainer
     */
    async mountFiles(files) {
        const fileTree = {};
        
        // Convert flat file structure to tree structure
        for (const [path, content] of Object.entries(files)) {
            const parts = path.split('/');
            let current = fileTree;
            
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
        
        // Mount the file tree
        await this.container.mount(fileTree);
        this.emit('status', { state: 'files-mounted', message: 'Files loaded' });
    }

    /**
     * Install dependencies and start dev server
     */
    async startDevServer() {
        try {
            // Install dependencies
            this.emit('status', { state: 'installing', message: 'Installing dependencies...' });
            
            const installProcess = await this.container.spawn('npm', ['install']);
            
            // Stream install output
            installProcess.output.pipeTo(new WritableStream({
                write: (data) => {
                    console.log('npm install:', data);
                    this.emit('install-output', data);
                }
            }));
            
            const installExitCode = await installProcess.exit;
            if (installExitCode !== 0) {
                throw new Error(`npm install failed with code ${installExitCode}`);
            }
            
            // Start dev server
            this.emit('status', { state: 'starting', message: 'Starting dev server...' });
            
            const devProcess = await this.container.spawn('npm', ['run', 'dev']);
            
            // Stream dev server output
            devProcess.output.pipeTo(new WritableStream({
                write: (data) => {
                    console.log('dev server:', data);
                    this.emit('dev-output', data);
                }
            }));
            
            // Server ready event will be emitted by WebContainer
            
        } catch (error) {
            console.error('Failed to start dev server:', error);
            throw error;
        }
    }

    /**
     * Update a single file
     */
    async updateFile(path, content) {
        if (!this.container) {
            throw new Error('WebContainer not initialized');
        }
        
        await this.container.fs.writeFile(path, content);
        this.files[path] = content;
        this.emit('file-updated', { path, content });
    }

    /**
     * Get preview URL
     */
    getPreviewUrl() {
        return this.previewUrl;
    }

    /**
     * Check if ready
     */
    isContainerReady() {
        return this.isReady;
    }

    /**
     * Event emitter methods
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Destroy container
     */
    async destroy() {
        if (this.container) {
            await this.container.teardown();
            this.container = null;
            this.previewUrl = null;
            this.isReady = false;
            this.files = {};
            this.emit('destroyed');
        }
    }
}

// Create singleton instance
window.webContainerService = new WebContainerService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebContainerService;
}