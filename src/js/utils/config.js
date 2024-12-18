/**
 * Shared configuration for authentication and API services
 */

const config = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    systemPrompt: import.meta.env.VITE_SYSTEM_PROMPT
};

// Validate required configuration
if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('Missing required environment variables:', {
        hasSupabaseUrl: !!config.supabaseUrl,
        hasSupabaseKey: !!config.supabaseAnonKey
    });
    throw new Error('Missing required environment variables');
}

export default config; 