import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// DOM Elements
const changePasswordForm = document.getElementById('changePasswordForm');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const messageBox = document.getElementById('messageBox');
const submitButton = document.getElementById('submitButton');

// Helper function to show messages
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

// Check if we have a valid reset token
async function checkResetToken() {
    try {
        const {
            data: { session },
            error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
            // No valid session, check if we have a reset token in the URL
            const fragment = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = fragment.get('access_token');
            const refreshToken = fragment.get('refresh_token');
            const type = fragment.get('type');

            if (type === 'recovery' && accessToken) {
                // Set the session with the recovery tokens
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (sessionError) throw sessionError;
            } else {
                throw new Error('No valid reset token found');
            }
        }
    } catch (error) {
        console.error('Token validation error:', error);
        showMessage('Invalid or expired reset link. Please request a new password reset.', true);

        // Redirect to reset password page after 3 seconds
        setTimeout(() => {
            window.location.href = '/reset-password.html';
        }, 3000);
    }
}

// Handle form submission
changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

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

    submitButton.disabled = true;

    try {
        showMessage('Updating password...', false);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) throw error;

        showMessage('Password updated successfully! Redirecting...', false);

        // Clear form
        changePasswordForm.reset();

        // Sign out to clear the recovery session
        await supabase.auth.signOut();

        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);

    } catch (error) {
        console.error('Password update error:', error);
        showMessage(error.message || 'Error updating password. Please try again.', true);
    } finally {
        submitButton.disabled = false;
    }
});

// Check token when page loads
document.addEventListener('DOMContentLoaded', checkResetToken); 