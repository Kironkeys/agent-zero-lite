/**
 * Inject Static Preview
 * Sends a static HTML preview directly to the Design tab
 * No dev server needed!
 */

function injectStaticPreview() {
    // Create a complete static HTML page from Ghost Builder's output
    const staticHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Landing Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes pulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.3; }
        }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    </style>
</head>
<body>
    <div class="min-h-screen bg-white">
        <!-- Hero Section -->
        <section class="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
            <div class="absolute inset-0 bg-black/20"></div>
            
            <div class="relative z-10 container mx-auto px-4 text-center">
                <div class="max-w-4xl mx-auto">
                    <div class="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
                        <span class="text-sm font-medium">✨ Now available</span>
                    </div>

                    <h1 class="text-6xl font-bold mb-6 leading-tight">
                        Transform Your
                        <span class="block bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                            Digital Experience
                        </span>
                    </h1>

                    <p class="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                        Powerful solutions that help businesses grow faster, work smarter, 
                        and deliver exceptional results to their customers.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                        <button class="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold">
                            Get Started Free →
                        </button>
                        
                        <button class="border border-white text-white hover:bg-white/10 px-8 py-4 rounded-lg text-lg font-semibold">
                            ▶ Watch Demo
                        </button>
                    </div>

                    <div class="grid grid-cols-3 gap-8 text-center">
                        <div>
                            <div class="text-4xl font-bold mb-2">10K+</div>
                            <div class="text-blue-200">Happy Customers</div>
                        </div>
                        <div>
                            <div class="text-4xl font-bold mb-2">99.9%</div>
                            <div class="text-blue-200">Uptime Guarantee</div>
                        </div>
                        <div>
                            <div class="text-4xl font-bold mb-2">24/7</div>
                            <div class="text-blue-200">Support</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
            <div class="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" style="animation-delay: 1s;"></div>
        </section>

        <!-- Features Section -->
        <section class="py-20 bg-gray-50">
            <div class="container mx-auto px-4">
                <div class="text-center mb-12">
                    <h2 class="text-4xl font-bold mb-4">Powerful Features</h2>
                    <p class="text-xl text-gray-600">Everything you need to succeed</p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <span class="text-2xl">🚀</span>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Lightning Fast</h3>
                        <p class="text-gray-600">Optimized for speed and performance</p>
                    </div>
                    
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <span class="text-2xl">🔒</span>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Secure by Default</h3>
                        <p class="text-gray-600">Enterprise-grade security built in</p>
                    </div>
                    
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                            <span class="text-2xl">📈</span>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Analytics</h3>
                        <p class="text-gray-600">Detailed insights and reporting</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Testimonials -->
        <section class="py-20">
            <div class="container mx-auto px-4">
                <h2 class="text-4xl font-bold text-center mb-12">What Our Customers Say</h2>
                
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <p class="text-gray-700 mb-4">"This product has transformed how we work. Highly recommended!"</p>
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                            <div>
                                <div class="font-bold">Sarah Johnson</div>
                                <div class="text-gray-600">CEO, TechCorp</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <p class="text-gray-700 mb-4">"Amazing features and excellent support. Couldn't ask for more!"</p>
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                            <div>
                                <div class="font-bold">Mike Chen</div>
                                <div class="text-gray-600">CTO, StartupXYZ</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div class="container mx-auto px-4 text-center">
                <h2 class="text-4xl font-bold mb-4">Ready to Get Started?</h2>
                <p class="text-xl mb-8">Join thousands of satisfied customers today</p>
                <button class="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100">
                    Start Your Free Trial
                </button>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12">
            <div class="container mx-auto px-4 text-center">
                <p>&copy; 2024 Your Company. All rights reserved.</p>
            </div>
        </footer>
    </div>
</body>
</html>`;

    // Send to Design tab iframe
    const designFrame = document.getElementById('designs-browser-iframe');
    if (designFrame && designFrame.contentWindow) {
        // Send the HTML directly to the preview iframe
        designFrame.contentWindow.postMessage({
            type: 'preview-code',
            code: staticHTML
        }, '*');
        
        console.log('[Static Preview] Sent landing page to Design tab');
        
        // Switch to Design tab
        if (window.showDesignContent) {
            window.showDesignContent();
        }
    } else {
        console.error('[Static Preview] Design frame not found');
    }
}

// Auto-inject after a short delay
setTimeout(injectStaticPreview, 2000);

// Make available globally
window.injectStaticPreview = injectStaticPreview;