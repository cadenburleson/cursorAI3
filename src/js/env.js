// Load and validate environment variables
const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VITE_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Validate required environment variables
if (!VITE_SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL is required');
}

if (!VITE_SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required');
}

// Export the variables
export {
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY
}; 