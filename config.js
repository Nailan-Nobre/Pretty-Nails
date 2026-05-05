//window.API_BASE_URL = "http://localhost:3000";
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

window.SUPABASE_URL = window.__SUPABASE_URL__ || "https://snucilawqaxftfzqashg.supabase.co";
window.SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudWNpbGF3cWF4ZnRmenFhc2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTA4MjcsImV4cCI6MjA5MjM4NjgyN30.c5fRMyUaRdLfJ6FCWkAbf6VLaBK7tQOWSPFL5lOMXHM";
window.SUPABASE_FUNCTIONS_URL = window.__SUPABASE_FUNCTIONS_URL__ || "";

window.API_BASE_URL =
	window.__API_BASE_URL__ ||
	window.SUPABASE_FUNCTIONS_URL ||
	(isLocalhost ? "http://localhost:3000" : "");

// Configuração do domínio frontend para compartilhamento
window.FRONTEND_URL = "https://pretty-nails-app.vercel.app";
