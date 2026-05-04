window.API_BASE_URL =
	window.__API_BASE_URL__ ||
	(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
		? "http://localhost:3000"
		: window.location.origin);

// Configuração do domínio frontend para compartilhamento
window.FRONTEND_URL = "https://pretty-nails-app.vercel.app";
