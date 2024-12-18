/**
 * Login Handler
 * 
 * Critical Path:
 * 1. Sign in with Supabase auth
 * 2. Store session with correct key format
 * 3. Verify session is set
 * 4. Redirect using correct path
 * 
 * IMPORTANT: 
 * - Keep the localStorage key format: `sb-${config.supabaseUrl}-auth-token`
 * - Use window.location.origin + window.location.pathname.replace('login.html', '')
 *   for redirects to maintain proper paths
 * - Do not modify the working authentication flow without thorough testing
 */

import { createClient } from '@supabase/supabase-js';
import config from './utils/config.js';

console.log('Login page loaded, initializing...');

// Initialize Supabase client
const supabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
        auth: {
            storageKey: `sb-${config.supabaseUrl}-auth-token`,
            autoRefreshToken: true,
            persistSession: true
        }
    }
);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('messageBox');

function showMessage(message, isError = false) {
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            showMessage('Logging in...', false);
            console.log('Attempting login...');

            // Sign in
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            console.log('Sign in response:', {
                success: !!data?.session,
                error: error?.message || 'none'
            });

            if (error) throw error;
            if (!data?.session) throw new Error('No session created');

            // Store session data
            const storageKey = `sb-${config.supabaseUrl}-auth-token`;
            const sessionData = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + 3600
            };

            console.log('Storing session data...');
            localStorage.setItem(storageKey, JSON.stringify(sessionData));

            // Set session in Supabase client
            console.log('Setting session in Supabase client...');
            await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });

            // Verify the session was set
            const { data: { session } } = await supabase.auth.getSession();
            console.log('Session verification:', {
                isSet: !!session,
                user: session?.user?.email || 'none'
            });

            showMessage('Login successful! Redirecting...', false);

            // Redirect to home page
            console.log('Redirecting to home page...');
            window.location.href = window.location.origin + window.location.pathname.replace('login.html', '');

        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'An error occurred during login', true);
        }
    });
} 