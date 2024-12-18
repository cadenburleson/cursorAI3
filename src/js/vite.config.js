import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite Configuration
 * 
 * IMPORTANT:
 * 1. Keep envDir pointing to project root for proper .env loading
 * 2. Maintain the base: './' setting for proper path resolution
 * 3. Keep the existing build configuration for proper file handling
 */

export default defineConfig({
    root: 'src',
    base: './',
    envDir: '../', // Points to project root where .env is located
    // ... rest of the config
}); 