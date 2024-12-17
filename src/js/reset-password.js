import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Constants
const CHANGE_PASSWORD_URL = '/change-password.html';  // The URL where users will set their new password
const COOLDOWN_PERIOD = 60000; // 1 minute cooldown

// DOM Elements
const resetForm = document.getElementById('resetPasswordForm');
const emailInput = document.getElementById('email');
const messageBox = document.getElementById('messageBox');
const submitButton = document.getElementById('submitButton');

let lastRequestTime = 0;

// Helper function to show messages
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

// Handle form submission
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check cooldown
    const now = Date.now();
    const timeElapsed = now - lastRequestTime;
    if (timeElapsed < COOLDOWN_PERIOD) {
        const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeElapsed) / 1000);
        showMessage(`Please wait ${remainingTime} seconds before trying again.`, true);
        return;
    }

    const email = emailInput.value.trim();
    submitButton.disabled = true;

    try {
        lastRequestTime = now;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${CHANGE_PASSWORD_URL}`,
        });

        if (error) throw error;

        // Show success message
        showMessage('Password reset instructions have been sent to your email.');
        resetForm.reset();

    } catch (error) {
        console.error('Password reset request failed:', error);
        showMessage(error.message || 'An error occurred. Please try again later.', true);
    } finally {
        submitButton.disabled = false;
    }
}); 