// supabaseConfig.ts
// IMPORTANT: Replace the placeholder values below with your actual Supabase project configuration.
// You can find this configuration in your Supabase project settings > API.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These constants represent the *original string values* that would be present
// in a template version of this file before the user inputs their credentials.
const ACTUAL_SUPABASE_URL_PLACEHOLDER_IF_NOT_REPLACED = 'YOUR_SUPABASE_URL';
const ACTUAL_SUPABASE_ANON_KEY_PLACEHOLDER_IF_NOT_REPLACED = 'YOUR_SUPABASE_ANON_KEY';

// Fix: Explicitly type supabaseUrl and supabaseAnonKey as string to prevent TypeScript
// from inferring them as literal types, which causes comparison errors with placeholder constants.
const supabaseUrl: string = 'https://ttbytjfjvqvibstwpknb.supabase.co'; // User has REPLACED this with their actual URL
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Ynl0amZqdnF2aWJzdHdwa25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNTgyNjUsImV4cCI6MjA2MzczNDI2NX0.cXHqwVJJH4wWJD8vJtK7Ie9x8u3zHCEqnrW1dWZfdog'; // User has REPLACED this with their actual key

export const isSupabaseConfigured =
    // Check supabaseUrl: must be truthy, not the placeholder, and not contain "YOUR_"
    supabaseUrl &&
    supabaseUrl !== ACTUAL_SUPABASE_URL_PLACEHOLDER_IF_NOT_REPLACED &&
    !supabaseUrl.includes("YOUR_") && // .includes() can be called directly on string type
    // Check supabaseAnonKey: must be truthy, not the placeholder, and not contain "YOUR_"
    supabaseAnonKey &&
    supabaseAnonKey !== ACTUAL_SUPABASE_ANON_KEY_PLACEHOLDER_IF_NOT_REPLACED &&
    !supabaseAnonKey.includes("YOUR_"); // .includes() can be called directly on string type

// Fix: Type supabase as SupabaseClient | null to allow null assignment without ts-ignore.
let supabase: SupabaseClient | null;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client initialized.");
} else {
  console.warn(
    "Supabase is not configured. Please update supabaseConfig.ts with your project's URL and anon key. " +
    "Supabase-dependent features (like workshop data management) will not work until configured."
  );
  // Provide a null client if not configured. Consuming modules should check isSupabaseConfigured
  // or handle the possibility of a null supabase client.
  supabase = null;
}

export { supabase };