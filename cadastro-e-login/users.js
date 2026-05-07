document.addEventListener("DOMContentLoaded", () => {
  // Mantém apenas o ajuste de viewport no carregamento da página.
  adjustViewportHeight();
});

function isSupabaseConfigured() {
  return Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
}

function getSupabaseClient() {
  if (!window.supabase || !isSupabaseConfigured()) {
    return null;
  }

  if (!window.__prettyNailsSupabaseClient) {
    window.__prettyNailsSupabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );
  }

  return window.__prettyNailsSupabaseClient;
}

function getSupabaseAuthHeaders() {
  return {
    apikey: window.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${window.SUPABASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      ...getSupabaseAuthHeaders(),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_error) {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message = data?.msg || data?.error_description || data?.message || "Não foi possível concluir a requisição.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

function gerarSlugBase(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "manicure";
}

const CADASTRO_COOLDOWN_MS = 5 * 60 * 1000;

function getCadastroCooldownKey(email) {
  return `prettyNailsCadastroCooldown:${String(email || "").toLowerCase()}`;
}

function getCadastroCooldownRemaining(email) {
  const key = getCadastroCooldownKey(email);
  const lastAttempt = Number(localStorage.getItem(key));

  if (!Number.isFinite(lastAttempt) || lastAttempt <= 0) {
    return 0;
  }

  return Math.max(0, CADASTRO_COOLDOWN_MS - (Date.now() - lastAttempt));
}

function markCadastroAttempt(email) {
  localStorage.setItem(getCadastroCooldownKey(email), String(Date.now()));
}

function clearCadastroAttempt(email) {
  localStorage.removeItem(getCadastroCooldownKey(email));
}

function formatCooldownMessage(milliseconds) {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return remainingSeconds > 0
      ? `${minutes} minuto${minutes === 1 ? "" : "s"} e ${remainingSeconds} segundo${remainingSeconds === 1 ? "" : "s"}`
      : `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }

  return `${remainingSeconds} segundo${remainingSeconds === 1 ? "" : "s"}`;
}

function setCadastroButtonState(disabled) {
  const botaoCadastro = document.querySelector(".sign-up-container button");
  if (botaoCadastro) {
    botaoCadastro.disabled = disabled;
  }
}

function getFriendlyAuthMessage(error, fallbackMessage) {
  const rawMessage = String(error?.message || error?.msg || "").toLowerCase();

  if (error?.status === 503 || rawMessage.includes("service unavailable")) {
    return "O serviço está temporariamente indisponível. Tente novamente em alguns minutos.";
  }

  if (rawMessage.includes("email not confirmed") || rawMessage.includes("not confirmed")) {
    return "Seu email ainda não foi confirmado. Verifique sua caixa de entrada.";
  }

  if (rawMessage.includes("invalid login credentials") || rawMessage.includes("authentication failed")) {
    return "Email ou senha incorretos.";
  }

  if (rawMessage.includes("already registered") || rawMessage.includes("already exists") || rawMessage.includes("duplicate") || rawMessage.includes("unique")) {
    return "Já existe uma conta com este email.";
  }

  if (rawMessage.includes("weak password") || rawMessage.includes("password")) {
    return "A senha está muito fraca. Tente outra mais segura.";
  }

  if (error?.name === 'TypeError' || rawMessage.includes('fetch') || rawMessage.includes('network')) {
    return "Não foi possível conectar. Verifique sua internet.";
  }

  return fallbackMessage || "Não foi possível concluir a operação. Tente novamente.";
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options, retries = 1, delayMilliseconds = 3000) {
  let lastResponse = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    lastResponse = await fetch(url, options);

    if (lastResponse.status !== 503 || attempt === retries) {
      return lastResponse;
    }

    await sleep(delayMilliseconds);
  }

  return lastResponse;
}

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

  if (window.__prettyNailsCadastroEmAndamento) {
    Swal.fire({
      icon: 'info',
      title: 'Aguarde um instante',
      text: 'Estamos processando seu cadastro.',
      toast: true,
      position: toastPosition,
      timer: 2500,
      showConfirmButton: false
    });
    return;
  }

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

  const cooldownRemaining = getCadastroCooldownRemaining(campoEmail);
  if (cooldownRemaining > 0) {
    Swal.fire({
      icon: 'info',
      title: 'Cadastro em espera',
      text: `Aguarde ${formatCooldownMessage(cooldownRemaining)} antes de tentar novamente com este email.`,
      toast: true,
      position: toastPosition,
      timer: 4000,
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
    window.__prettyNailsCadastroEmAndamento = true;
    setCadastroButtonState(true);

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

    let responseData;

    if (isSupabaseConfigured()) {
      responseData = await supabaseRequest("/auth/v1/signup", {
        method: "POST",
        body: {
          email: campoEmail,
          password: campoSenha,
          options: {
            data: {
              nome: campoNome,
              telefone: campoTelefone,
              estado: campoEstado,
              cidade: campoCidade,
              tipo: campoTipo
            }
          }
        }
      });

      const novoUsuario = responseData?.user;
      if (!novoUsuario?.id) {
        throw new Error("Não foi possível criar sua conta no Supabase.");
      }
    } else {
      const resposta = await fetchWithRetry(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(usuario)
      });

      const data = await resposta.json();
      responseData = data;

      if (!resposta.ok) {
        // Trata diferentes tipos de erro de forma específica
        let mensagemErro = "Não foi possível criar sua conta. Por favor, tente novamente.";
        
        if (resposta.status === 409) {
          mensagemErro = data.error || "Já existe uma conta cadastrada com este email. Tente fazer login.";
        } else if (resposta.status === 429) {
          mensagemErro = data.error || "Não foi possível concluir o cadastro. Por favor, tente novamente.";
        } else if (resposta.status === 400) {
          // Erro de validação
          if (data.error?.toLowerCase().includes('senha')) {
            mensagemErro = "A senha informada não atende aos requisitos de segurança.";
          } else if (data.error?.toLowerCase().includes('telefone')) {
            mensagemErro = "O número de telefone informado já está em uso ou é inválido.";
          } else {
            mensagemErro = data.error || data.message || "Alguns dados informados são inválidos. Verifique e tente novamente.";
          }
        } else if (resposta.status === 500) {
          mensagemErro = "Ocorreu um problema em nosso servidor. Por favor, tente novamente em alguns instantes.";
        } else if (resposta.status === 503) {
          mensagemErro = "Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.";
        } else {
          mensagemErro = data.error || data.message || mensagemErro;
        }
        
        throw new Error(mensagemErro);
      }
    }

    // Fecha o loading
    Swal.close();

    const novoToken = responseData?.session?.access_token || responseData?.access_token || "";

    if (novoToken) {
      sessionStorage.setItem("token", novoToken);
    }

    const successText = responseData?.message || (isSupabaseConfigured() && !novoToken
      ? 'Sua conta foi criada. Verifique seu email para confirmar o acesso.'
      : 'Sua conta foi criada com sucesso. Agora você já pode entrar.');

    Swal.fire({
      icon: 'success',
      title: 'Cadastro concluído',
      text: successText,
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
    clearCadastroAttempt(campoEmail);
    // Volta para o formulário de login
    const container = document.getElementById('container');
    container.classList.remove('right-panel-active');

  } catch (error) {
    const tituloErro = error?.status === 503 ? 'Serviço indisponível' : 'Erro no cadastro';
    const mensagemErro = getFriendlyAuthMessage(error, 'Não foi possível criar sua conta.');
    const isRateLimit = error?.status === 429 || String(error?.message || '').toLowerCase().includes('rate limit');

    if (isRateLimit) {
      markCadastroAttempt(campoEmail);
      Swal.fire({
        icon: 'info',
        title: 'Cadastro em espera',
        text: 'Esse email foi usado recentemente. Aguarde alguns minutos antes de tentar novamente.',
        toast: true,
        position: toastPosition,
        timer: 4500,
        showConfirmButton: false
      });
      return;
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
  } finally {
    window.__prettyNailsCadastroEmAndamento = false;
    setCadastroButtonState(false);
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

    if (isSupabaseConfigured()) {
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Cliente Supabase não inicializado.');
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: campoEmail,
        password: campoSenha
      });

      if (error) {
        error.status = error.status || 401;
        throw error;
      }

      const access_token = data?.session?.access_token || '';
      const user = data?.user || {};
      const nomeUsuario = user?.user_metadata?.nome || user?.email || campoEmail;

      Swal.close();

      if (access_token) {
        sessionStorage.setItem('token', access_token);
      }

      Swal.fire({
        icon: 'success',
        title: 'Login realizado com sucesso!',
        text: `Bem-vindo(a), ${nomeUsuario}!`,
        toast: true,
        position: toastPosition,
        timer: 2000,
        showConfirmButton: false
      });

      document.querySelector("#login-email").value = "";
      document.querySelector("#login-senha").value = "";

      setTimeout(() => {
        window.location.href = '../app/manicure/principal.html';
      }, 2000);

      return;
    } else {
      let respostaJson;
      const resposta = await fetchWithRetry(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(usuario)
      });

      respostaJson = await resposta.json();

      if (!resposta.ok) {
        let mensagemErro = "Não foi possível fazer login. Por favor, tente novamente.";
        
        if (resposta.status === 401 || resposta.status === 403) {
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
          mensagemErro = "Não encontramos uma conta com este email. Verifique o email digitado ou crie uma nova conta.";
        } else if (resposta.status === 429) {
          mensagemErro = "Não foi possível fazer login. Por favor, tente novamente.";
        } else if (resposta.status === 500) {
          mensagemErro = "Ocorreu um problema em nosso servidor. Por favor, tente novamente em alguns instantes.";
        } else if (resposta.status === 503) {
          mensagemErro = "Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.";
        } else {
          mensagemErro = respostaJson.error || respostaJson.message || mensagemErro;
        }
        
        throw new Error(mensagemErro);
      }

      const access_token = respostaJson?.access_token || respostaJson?.session?.access_token || "";
      const user = respostaJson?.user || {};
      const nomeUsuario = user?.nome || user?.email || campoEmail;

      Swal.close();

      if (access_token) {
        sessionStorage.setItem("token", access_token);
      }

      Swal.fire({
        icon: 'success',
        title: 'Login realizado com sucesso!',
        text: `Bem-vindo(a), ${nomeUsuario}!`,
        toast: true,
        position: toastPosition,
        timer: 2000,
        showConfirmButton: false
      });

      document.querySelector("#login-email").value = "";
      document.querySelector("#login-senha").value = "";

      setTimeout(() => {
        window.location.href = '../app/manicure/principal.html';
      }, 2000);

      return;
    }

  } catch (error) {
    Swal.close();
    const tituloErro = error?.status === 503 ? 'Serviço indisponível' : 'Erro no login';
    const mensagemErro = getFriendlyAuthMessage(error, 'Não foi possível fazer login.');
    
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
  } finally {
    window.__prettyNailsLoginEmAndamento = false;
  }
}
