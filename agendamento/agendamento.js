const state = {
  manicure: null,
  selectedSlot: null,
};

document.addEventListener('DOMContentLoaded', () => {
  const slug = getSlugFromLocation();
  document.getElementById('slugValue').textContent = slug || '-';
  document.getElementById('resumoSlug').textContent = slug || '-';

  bindEvents();
  if (slug) {
    carregarManicure(slug);
  } else {
    renderStatus('Informe um slug na URL, por exemplo: /agendamento/maria-silva', 'warning');
  }
});

function bindEvents() {
  document.getElementById('agendarBtn').addEventListener('click', agendarCliente);
  document.getElementById('recarregarBtn').addEventListener('click', () => {
    const slug = getSlugFromLocation();
    if (slug) carregarManicure(slug);
  });

  document.getElementById('servicoSelect').addEventListener('change', (event) => {
    document.getElementById('resumoServico').textContent = event.target.value || '-';
  });

  document.getElementById('clienteEmail').addEventListener('input', (event) => {
    document.getElementById('resumoEmail').textContent = event.target.value.trim() || '-';
  });

  document.getElementById('clienteNome').addEventListener('input', (event) => {
    document.getElementById('resumoCliente').textContent = event.target.value.trim() || '-';
  });

  document.getElementById('dataInput').addEventListener('change', (event) => {
    document.getElementById('resumoData').textContent = event.target.value || '-';
  });
}

function getSlugFromLocation() {
  const querySlug = new URLSearchParams(window.location.search).get('slug');
  if (querySlug) return querySlug;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const agendamentoIndex = parts.indexOf('agendamento');
  if (agendamentoIndex !== -1 && parts[agendamentoIndex + 1]) {
    return decodeURIComponent(parts[agendamentoIndex + 1]);
  }

  return '';
}

