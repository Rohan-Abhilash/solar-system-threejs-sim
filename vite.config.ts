import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  assetsInclude: ['**/*.hdr', '**/*.jpg', '**/*.png', '**/*.jpeg', '**/*.webp'],
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'three-addons': ['three/examples/jsm/controls/OrbitControls.js',
                          'three/examples/jsm/postprocessing/EffectComposer.js',
                          'three/examples/jsm/postprocessing/RenderPass.js',
                          'three/examples/jsm/postprocessing/UnrealBloomPass.js',
                          'three/examples/jsm/postprocessing/ShaderPass.js',
                          'three/examples/jsm/shaders/FXAAShader.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'lil-gui']
  }
})
