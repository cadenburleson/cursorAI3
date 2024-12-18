import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { marked } from 'marked';
import config from './utils/config.js';

/**
 * Authentication State Management
 * 
 * Critical Components:
 * 1. Session Persistence: Handled by checkPersistedSession()
 * 2. Auth State Changes: Monitored by onAuthStateChange
 * 3. UI Updates: Managed by updateAuthUI()
 * 
 * DO NOT MODIFY these components without thorough testing
 * Previous issues occurred when changing this working implementation
 */

// Configure marked options for GitHub-flavored markdown
marked.setOptions({
    gfm: true,
    breaks: true,
    tables: true
});

// Initialize Supabase client
const supabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            storageKey: `sb-${config.supabaseUrl}-auth-token`,
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
console.log('Main: Supabase client initialized');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// DOM Elements
const form = document.getElementById('generator-form');
const resultsDiv = document.getElementById('results');
const generatedIdeaDiv = document.getElementById('generated-idea');
const historyList = document.getElementById('history-list');
const authStatus = document.getElementById('auth-status');
const logoutButton = document.getElementById('logout-button');
const generateButton = document.querySelector('#generator-form button[type="submit"]');

// Auth state management
let currentUser = null;

// Add this before initializeAuth
async function checkPersistedSession() {
    const storageKey = `sb-${config.supabaseUrl}-auth-token`;
    const persistedSession = localStorage.getItem(storageKey);

    if (persistedSession) {
        try {
            const session = JSON.parse(persistedSession);
            await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
            });
            return true;
        } catch (error) {
            console.error('Error restoring session:', error);
            localStorage.removeItem(storageKey);
        }
    }
    return false;
}

// Update initializeAuth to use this
async function initializeAuth() {
    console.log('Main: Starting auth initialization...');

    try {
        // First try to restore persisted session
        const restored = await checkPersistedSession();
        console.log('Session restored:', restored);

        // Then get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Current session state:', {
            exists: !!session,
            user: session?.user?.email || 'none',
            error: error?.message || 'none'
        });

        if (error) throw error;

        if (session?.user) {
            console.log('Valid session found, updating state...');
            currentUser = session.user;
            updateAuthUI();
            await loadUserHistory();
            console.log('Auth initialization complete - user logged in');
        } else {
            console.log('No valid session found');
            currentUser = null;
            updateAuthUI();
            console.log('Auth initialization complete - no user');
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        currentUser = null;
        updateAuthUI();
    }
}

// Update UI based on auth state
function updateAuthUI() {
    console.log('Updating UI for user:', currentUser?.email || 'none');

    const loginButton = document.querySelector('.btn-primary:not(.btn-signup)');
    const signupButton = document.querySelector('.btn-primary.btn-signup');

    if (currentUser) {
        // User is logged in
        if (authStatus) authStatus.textContent = `Logged in as: ${currentUser.email}`;
        if (loginButton) loginButton.style.display = 'none';
        if (signupButton) signupButton.style.display = 'none';
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            logoutButton.classList.remove('hidden');
        }
        if (generateButton) {
            generateButton.disabled = false;
            generateButton.title = '';
        }
    } else {
        // User is not logged in
        if (authStatus) authStatus.textContent = 'Not logged in';
        if (loginButton) loginButton.style.display = 'inline-block';
        if (signupButton) signupButton.style.display = 'inline-block';
        if (logoutButton) {
            logoutButton.style.display = 'none';
            logoutButton.classList.add('hidden');
        }
        if (generateButton) {
            generateButton.disabled = true;
            generateButton.title = 'Please log in to generate ideas';
        }
    }
}

