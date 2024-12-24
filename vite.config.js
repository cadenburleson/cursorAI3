import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    envDir: '../',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: '/index.html',
                login: '/login.html',
                signup: '/signup.html',
                resetPassword: '/reset-password.html',
                changePassword: '/change-password.html'
            }
        }
    },
    server: {
        port: 3000,
        open: true,
        historyApiFallback: true
    },
    css: {
        postcss: './postcss.config.js',
    },
}); 