import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
console.log('Supabase client initialized');

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('messageBox');

// Helper function to show messages
function showMessage(message, isError = false) {
    console.log(`Showing message: ${message} (isError: ${isError})`);
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login form submitted');

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    console.log('Attempting login for email:', email);

    try {
        showMessage('Logging in...', false);

        console.log('Step 1: Calling supabase.auth.signInWithPassword...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        console.log('Step 2: Sign in response:', {
            hasData: !!data,
            hasError: !!error,
            sessionExists: !!data?.session,
            userEmail: data?.user?.email || 'none'
        });

        if (error) {
            console.error('Sign in error:', error);
            throw error;
        }

        if (data?.session) {
            console.log('Step 3: Session created successfully:', {
                user: data.session.user.email,
                expiresAt: data.session.expires_at,
                sessionId: data.session.id,
                accessToken: data.session.access_token ? 'exists' : 'missing'
            });

            // Validate session data
            if (!data.session.access_token) {
                throw new Error('Invalid session: missing access token');
            }

            showMessage('Login successful! Please wait...', false);

            try {
                // Set the session in Supabase client
                await supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
                console.log('Step 5: Session set successfully');

                // Create a state parameter with the session info
                const state = btoa(JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    user: data.session.user
                }));

                // Redirect with state parameter
                window.location.href = `/?auth_state=${encodeURIComponent(state)}`;
            } catch (sessionError) {
                console.error('Session error:', sessionError);
                throw new Error('Failed to set session');
            }
        } else {
            console.error('Step X: No session in response data');
            throw new Error('No session created');
        }
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        showMessage(error.message || 'Error logging in. Please try again.', true);
    }
}); 