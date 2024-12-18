import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: 'src',
    base: './',
    envDir: '../',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                login: resolve(__dirname, 'src/login.html'),
                signup: resolve(__dirname, 'src/signup.html'),
                resetPassword: resolve(__dirname, 'src/reset-password.html'),
                changePassword: resolve(__dirname, 'src/change-password.html')
            }
        }
    },
    resolve: {
        alias: {
            '/js': resolve(__dirname, 'src/js')
        }
    },
    server: {
        port: 3000,
        open: true
    },
    envPrefix: 'VITE_'
}); 