// src/config.js - Centralized configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jeksrwrzzrczamxijvwl.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impla3Nyd3J6enJjemFteGlqdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzYyMjAsImV4cCI6MjA5NDI1MjIyMH0.1poYpJKNFEVe2NTBkXBTH2bIHGk2yT8aqCU-OlJc4vs';

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://meidriveafrica.vercel.app';

export const COURSES_PER_PAGE = 9;
