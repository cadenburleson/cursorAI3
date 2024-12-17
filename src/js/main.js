import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
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

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: CONFIG.OPENAI_API_KEY,
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

// Auth state management
let currentUser = null;

// Check initial auth state
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) {
        loadUserHistory();
    }
});

// Update UI based on auth state
function updateAuthUI() {
    if (currentUser) {
        authStatus.textContent = `Logged in as: ${currentUser.email}`;
        loginButton.classList.add('hidden');
        signupButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
    } else {
        authStatus.textContent = 'Not logged in';
        loginButton.classList.remove('hidden');
        signupButton.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    }
}

// Auth event listeners
loginButton.addEventListener('click', async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
});

signupButton.addEventListener('click', async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        alert('Check your email for verification link!');
    } catch (error) {
        alert('Error signing up: ' + error.message);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        alert('Error logging out: ' + error.message);
    }
});

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        alert('Please log in first!');
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
                    content: CONFIG.SYSTEM_PROMPT
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
            <div class="mt-4 flex justify-end">
                <button 
                    onclick="window.copyShareLink('${gen.id}')"
                    class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                </button>
            </div>
        </details>
    `}).join('');
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