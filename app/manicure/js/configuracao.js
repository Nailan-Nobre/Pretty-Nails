// Configurações - Manicure
document.addEventListener("DOMContentLoaded", function() {
    loadUserName();

    // Inicializar sistema de tema
    const themeManager = initTheme();
    
    // Adicionar event listener específico para o item de tema
    const themeToggleItem = document.getElementById('theme-toggle-item');
    if (themeToggleItem) {
        themeToggleItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Ciclar entre os temas: light -> dark -> auto -> light
            const currentTheme = themeManager.getTheme();
            let nextTheme;
            
            switch(currentTheme) {
                case 'light':
                    nextTheme = 'dark';
                    break;
                case 'dark':
                    nextTheme = 'auto';
                    break;
                case 'auto':
                    nextTheme = 'light';
                    break;
                default:
                    nextTheme = 'light';
            }
            
            // Aplicar o novo tema
            themeManager.setTheme(nextTheme);
            showThemeFeedback(nextTheme);
            
            // Efeito visual no item clicado
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-1px)';
            }, 150);
        });
    }

    // Adicionar event listeners para os outros itens de configuração
    const configItems = document.querySelectorAll('.config-item:not(#theme-toggle-item)');
    configItems.forEach(item => {
        item.addEventListener('click', function() {
            // Adicionar efeito visual de click
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-1px)';
            }, 100);

            // Aqui você pode adicionar a lógica específica para cada configuração
            console.log('Configuração clicada:', this.querySelector('.config-item-left').textContent);
        });
    });
});

async function loadUserName() {
    const userNameElement = document.getElementById("user-name");
    const token = sessionStorage.getItem('token');

    if (!userNameElement) return;

    if (!token) {
        userNameElement.textContent = 'Manicure';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao carregar perfil');

        const payload = await response.json();
        const user = payload.user || payload;
        userNameElement.textContent = (user.nome || 'Manicure').split(' ')[0];
    } catch (error) {
        userNameElement.textContent = 'Manicure';
    }
}

// Função para mostrar feedback visual de mudança de tema
function showThemeFeedback(theme) {
    const feedback = document.createElement('div');
    feedback.className = 'theme-feedback';
    
    let emoji = '🎨';
    let text = '';
    
    switch(theme) {
        case 'light':
            emoji = '🌞';
            text = 'Tema claro ativado!';
            break;
        case 'dark':
            emoji = '🌙';
            text = 'Tema escuro ativado!';
            break;
        case 'auto':
            emoji = '🔄';
            text = 'Tema automático ativado!';
            break;
    }
    
    feedback.innerHTML = `${emoji} ${text}`;
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-light);
        color: var(--text-inverse);
        padding: 12px 20px;
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        font-weight: 500;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        pointer-events: none;
    `;

    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 3000);
}

// Função de logout (compartilhada com outras telas)
function logout() {
    if (confirm("Tem certeza que deseja sair?")) {
        sessionStorage.removeItem('token');
        window.location.href = "../../cadastro-e-login/cadastro-e-login.html";
    }
}