async function carregarManicure(slug) {
  renderStatus('Carregando dados da manicure...', 'info');

  try {
    if (window.PrettyNailsSupabase?.isConfigured()) {
      const manicure = await window.PrettyNailsSupabase.getManicureBySlug(slug);
      if (!manicure) {
        throw new Error('Não foi possível carregar a manicure');
      }

      state.manicure = manicure;
      preencherTela(manicure);
    } else {
      const response = await fetch(`${window.API_BASE_URL}/auth/manicure/${encodeURIComponent(slug)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível carregar a manicure');
      }

      state.manicure = data.manicure;
      preencherTela(data.manicure);
    }

    renderStatus('Manicure carregada com sucesso.', 'success');
  } catch (error) {
    renderStatus(error.message || 'Erro ao carregar manicure', 'error');
    document.getElementById('statusValue').textContent = 'Falha ao carregar';
  }
}

function preencherTela(manicure) {
  document.getElementById('nomeManicure').textContent = manicure.nome || 'Sem nome';
  document.getElementById('bioManicure').textContent = manicure.bio || 'Sem bio informada.';
  document.getElementById('cidadeManicure').textContent = [manicure.cidade, manicure.estado].filter(Boolean).join(' - ') || '-';
  document.getElementById('estrelasManicure').textContent = Number(manicure.estrelas || 0).toFixed(1);
  document.getElementById('telefoneManicure').textContent = manicure.telefone || '-';
  document.getElementById('statusValue').textContent = manicure.ativa ? 'Ativa' : 'Inativa';

  if (manicure.foto) {
    document.getElementById('avatar').src = manicure.foto;
  }

  const dias = Array.isArray(manicure.dias_trabalho) && manicure.dias_trabalho.length
    ? manicure.dias_trabalho.map(formatarDia).join(', ')
    : 'Não informado';

  document.getElementById('diasManicure').textContent = dias;

  const servicos = Array.isArray(manicure.servicos) ? manicure.servicos : [];
  renderServicos(servicos);
  renderSlots(Array.isArray(manicure.horarios) ? manicure.horarios : []);
}

function renderServicos(servicos) {
  const select = document.getElementById('servicoSelect');
  select.innerHTML = '<option value="">Selecione um serviço</option>';

  if (!servicos.length) {
    const option = document.createElement('option');
    option.value = 'Atendimento básico';
    option.textContent = 'Atendimento básico';
    select.appendChild(option);
    return;
  }

  servicos.forEach((servico) => {
    const option = document.createElement('option');
    const nome = typeof servico === 'string' ? servico : servico?.nome || 'Serviço';
    option.value = nome;
    option.textContent = typeof servico === 'string' ? servico : `${nome}${servico?.preco ? ` - R$ ${servico.preco}` : ''}`;
    select.appendChild(option);
  });
}

function renderSlots(horarios) {
  const container = document.getElementById('slotsContainer');
  container.innerHTML = '';

  if (!horarios.length) {
    container.innerHTML = '<div class="empty-state">Nenhum horário cadastrado no banco para esta manicure.</div>';
    return;
  }

  horarios.forEach((horario) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.textContent = horario;
    button.addEventListener('click', () => {
      state.selectedSlot = horario;
      document.querySelectorAll('.slot').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      document.getElementById('resumoHorario').textContent = horario;
    });
    container.appendChild(button);
  });
}

function montarDataHoraAgendamento(data, horario) {
  return new Date(`${data}T${horario}:00`);
}

async function agendarCliente() {
  const servico = document.getElementById('servicoSelect').value;
  const data = document.getElementById('dataInput').value;
  const nome = document.getElementById('clienteNome').value.trim();
  const email = document.getElementById('clienteEmail').value.trim();
  const cpf = document.getElementById('clienteCpf').value.trim();
  const telefone = document.getElementById('clienteTelefone').value.trim();
  const observacoes = document.getElementById('observacoes').value.trim();
  const slug = getSlugFromLocation();

  if (!state.manicure) {
    renderStatus('Carregue uma manicure válida antes de agendar.', 'error');
    return;
  }

  if (!servico || !data || !nome || !email || !cpf || !telefone || !state.selectedSlot) {
    renderStatus('Preencha serviço, data, horário, nome, e-mail, CPF e telefone.', 'warning');
    return;
  }

  try {
    renderStatus('Enviando agendamento...', 'info');

    const dataHora = montarDataHoraAgendamento(data, state.selectedSlot);

    if (window.PrettyNailsSupabase?.isConfigured()) {
      await window.PrettyNailsSupabase.createPublicAgendamento({
        manicure_id: state.manicure.id,
        cliente_nome: nome,
        cliente_email: email,
        cliente_cpf: cpf,
        cliente_telefone: telefone,
        data_hora: dataHora.toISOString(),
        servico,
        observacoes,
        valor: null,
        status: 'pendente',
        avaliado: false
      });
    } else {
      const response = await fetch(`${window.API_BASE_URL}/api/agendamentos/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug,
          dataHora: dataHora.toISOString(),
          servico,
          observacoes,
          clienteNome: nome,
          clienteEmail: email,
          clienteCpf: cpf,
          clienteTelefone: telefone
        })
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.error || 'Não foi possível concluir o agendamento');
      }
    }

    Swal.fire({
      icon: 'success',
      title: 'Agendamento realizado',
      html: `
        <b>Manicure:</b> ${state.manicure.nome}<br>
        <b>Slug:</b> ${state.manicure.slug}<br>
        <b>Serviço:</b> ${servico}<br>
        <b>Data:</b> ${data}<br>
        <b>Horário:</b> ${state.selectedSlot}<br>
        <b>E-mail:</b> ${email}<br>
        <b>Cliente:</b> ${nome}
      `,
      confirmButtonText: 'OK'
    });

    renderStatus('Agendamento enviado com sucesso. O e-mail foi encaminhado para o cliente e para a manicure.', 'success');
  } catch (error) {
    renderStatus(error.message || 'Erro ao agendar', 'error');
    Swal.fire({
      icon: 'error',
      title: 'Erro ao agendar',
      text: error.message || 'Não foi possível concluir o agendamento'
    });
  }
}

function renderStatus(message, type) {
  const box = document.getElementById('statusBox');
  box.style.display = 'block';
  box.textContent = message;
  document.getElementById('statusValue').textContent = type === 'error' ? 'Erro' : type === 'warning' ? 'Atenção' : 'OK';

  const palette = {
    info: 'rgba(184, 92, 56, 0.08)',
    success: 'rgba(34, 139, 85, 0.12)',
    warning: 'rgba(242, 166, 90, 0.18)',
    error: 'rgba(180, 40, 40, 0.12)'
  };

  box.style.background = palette[type] || palette.info;
}

function formatarDia(dia) {
  const mapa = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  };

  return mapa[dia] ?? String(dia);
}