// Handle logout
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await supabase.auth.signOut();
            currentUser = null;
            updateAuthUI();
            if (historyList) historyList.innerHTML = '';
            window.location.href = './';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error signing out: ' + error.message);
        }
    });
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', {
        event,
        user: session?.user?.email || 'none',
        timestamp: new Date().toISOString()
    });

    if (event === 'SIGNED_IN') {
        currentUser = session?.user || null;
        updateAuthUI();
        if (currentUser) {
            loadUserHistory().catch(err => {
                console.error('Error loading history:', err);
            });
        }
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateAuthUI();
        if (historyList) {
            historyList.innerHTML = '';
        }
    }
});

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing auth...');
    initializeAuth().catch(error => {
        console.error('Error during auth initialization:', error);
    });
});

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        alert('Please log in first to generate ideas!');
        return;
    }

    // Show loading state
    generateButton.disabled = true;
    generateButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generating...
    `;

    const formData = new FormData(form);
    const inputs = {
        skills: "My Skills: " + (formData.get('skills') || "programming, web development, problem-solving"),
        background: "My Background: " + (formData.get('background') || "software development with experience in building web applications"),
        ideal_customer: "My Ideal Customer: " + (formData.get('idealCustomer') || "small to medium-sized businesses looking to establish online presence"),
        secondary_goal: "My Secondary Goal: " + (formData.get('secondaryGoal') || "building a sustainable passive income stream")
    };

    // Construct prompt with system prompt prepended
    const userPrompt = `
        ${inputs.skills}
        ${inputs.background}
        ${inputs.ideal_customer}
        ${inputs.secondary_goal}
    `;

    try {
        // Generate idea using OpenAI
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: import.meta.env.VITE_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            model: "gpt-3.5-turbo",
        });

        const generated_idea = completion.choices[0].message.content;

        // Save to Supabase
        const { data, error } = await supabase
            .from('side_hustle_generations')
            .insert([{
                user_id: currentUser.id,
                generated_idea,
                inputs
            }]);

        if (error) throw error;

        // Display results
        displayResult(generated_idea);
        await loadUserHistory();
    } catch (error) {
        alert('Error generating idea: ' + error.message);
    } finally {
        // Reset button state
        generateButton.disabled = false;
        generateButton.innerHTML = 'Generate Side-Hustle Idea';
    }
});

// Display the generated result with markdown formatting
function displayResult(idea) {
    // Convert markdown to HTML
    const formattedIdea = marked.parse(idea);

    // Set the HTML content
    generatedIdeaDiv.innerHTML = formattedIdea;

    // Add table styling
    const tables = generatedIdeaDiv.getElementsByTagName('table');
    Array.from(tables).forEach(table => {
        table.classList.add('min-w-full', 'divide-y', 'divide-gray-200', 'my-4', 'border', 'border-black');
    });

    // Add styling to table headers
    const tableHeaders = generatedIdeaDiv.getElementsByTagName('th');
    Array.from(tableHeaders).forEach(th => {
        th.classList.add('px-6', 'py-3', 'bg-gray-50', 'text-left', 'text-xs', 'font-medium', 'text-gray-500', 'uppercase', 'tracking-wider', 'border', 'border-black');
    });

    // Add styling to table cells
    const tableCells = generatedIdeaDiv.getElementsByTagName('td');
    Array.from(tableCells).forEach(td => {
        td.classList.add('px-6', 'py-4', 'whitespace-normal', 'text-sm', 'text-gray-900', 'border', 'border-black');
    });

    resultsDiv.classList.remove('hidden');
}

// Load user's generation history
async function loadUserHistory() {
    try {
        const { data, error } = await supabase
            .from('side_hustle_generations')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayHistory(data);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Display generation history with markdown formatting
function displayHistory(generations) {
    historyList.innerHTML = generations.map(gen => {
        // Extract the first line as title, fallback to timestamp if no clear title
        const lines = gen.generated_idea.split('\n');
        const title = lines[0].replace(/^#\s*/, '').trim() || 'Side Hustle Idea';

        return `
        <details class="bg-white rounded-lg shadow-sm p-4 mb-4">
            <summary class="text-sm text-gray-500 mb-2 cursor-pointer hover:text-gray-700">
                ${title} (${new Date(gen.created_at).toLocaleString()})
            </summary>
            <div class="prose max-w-none mt-4">${marked.parse(gen.generated_idea)}</div>
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 class="font-semibold text-gray-700 mb-2">Generation Inputs:</h3>
                <div class="space-y-2 text-sm text-gray-600">
                    <div>${gen.inputs.skills}</div>
                    <div>${gen.inputs.background}</div>
                    <div>${gen.inputs.ideal_customer}</div>
                    <div>${gen.inputs.secondary_goal}</div>
                </div>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button 
                    onclick="window.copyShareLink('${gen.id}')"
                    class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                </button>
                <button 
                    onclick="window.showDeleteConfirmation('${gen.id}')"
                    class="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>
        </details>
    `}).join('');
}

// Add copy share link function to window object
window.copyShareLink = async function (generationId) {
    // Use query parameter instead of path
    const baseUrl = window.location.href.split('?')[0]; // Remove any existing query params
    const shareUrl = `${baseUrl}?share=${generationId}`;
    try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy share link');
    }
};

// Add delete confirmation modal to the DOM
document.body.insertAdjacentHTML('beforeend', `
    <div id="deleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center">
        <div class="bg-white p-6 rounded-lg shadow-xl">
            <h3 class="text-lg font-semibold mb-4">Are you sure you want to delete?</h3>
            <div class="flex justify-end space-x-4">
                <button id="cancelDelete" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                    No
                </button>
                <button id="confirmDelete" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Yes, delete
                </button>
            </div>
        </div>
    </div>
