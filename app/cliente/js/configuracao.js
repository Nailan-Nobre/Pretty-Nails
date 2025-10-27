function mostrarAvisoDesenvolvimento() {
    Swal.fire({
        title: '🚧 Tela em Desenvolvimento',
        html: `
            <p style="font-size: 16px; color: #666; margin: 10px 0;">
                Esta funcionalidade está sendo desenvolvida.
            </p>
            <p style="font-size: 14px; color: #888;">
                Algumas funcionalidades podem não estar disponíveis ou apresentar comportamento instável.
            </p>
        `,
        icon: 'info',
        confirmButtonText: 'Entendi',
        confirmButtonColor: '#d4a574',
        backdrop: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'swal-dev-warning',
            title: 'swal-dev-title',
            htmlContainer: 'swal-dev-text'
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    mostrarAvisoDesenvolvimento();
});

// Configurações - Cliente
document.addEventListener("DOMContentLoaded", function() {
    // Carregar nome do usuário
    const userName = localStorage.getItem("userName") || "Usuário";
    const userNameElement = document.getElementById("user-name");
    if (userNameElement) {
        userNameElement.textContent = userName.split(" ")[0]; // Primeiro nome apenas
    }

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
        background: var(--primary);
        color: white;
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
        localStorage.clear();
        window.location.href = "../../cadastro-e-login/cadastro-e-login.html";
    }
}
