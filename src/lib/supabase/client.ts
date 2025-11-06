import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ksgoinbgtcnlxlitvedz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ29pbmJndGNubHhsaXR2ZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDU5NTEsImV4cCI6MjA3MjMyMTk1MX0.qFaXdJdrBSuRtrKErTF8niNjK4HUSGuayqv4f1VfzrU'

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', { 
    url: !!supabaseUrl, 
    key: !!supabaseKey 
  });
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'hse-supabase-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'hse-monitoring-system',
      'Connection': 'keep-alive'
    },
    // Increase fetch timeout to 60 seconds
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true
      }).finally(() => clearTimeout(timeoutId));
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    // Heartbeat to keep connection alive
    heartbeatIntervalMs: 30000, // 30 seconds
    // Increase timeout for realtime connections
    timeout: 60000 // 60 seconds
  }
})

// For backward compatibility
export const supabase = supabaseClient

// Connection health check and recovery
let connectionHealthy = true;
let lastSuccessfulRequest = Date.now();

// Periodic health check
if (typeof window !== 'undefined') {
  setInterval(async () => {
    try {
      // Simple query to test connection
      const { error } = await supabaseClient.from('kpi_period').select('count').limit(1).single();
      
      if (!error) {
        connectionHealthy = true;
        lastSuccessfulRequest = Date.now();
      } else {
        console.warn('Connection health check failed:', error);
        connectionHealthy = false;
      }
    } catch (error) {
      console.warn('Connection health check error:', error);
      connectionHealthy = false;
      
      // If connection has been down for more than 60 seconds, force page reload
      const timeSinceLastSuccess = Date.now() - lastSuccessfulRequest;
      if (timeSinceLastSuccess > 60000) {
        console.error('Connection lost for over 60 seconds. Attempting to recover...');
        // Try to refresh auth session
        try {
          await supabaseClient.auth.refreshSession();
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Failed to refresh session:', refreshError);
        }
      }
    }
  }, 30000); // Check every 30 seconds
}

// Test connection on initialization
supabaseClient.auth.getSession()
  .then(() => {
    console.log('Supabase connection initialized successfully');
    lastSuccessfulRequest = Date.now();
  })
  .catch((error) => {
    console.error('Supabase connection test failed:', error);
    connectionHealthy = false;
  });

// Export connection status
export const getConnectionStatus = () => ({
  healthy: connectionHealthy,
  lastSuccessfulRequest
});
