window.PrettyNailsSupabase = (() => {
  const getBaseUrl = () => window.SUPABASE_URL || "";
  const getAnonKey = () => window.SUPABASE_ANON_KEY || "";
  const getAuthToken = () => sessionStorage.getItem("token") || "";

  function isConfigured() {
    return Boolean(getBaseUrl() && getAnonKey() && getAuthToken());
  }

  function buildHeaders({ auth = true, json = true } = {}) {
    const headers = {
      apikey: getAnonKey(),
      ...(json ? { "Content-Type": "application/json", Accept: "application/json" } : {}),
    };

    if (auth && getAuthToken()) {
      headers.Authorization = `Bearer ${getAuthToken()}`;
    } else if (auth) {
      headers.Authorization = `Bearer ${getAnonKey()}`;
    }

    return headers;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers: buildHeaders(options.headersOptions),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = text;
      }
    }

    if (!response.ok) {
      const message = data?.message || data?.error || data?.msg || `Erro na requisição (${response.status})`;
      throw new Error(message);
    }

    return data;
  }

  async function getCurrentAuthUser() {
    return request("/auth/v1/user", { headersOptions: { auth: true, json: true } });
  }

  async function getCurrentManicureProfile() {
    const authUser = await getCurrentAuthUser();
    const rows = await request(`/rest/v1/manicures?select=*&id=eq.${encodeURIComponent(authUser.id)}&limit=1`, {
      headersOptions: { auth: true, json: true },
    });

    return Array.isArray(rows) ? (rows[0] || null) : rows;
  }

  async function updateCurrentManicureProfile(profileData) {
    const authUser = await getCurrentAuthUser();
    return request(`/rest/v1/manicures?id=eq.${encodeURIComponent(authUser.id)}`, {
      method: "PATCH",
      headersOptions: { auth: true, json: true },
      body: profileData,
    });
  }

  async function listCurrentManicureAgendamentos() {
    const authUser = await getCurrentAuthUser();
    return request(
      `/rest/v1/agendamentos?select=*&manicure_id=eq.${encodeURIComponent(authUser.id)}&order=data_hora.desc`,
      { headersOptions: { auth: true, json: true } }
    );
  }

  async function listAgendamentosByStatus(status) {
    const authUser = await getCurrentAuthUser();
    return request(
      `/rest/v1/agendamentos?select=*&manicure_id=eq.${encodeURIComponent(authUser.id)}&status=eq.${encodeURIComponent(status)}&order=data_hora.desc`,
      { headersOptions: { auth: true, json: true } }
    );
  }

  async function updateAgendamentoStatus(agendamentoId, status) {
    return request(`/rest/v1/agendamentos?id=eq.${encodeURIComponent(agendamentoId)}`, {
      method: "PATCH",
      headersOptions: { auth: true, json: true },
      body: { status },
    });
  }

  async function listCurrentManicureFeedbacks() {
    const authUser = await getCurrentAuthUser();
    return request(
      `/rest/v1/feedbacks?select=*&manicure_id=eq.${encodeURIComponent(authUser.id)}&order=created_at.desc`,
      { headersOptions: { auth: true, json: true } }
    );
  }

  async function getManicureBySlug(slug) {
    const rows = await request(`/rest/v1/manicures?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`, {
      headersOptions: { auth: false, json: true },
    });

    return Array.isArray(rows) ? (rows[0] || null) : rows;
  }

  async function createPublicAgendamento(payload) {
    return request(`/rest/v1/agendamentos`, {
      method: "POST",
      headersOptions: { auth: false, json: true },
      body: payload,
    });
  }

  async function signOut() {
    const client = window.__prettyNailsSupabaseClient;
    if (client) {
      try {
        await client.auth.signOut({ scope: "global" });
      } catch (_error) {
        // Ignora falhas de logout remoto e segue limpando a sessão local.
      }
    }

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (_error) {
      // Se o navegador bloquear alguma operação, ainda seguimos com o logout.
      sessionStorage.removeItem("token");
    }

    window.__prettyNailsSupabaseClient = null;

    if (client && typeof client.removeAllChannels === "function") {
      try {
        client.removeAllChannels();
      } catch (_error) {
        // Sem efeito se não houver canais ativos.
      }
    }
  }

  async function logoutAndRedirect(redirectUrl) {
    await signOut();
    window.location.href = redirectUrl;
  }

  function groupMonthlyAgendamentos(agendamentos, monthsBack = 5) {
    const months = [];
    const labels = [];
    const dadosConcluidos = [];
    const dadosCancelados = [];

    for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - offset);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      months.push({ key, year, month });
      labels.push(date.toLocaleDateString("pt-BR", { month: "short" }));
      dadosConcluidos.push(0);
      dadosCancelados.push(0);
    }

    agendamentos.forEach((agendamento) => {
      const data = new Date(agendamento.data_hora);
      const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      const index = months.findIndex((item) => item.key === key);
      if (index === -1) return;

      const status = String(agendamento.status || "").toLowerCase();
      if (status === "concluido") {
        dadosConcluidos[index] += 1;
      } else if (status === "cancelado" || status === "recusado") {
        dadosCancelados[index] += 1;
      }
    });

    return {
      labels,
      dadosConcluidos,
      dadosCancelados,
      totalConcluidos: dadosConcluidos.reduce((total, item) => total + item, 0),
      totalCancelados: dadosCancelados.reduce((total, item) => total + item, 0),
    };
  }

  function groupYearHistory(agendamentos, ano) {
    const labels = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    const concluidos = Array(12).fill(0);
    const cancelados = Array(12).fill(0);

    agendamentos.forEach((agendamento) => {
      const data = new Date(agendamento.data_hora);
      if (data.getFullYear() !== Number(ano)) return;

      const index = data.getMonth();
      const status = String(agendamento.status || "").toLowerCase();
      if (status === "concluido") {
        concluidos[index] += 1;
      } else if (status === "cancelado" || status === "recusado") {
        cancelados[index] += 1;
      }
    });

    return {
      labels,
      dadosConcluidos: concluidos,
      dadosCancelados: cancelados,
      totalConcluidos: concluidos.reduce((total, item) => total + item, 0),
      totalCancelados: cancelados.reduce((total, item) => total + item, 0),
    };
  }

  function buildFeedbackSummary(feedbacks) {
    const totalReviews = feedbacks.length;
    const averageRating = totalReviews
      ? feedbacks.reduce((sum, item) => sum + Number(item.estrelas || 0), 0) / totalReviews
      : 0;

    const countsByStars = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    feedbacks.forEach((feedback) => {
      const stars = Number(feedback.estrelas || 0);
      if (countsByStars[stars] !== undefined) {
        countsByStars[stars] += 1;
      }
    });

    return {
      averageRating,
      totalReviews,
      countsByStars,
      recentFeedbacks: feedbacks.slice(0, 3),
    };
  }

  return {
    isConfigured,
    getCurrentAuthUser,
    getCurrentManicureProfile,
    updateCurrentManicureProfile,
    listCurrentManicureAgendamentos,
    listAgendamentosByStatus,
    updateAgendamentoStatus,
    listCurrentManicureFeedbacks,
    getManicureBySlug,
    createPublicAgendamento,
    signOut,
    logoutAndRedirect,
    groupMonthlyAgendamentos,
    groupYearHistory,
    buildFeedbackSummary,
  };
})();