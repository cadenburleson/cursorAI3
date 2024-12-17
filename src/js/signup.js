import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// DOM Elements
const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const messageBox = document.getElementById('messageBox');

// Helper function to show messages
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

// Check if we're already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = '/';
    }
});

// Handle form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', true);
        return;
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', true);
        return;
    }

    try {
        showMessage('Creating account...', false);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/login.html`,
                data: {
                    email: email
                }
            }
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
            showMessage('An account with this email already exists. Please try logging in.', true);
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            return;
        }

        if (data?.user?.confirmation_sent_at) {
            showMessage('Verification email sent! Please check your inbox and spam folder.', false);
            // Clear form
            signupForm.reset();
        } else {
            // If no confirmation was sent, the user might be already confirmed
            showMessage('Account created! You can now log in.', false);
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage(error.message || 'Error creating account. Please try again.', true);
    }
}); 