`);

// Add delete functionality to window object
window.showDeleteConfirmation = function (generationId) {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');

    modal.classList.remove('hidden');

    const handleDelete = async () => {
        try {
            const { error } = await supabase
                .from('side_hustle_generations')
                .delete()
                .eq('id', generationId);

            if (error) throw error;

            // Refresh the history
            await loadUserHistory();
        } catch (error) {
            console.error('Error deleting generation:', error);
            alert('Failed to delete generation');
        } finally {
            modal.classList.add('hidden');
            cleanup();
        }
    };

    const handleCancel = () => {
        modal.classList.add('hidden');
        cleanup();
    };

    const cleanup = () => {
        confirmBtn.removeEventListener('click', handleDelete);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleDelete);
    cancelBtn.addEventListener('click', handleCancel);
};

// Handle URL routing for individual generations
async function handleRouting() {
    // Check for share parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');

    if (sharedId) {
        try {
            const { data: generation, error } = await supabase
                .from('side_hustle_generations')
                .select('*')
                .eq('id', sharedId)
                .single();

            if (error) throw error;

            if (generation) {
                // Hide the form and show only the result
                const formElement = document.getElementById('generator-form');
                const historyElement = document.getElementById('history');
                const authSection = document.getElementById('auth-section');

                if (formElement && formElement.parentElement) {
                    formElement.parentElement.style.display = 'none';
                }
                if (historyElement) {
                    historyElement.style.display = 'none';
                }
                if (authSection) {
                    authSection.style.display = 'none';
                }

                // Display the shared generation
                if (resultsDiv) {
                    resultsDiv.classList.remove('hidden');
                    displayResult(generation.generated_idea);

                    // Add a "Generate Your Own" button
                    const generateOwnBtn = document.createElement('div');
                    generateOwnBtn.className = 'mt-8 text-center';
                    generateOwnBtn.innerHTML = `
                        <a href="./" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Generate Your Own Side-Hustle Idea
                        </a>
                    `;
                    resultsDiv.appendChild(generateOwnBtn);
                }
            } else {
                if (resultsDiv) {
                    resultsDiv.innerHTML = '<p class="text-red-500">Generation not found</p>';
                    resultsDiv.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error fetching generation:', error);
            if (resultsDiv) {
                resultsDiv.innerHTML = '<p class="text-red-500">Error loading generation</p>';
                resultsDiv.classList.remove('hidden');
            }
        }
    }
}

// Call handleRouting on page load
window.addEventListener('load', handleRouting);
