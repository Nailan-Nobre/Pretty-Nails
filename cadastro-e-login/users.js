document.addEventListener("DOMContentLoaded", async () => {
  // Verifica se é mobile
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (window.API_BASE_URL && window.API_BASE_URL !== window.location.origin) {
    Swal.fire({
      title: 'Conectando ao servidor',
      text: 'Por favor, aguarde enquanto estabelecemos a conexão...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    setTimeout(() => {
      Swal.close();
      Swal.fire({
        title: 'Pronto para usar',
        text: 'Você já pode fazer login ou criar sua conta.',
        icon: 'success',
        toast: true,
        position: isMobile ? 'top' : 'bottom-end',
        timer: 2500,
        showConfirmButton: false
      });
    }, 400);
  }
});

async function adicionarUsuario() {
  // Verifica se é mobile para ajustar posição dos toasts
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const toastPosition = isMobile ? 'top' : 'bottom-end';

  // Captura os valores dos campos com validação adicional
  const campoNome = document.querySelector("#nome")?.value?.trim() || "";
  const campoEmail = document.querySelector("#cadastro-email")?.value?.trim() || "";
  const campoSenha = document.querySelector("#cadastro-senha")?.value || "";
  const campoTelefone = document.querySelector("#telefone")?.value?.trim() || "";
  const campoEstado = document.querySelector("#estado")?.value || "";
  const campoCidade = document.querySelector("#cidade")?.value || "";
  const campoTipo = "MANICURE";

  // Validação de senha
  if (campoSenha.length < 6) {
    Swal.fire({
      icon: 'warning',
      title: 'Senha muito curta',
      text: 'Sua senha precisa ter pelo menos 6 caracteres para garantir a segurança da sua conta.',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(campoEmail)) {
    Swal.fire({
      icon: 'warning',
      title: 'Email inválido',
      text: 'Por favor, insira um endereço de email válido (exemplo: seunome@email.com).',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  // Validação de telefone
  if (campoTelefone && !validarTelefone(campoTelefone)) {
    Swal.fire({
      icon: 'warning',
      title: 'Telefone inválido',
      text: 'O telefone deve estar no formato (xx)xxxxx-xxxx. Exemplo: (89)99999-9999.',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  // Validação de campos obrigatórios
  if (!campoNome || !campoEmail || !campoSenha || !campoTelefone || !campoEstado || !campoCidade) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor, preencha todos os campos obrigatórios para criar sua conta.',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  const usuario = {
    nome: campoNome,
    email: campoEmail,
    password: campoSenha,
    telefone: campoTelefone,
    estado: campoEstado,
    cidade: campoCidade,
    tipo: campoTipo
  };

  try {
    // Mostra loading (usando modal normal)
    Swal.fire({
      title: 'Criando sua conta...',
      text: 'Aguarde enquanto processamos seu cadastro',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const resposta = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(usuario)
    });

    // Fecha o loading
    Swal.close();

    const responseData = await resposta.json();
    console.log('Resposta do servidor:', responseData);

    if (!resposta.ok) {
      // Trata diferentes tipos de erro de forma específica
      let mensagemErro = "Não foi possível criar sua conta. Por favor, tente novamente.";
      
      if (resposta.status === 409) {
        mensagemErro = responseData.error || "Já existe uma conta cadastrada com este email. Tente fazer login.";
      } else if (resposta.status === 429 || responseData.error?.toLowerCase().includes('rate limit')) {
        mensagemErro = responseData.error || "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.";
      } else if (resposta.status === 400) {
        // Erro de validação
        if (responseData.error?.toLowerCase().includes('senha')) {
          mensagemErro = "A senha informada não atende aos requisitos de segurança.";
        } else if (responseData.error?.toLowerCase().includes('telefone')) {
          mensagemErro = "O número de telefone informado já está em uso ou é inválido.";
        } else {
          mensagemErro = responseData.error || responseData.message || "Alguns dados informados são inválidos. Verifique e tente novamente.";
        }
      } else if (resposta.status === 500) {
        // Erro do servidor
        mensagemErro = "Ocorreu um problema em nosso servidor. Por favor, tente novamente em alguns instantes.";
      } else if (resposta.status === 503) {
        // Serviço indisponível
        mensagemErro = "Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.";
      } else {
        mensagemErro = responseData.error || responseData.message || mensagemErro;
      }
      
      throw new Error(mensagemErro);
    }

  Swal.fire({
    icon: 'success',
    title: 'Cadastro concluído',
    text: 'Sua conta foi criada com sucesso. Agora você já pode entrar.',
    toast: true,
    position: toastPosition,
    timer: 3000,
    showConfirmButton: false
  });

    // Limpa os campos do formulário
    document.querySelector("#nome").value = "";
    document.querySelector("#cadastro-email").value = "";
    document.querySelector("#cadastro-senha").value = "";
    document.querySelector("#telefone").value = "";
    document.querySelector("#estado").value = "";
    document.querySelector("#cidade").value = "";
    // Volta para o formulário de login
    const container = document.getElementById('container');
    container.classList.remove('right-panel-active');

  } catch (error) {
    // Trata erros de conexão de forma específica
    let mensagemErro = error.message;
    let tituloErro = 'Erro no cadastro';
    
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      tituloErro = 'Sem conexão';
      mensagemErro = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
    } else if (error.message.includes('timeout')) {
      tituloErro = 'Tempo esgotado';
      mensagemErro = 'A conexão demorou muito para responder. Verifique sua internet e tente novamente.';
    }
    
    Swal.fire({
      icon: 'error',
      title: tituloErro,
      text: mensagemErro,
      toast: true,
      position: toastPosition,
      timer: 4000,
      showConfirmButton: false
    });
    console.error("Erro ao cadastrar usuário:", error);
  }
}

async function loginUsuario() {
  // Verifica se é mobile para ajustar posição dos toasts
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const toastPosition = isMobile ? 'top' : 'bottom-end';

  // Captura os valores dos campos com validação adicional
  const campoEmail = document.querySelector("#login-email")?.value?.trim() || "";
  const campoSenha = document.querySelector("#login-senha")?.value || "";

  // Validação de campos obrigatórios
  if (!campoEmail || !campoSenha) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor, preencha seu email e senha para fazer login.',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(campoEmail)) {
    Swal.fire({
      icon: 'warning',
      title: 'Email inválido',
      text: 'Por favor, insira um endereço de email válido.',
      toast: true,
      position: toastPosition,
      timer: 3000,
      showConfirmButton: false
    });
    return;
  }

  const usuario = {
    email: campoEmail,
    password: campoSenha
  };

  console.log('Dados de login sendo enviados:', { email: campoEmail });

  try {
    // Mostra loading (usando modal normal)
    Swal.fire({
      title: 'Entrando...',
      text: 'Verificando suas credenciais',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(usuario)
    });

    // Fecha o loading
    Swal.close();

    const respostaJson = await resposta.json();
    console.log('Resposta de login:', respostaJson);

    if (!resposta.ok) {
      // Trata diferentes tipos de erro de forma específica
      let mensagemErro = "Não foi possível fazer login. Por favor, tente novamente.";
      
      if (resposta.status === 401 || resposta.status === 403) {
        // Não autorizado ou proibido
        if (respostaJson.error?.toLowerCase().includes('email') && respostaJson.error?.toLowerCase().includes('confirmado')) {
          mensagemErro = "Seu email ainda não foi confirmado. Por favor, verifique sua caixa de entrada e clique no link de confirmação que enviamos.";
        } else if (respostaJson.error?.toLowerCase().includes('senha')) {
          mensagemErro = "A senha informada está incorreta. Verifique e tente novamente.";
        } else if (respostaJson.error?.toLowerCase().includes('email')) {
          mensagemErro = "Não encontramos uma conta com este email. Verifique o email digitado ou crie uma nova conta.";
        } else {
          mensagemErro = "Email ou senha incorretos. Por favor, verifique seus dados e tente novamente.";
        }
      } else if (resposta.status === 404) {
        // Não encontrado
        mensagemErro = "Não encontramos uma conta com este email. Verifique o email digitado ou crie uma nova conta.";
      } else if (resposta.status === 429) {
        // Muitas tentativas
        mensagemErro = "Você fez muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.";
      } else if (resposta.status === 500) {
        // Erro do servidor
        mensagemErro = "Ocorreu um problema em nosso servidor. Por favor, tente novamente em alguns instantes.";
      } else if (resposta.status === 503) {
        // Serviço indisponível
        mensagemErro = "Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.";
      } else {
        mensagemErro = respostaJson.error || respostaJson.message || mensagemErro;
      }
      
      throw new Error(mensagemErro);
    }
    const { user, access_token } = respostaJson;

    // Mantém apenas a sessão temporária; dados do perfil são buscados no backend
    sessionStorage.setItem("token", access_token);

    Swal.fire({
      icon: 'success',
      title: 'Login realizado com sucesso!',
      text: `Bem-vindo(a), ${user.nome}!`,
      toast: true,
      position: toastPosition,
      timer: 2000,
      showConfirmButton: false
    });

    // Limpa os campos do formulário
    document.querySelector("#login-email").value = "";
    document.querySelector("#login-senha").value = "";

    // Redireciona baseado no tipo de usuário
    setTimeout(() => {
      window.location.href = '../app/manicure/principal.html';
    }, 2000);

  } catch (error) {
    // Trata erros de conexão de forma específica
    let mensagemErro = error.message;
    let tituloErro = 'Erro no login';
    
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      tituloErro = 'Sem conexão';
      mensagemErro = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
    } else if (error.message.includes('timeout')) {
      tituloErro = 'Tempo esgotado';
      mensagemErro = 'A conexão demorou muito para responder. Verifique sua internet e tente novamente.';
    }
    
    Swal.fire({
      icon: 'error',
      title: tituloErro,
      text: mensagemErro,
      toast: true,
      position: toastPosition,
      timer: 4000,
      showConfirmButton: false
    });
    console.error("Erro ao fazer login:", error);
  }
}
