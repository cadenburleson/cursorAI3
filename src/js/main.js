import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';
import { marked } from 'marked';

// Configure marked options for GitHub-flavored markdown
marked.setOptions({
    gfm: true,
    breaks: true,
    tables: true
});

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
console.log('Main: Supabase client initialized');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: CONFIG.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: CONFIG.ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true
});

// DOM Elements
const form = document.getElementById('generator-form');
const resultsDiv = document.getElementById('results');
const generatedIdeaDiv = document.getElementById('generated-idea');
const historyList = document.getElementById('history-list');
const authStatus = document.getElementById('auth-status');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const generateButton = document.querySelector('#generator-form button[type="submit"]');
const modelSelector = document.getElementById('model-selector');

// Auth state management
let currentUser = null;

// Initialize auth state
async function initializeAuth() {
    console.log('Main: Initializing auth state...');
    try {
        // Check for auth state in URL
        const urlParams = new URLSearchParams(window.location.search);
        const authState = urlParams.get('auth_state');

        if (authState) {
            console.log('Main: Found auth state in URL');
            try {
                // Decode and parse the state
                const state = JSON.parse(atob(authState));

                // Set the session in Supabase client
                await supabase.auth.setSession({
                    access_token: state.access_token,
                    refresh_token: state.refresh_token
                });

                // Clean up URL
                window.history.replaceState({}, document.title, '/');

                // Verify session was set
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (!session) {
                    throw new Error('Failed to initialize session from URL state');
                }

                currentUser = session.user;
                updateAuthUI();
                await loadUserHistory();
                return;
            } catch (error) {
                console.error('Main: Error setting session from URL state:', error);
                window.location.href = '/login.html';
                return;
            }
        }

        // If no auth state in URL, check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            currentUser = session.user;
            updateAuthUI();
            await loadUserHistory();
        } else {
            currentUser = null;
            updateAuthUI();
        }
    } catch (error) {
        console.error('Main: Auth initialization error:', error);
        window.location.href = '/login.html';
    }
}

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Main: Auth state changed:', {
        event,
        user: session?.user?.email || 'none',
        timestamp: new Date().toISOString(),
        hasAccessToken: session?.access_token ? 'exists' : 'missing'
    });

    if (event === 'SIGNED_OUT') {
        console.log('Main: User signed out, clearing state');
        currentUser = null;
        updateAuthUI();
        return;
    }

    currentUser = session?.user || null;
    console.log('Main: Current user updated:', currentUser?.email || 'none');

    updateAuthUI();

    if (currentUser) {
        console.log('Main: Loading user history...');
        loadUserHistory().catch(err => {
            console.error('Main: Error loading history:', err);
        });
    } else {
        console.log('Main: Clearing history for logged out user');
        historyList.innerHTML = '';
    }
});

// Update UI based on auth state
function updateAuthUI() {
    console.log('Main: Updating UI for user:', currentUser?.email || 'none');

    if (currentUser) {
        console.log('Main: User is logged in, showing authenticated UI');
        authStatus.textContent = `Logged in as: ${currentUser.email}`;
        loginButton.classList.add('hidden');
        signupButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        generateButton.disabled = false;
        generateButton.title = '';
    } else {
        console.log('Main: User is not logged in, showing public UI');
        authStatus.textContent = 'Not logged in';
        loginButton.classList.remove('hidden');
        signupButton.classList.remove('hidden');
        logoutButton.classList.add('hidden');
        generateButton.disabled = true;
        generateButton.title = 'Please log in to generate ideas';
    }
}

// Auth event listeners
loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Main: Login button clicked, redirecting to login page');
    window.location.replace('/login.html');
});

signupButton.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Main: Signup button clicked, redirecting to signup page');
    window.location.replace('/signup.html');
});

logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Main: Logout button clicked');
    try {
        console.log('Main: Signing out...');
        await supabase.auth.signOut();
        console.log('Main: Sign out successful');
        currentUser = null;
        updateAuthUI();
        window.location.replace('/');
    } catch (error) {
        console.error('Main: Error logging out:', error);
        console.error('Main: Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        alert('Error logging out: ' + error.message);
    }
});

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Main: DOM loaded, initializing auth...');
    initializeAuth().catch(error => {
        console.error('Main: Error during auth initialization:', error);
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
        let generated_idea;
        const selectedModel = modelSelector.value;

        if (selectedModel.startsWith('claude')) {
            // Generate idea using Anthropic
            const completion = await anthropic.messages.create({
                model: selectedModel,
                max_tokens: 4096,
                messages: [{
                    role: "user",
                    content: userPrompt
                }],
                system: CONFIG.SYSTEM_PROMPT
            });

            console.log('Anthropic API Response:', completion);
            console.log('Content structure:', completion.content);

            generated_idea = completion.content[0].value || completion.content[0].text;

            // If the response is still undefined, try accessing the content directly
            if (!generated_idea && completion.content) {
                generated_idea = typeof completion.content === 'string' ? completion.content : JSON.stringify(completion.content);
            }

            // Final fallback
            if (!generated_idea) {
                console.error('Failed to extract content from response:', completion);
                throw new Error('Failed to get a valid response from Claude');
            }

            console.log('Final generated idea:', generated_idea);
        } else {
            // Generate idea using OpenAI
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: CONFIG.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                model: selectedModel,
            });
            generated_idea = completion.choices[0].message.content;
        }

        // Save to Supabase
        const { data, error } = await supabase
            .from('side_hustle_generations')
            .insert([{
                user_id: currentUser.id,
                generated_idea,
                inputs,
                model: selectedModel
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
        console.log('Loading history for user:', currentUser?.id);
        const { data, error } = await supabase
            .from('side_hustle_generations')
            .select('*')
            .eq('user_id', currentUser?.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching history:', error);
            throw error;
        }

        console.log('Fetched generations:', data);
        displayHistory(data || []);
    } catch (error) {
        console.error('Error loading history:', error);
        historyList.innerHTML = '<p class="text-red-500">Error loading generation history</p>';
    }
}

// Display generation history with markdown formatting
function displayHistory(generations) {
    if (!Array.isArray(generations)) {
        console.error('Invalid generations data:', generations);
        return;
    }

    historyList.innerHTML = generations.map(gen => {
        try {
            if (!gen || !gen.generated_idea) {
                console.warn('Invalid generation entry:', gen);
                return '';
            }

            // Extract the first line as title, fallback to timestamp if no clear title
            const lines = gen.generated_idea.split('\n').filter(line => line.trim());
            const title = lines.length > 0 ? lines[0].replace(/^#\s*/, '').trim() : 'Side Hustle Idea';
            const timestamp = gen.created_at ? new Date(gen.created_at).toLocaleString() : 'Unknown Date';

            // Determine model display name and color
            const modelDisplay = gen.model ? gen.model.includes('claude') ? {
                name: 'Claude',
                bgColor: 'bg-orange-500',
            } : {
                name: 'GPT',
                bgColor: 'bg-blue-500',
            } : {
                name: 'Unknown',
                bgColor: 'bg-gray-500',
            };

            return `
            <details class="bg-white rounded-lg shadow-md p-4 mb-4 group">
                <summary class="list-none cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="text-gray-500 mr-2">▶</div>
                            <div>
                                <div class="text-sm text-gray-700">${title}</div>
                                <div class="text-xs text-gray-400">${timestamp}</div>
                            </div>
                        </div>
                        <span class="${modelDisplay.bgColor} text-white text-xs px-2 py-1 rounded-full">
                            ${modelDisplay.name}
                        </span>
                    </div>
                </summary>
                <div class="mt-4 pl-6">
                    <div class="prose max-w-none">${marked.parse(gen.generated_idea)}</div>
                    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h3 class="font-semibold text-gray-700 mb-2">Generation Inputs:</h3>
                        <div class="space-y-2 text-sm text-gray-600">
                            ${gen.inputs ? `
                                <div>${gen.inputs.skills || ''}</div>
                                <div>${gen.inputs.background || ''}</div>
                                <div>${gen.inputs.ideal_customer || ''}</div>
                                <div>${gen.inputs.secondary_goal || ''}</div>
                            ` : '<div>No input data available</div>'}
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
                </div>
            </details>
        `;
        } catch (error) {
            console.error('Error displaying generation:', error, gen);
            return '';
        }
    }).join('');
}

// Add copy share link function to window object
window.copyShareLink = async function (generationId) {
    const shareUrl = `${window.location.origin}/generation/${generationId}`;
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
    const path = window.location.pathname;
    const generationMatch = path.match(/^\/generation\/(.+)$/);

    if (generationMatch) {
        const generationId = generationMatch[1];
        try {
            const { data: generation, error } = await supabase
                .from('side_hustle_generations')
                .select('*')
                .eq('id', generationId)
                .single();

            if (error) throw error;

            if (generation) {
                // Hide the form and show only the result
                document.getElementById('generator-form').parentElement.style.display = 'none';
                document.getElementById('history').style.display = 'none';

                // Display the shared generation
                resultsDiv.classList.remove('hidden');
                displayResult(generation.generated_idea);

                // Add a "Generate Your Own" button
                const generateOwnBtn = document.createElement('div');
                generateOwnBtn.className = 'mt-8 text-center';
                generateOwnBtn.innerHTML = `
                    <a href="/" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Generate Your Own Side-Hustle Idea
                    </a>
                `;
                resultsDiv.appendChild(generateOwnBtn);
            } else {
                resultsDiv.innerHTML = '<p class="text-red-500">Generation not found</p>';
                resultsDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching generation:', error);
            resultsDiv.innerHTML = '<p class="text-red-500">Error loading generation</p>';
            resultsDiv.classList.remove('hidden');
        }
    }
}

// Call handleRouting on page load
window.addEventListener('load', handleRouting); 