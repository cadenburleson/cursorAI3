import { createClient } from '@supabase/supabase-js';
import config from '/js/utils/config.js';

console.log('Signup script loaded');

const supabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
);

const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('messageBox');

function showMessage(message, isError = false) {
    console.log(`Showing message: ${message} (isError: ${isError})`);
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
}

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Signup form submitted');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Please enter both email and password', true);
        return;
    }

    try {
        // First check if email already exists
        const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) {
            showMessage('An account with this email already exists. Please login instead.', true);
            return;
        }

        showMessage('Creating account...', false);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/login.html`,
                data: {
                    email_confirm: true
                }
            }
        });

        if (error) {
            console.error('Signup error:', error);
            showMessage(error.message || 'Failed to create account', true);
            return;
        }

        if (data?.user?.identities?.length === 0) {
            showMessage('An account with this email already exists. Please login instead.', true);
            return;
        }

        showMessage('Account created successfully! Please check your email to confirm your account. Check your spam folder if you don\'t see it.', false);

        // Optional: Redirect to login page after successful signup
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);

    } catch (error) {
        console.error('Signup error:', error);
        showMessage('An error occurred during signup', true);
    }
}); 