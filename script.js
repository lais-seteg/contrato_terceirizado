// ══════════════════════════════════════════════════════
//  CONTRATAÇÃO DE TERCEIRIZADOS · Seteg v3.1
// ══════════════════════════════════════════════════════

const SESSION_KEY = "seteg_ter_sessao";

// ══════════════════════════════════════════════════════
//  SUPABASE
// ══════════════════════════════════════════════════════
const SUPA_URL = 'https://hqyoszdilauarrhxpgjg.supabase.co';
const SUPA_KEY = 'sb_publishable_4gHAO6N33CaLCKgVzPa6Dw_YMP5LXo4';
const supa     = supabase.createClient(SUPA_URL, SUPA_KEY);

let DB = { contratos:[], terceirizados:[], avaliacoes:[], auditoria:[] };
let STATE = {
  perfil: "solicitante",
  nomeUsuario: "",
  secaoAtiva: "dashboard",
  filtros: {
    contratos:     { status: "", empresa: "", tipo: "", busca: "", pagina: 1 },
    terceirizados: { tipo: "", busca: "", pagina: 1 },
    avaliacoes:    { pagina: 1 },
    auditoria:     { busca: "", pagina: 1 }
  }
};
let entregas = [];

// Botões de decisão no modal de análise (ícone + label + classe)
const STATUS_BTNS = {
  "gestao": [
    { status:"Aprovado",   icon:"✓", label:"Aprovado",   cls:"btn-status-ok"   },
    { status:"Reprovado",  icon:"✗", label:"Reprovado",  cls:"btn-status-err"  },
    { status:"Pendente",   icon:"⚠", label:"Pendente",   cls:"btn-status-warn" },
    { status:"Finalizado", icon:"✔", label:"Finalizado", cls:"btn-status-final" },
  ],
  "gestao-pessoas": [
    { status:"Aprovado",   icon:"✓", label:"Aprovado",   cls:"btn-status-ok"   },
    { status:"Finalizado", icon:"✔", label:"Finalizado", cls:"btn-status-final" },
    { status:"Pendente",   icon:"⚠", label:"Pendente",   cls:"btn-status-warn" },
  ]
};

// Fluxo: Líder → Em Fila → Gestão aprova → Aprovado → GP finaliza → Finalizado
const STATUS_POR_PERFIL = {
  solicitante:      ["Em Fila"],
  "gestao-pessoas": ["Aprovado","Finalizado","Pendente"],
  gestao:           ["Em Fila","Aprovado","Reprovado","Pendente","Finalizado"]
};

const STATUS_CLASS = {
  // Status ativos
  "Em Fila":   "st-em-fila",
  "Aprovado":  "st-aprovado",
  "Reprovado": "st-reprovado",
  "Pendente":  "st-pendente",
  "Finalizado":"st-finalizado",
  // Legado (dados existentes)
  "Rascunho":"st-rascunho","Em Elaboração":"st-elaboracao",
  "Aguardando Gestão de Pessoas":"st-aguar-gp","Em Análise DP/RH":"st-analise",
  "Aguardando Gestão":"st-aguar-gestao","Pendente de Ajuste":"st-pendente",
  "Cancelado":"st-cancelado","Encerrado":"st-encerrado"
};

const CAMPOS_CONTRATO = [
  "cId","cStatus","cRazaoSocial","cNomeFantasia","cCnpjEmpresa","cRespEmpresa",
  "cEmailEmpresa","cTelEmpresa","cEndEmpresa","cNumeroContrato","cEmpresaContratante",
  "cTipoContratacao","cTipoOutro","cDataInicio","cDataFim","cCentroCusto","cProjeto",
  "cUnidade","cValorMensal","cValorTotal","cObjeto","cObjetoOutro","cArt",
  "cEscopo","cCronograma",
  "cTerceirizadoId","cTercNome","cTercEmail","cTercCpf","cTercRg","cTercNascimento",
  "cTercFuncao","cTercTelefone","cTercEstado","cTercMunicipio","cTercEndereco",
  "cTercEstadoCivil","cTercGraduacao","cTercNivelFormacao","cTercAreaExpertise","cTercRegistro",
  "cTercCrbio2","cTercCtf","cTercLattes","cTercCnh","cTercCursosExtras",
  "cTercComprovante","cTercCnpj","cTercEmissao","cTercFormaPgto","cTercParcelas","cDadosPagamento",
  "cTercDisponibilidade","cTercEmerg1Nome","cTercEmerg1Tel","cTercEmerg2Nome","cTercEmerg2Tel",
  "cTercProjetosSeteg",
  "cRespNome","cRespSetor","cRespCargo","cRespEmail","cRespDiretoria",
  "cOutrasInfo","cObsGP","cObsGestao"
];

const CAMPOS_TERC = [
  "tId","tNome","tTipo","tEmail","tCpf","tRg","tNascimento","tEstadoCivil","tTelefone","tEstado",
  "tCidade","tEndereco","tGraduacao","tNivelFormacao","tAreaExpertise","tCursosExtras",
  "tLattes","tRegistro","tCrbio2","tCtf","tCnh","tExpDirecao","tPossuiCnpj","tCnpj",
  "tComprovante","tEmissao","tFormaPgto","tParcelas","tDadosBancarios","tEmerg1Nome","tEmerg1Tel",
  "tEmerg2Nome","tEmerg2Tel","tProjetosSeteg","tDisponibilidade","tOutrasInfo"
];
const TERC_LABELS = {
  tNome:"Nome",tTipo:"Tipo",tEmail:"E-mail",tCpf:"CPF",tRg:"RG",tNascimento:"Nascimento",
  tEstadoCivil:"Estado Civil",
  tTelefone:"Telefone",tEstado:"Estado",tCidade:"Cidade",tEndereco:"Endereço",
  tGraduacao:"Graduação",tNivelFormacao:"Nível Formação",tAreaExpertise:"Área",
  tCursosExtras:"Cursos",tLattes:"Lattes",tRegistro:"Registro",tCrbio2:"CRBio2",
  tCtf:"CTF",tCnh:"CNH",tExpDirecao:"Exp. Direção",tPossuiCnpj:"Possui CNPJ",
  tCnpj:"CNPJ",tComprovante:"Comprovante",tEmissao:"Emissão",tFormaPgto:"Forma Pgto",
  tParcelas:"Parcelas",
  tDadosBancarios:"Dados Bancários",tDisponibilidade:"Disponibilidade",
  tEmerg1Nome:"Emerg 1 Nome",tEmerg1Tel:"Emerg 1 Tel",
  tEmerg2Nome:"Emerg 2 Nome",tEmerg2Tel:"Emerg 2 Tel",
  tProjetosSeteg:"Projetos Seteg",tOutrasInfo:"Outras Informações"
};

// ══════════════════════════════════════════════════════
//  TEMA CLARO / ESCURO
// ══════════════════════════════════════════════════════
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const slider = document.getElementById('themeSlider');
  if (!slider) return;
  if (theme === 'light') {
    slider.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  } else {
    slider.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('secter_theme', next);
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
async function init() {
  try {
    const sessao = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (sessao && sessao.nomeUsuario) {
      STATE.perfil = sessao.perfil;
      STATE.nomeUsuario = sessao.nomeUsuario;
      await mostrarApp();
      return;
    }
  } catch(e) {}
  mostrarLogin();
}

// ══════════════════════════════════════════════════════
//  MAPEAMENTO JS (camelCase) ↔ SUPABASE (snake_case)
// ══════════════════════════════════════════════════════
const _EXCL_CTR  = new Set(["cId","cStatus"]);
const _EXCL_AVAL = new Set(["avaliadoId"]);

// Mapeamentos especiais para siglas com múltiplas maiúsculas
const _TO_SNAKE_OVERRIDE   = { cObsGP: 'c_obs_gp' };
const _FROM_SNAKE_OVERRIDE = { c_obs_gp: 'cObsGP' };

function _toSnake(s){ return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }
function _toCamel(s){ return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }

function _ctrToRow(obj) {
  const row = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (_EXCL_CTR.has(k)) return;
    if (k === 'historico' || k === 'entregas') { row[k] = v; return; }
    const col = _TO_SNAKE_OVERRIDE[k] || _toSnake(k);
    row[col] = (v === "" || v === undefined) ? null : v;
  });
  return row;
}
function _rowToCtr(row) {
  const obj = {};
  Object.entries(row).forEach(([k, v]) => {
    if (k === 'historico' || k === 'entregas') { obj[k] = v || []; return; }
    const key = _FROM_SNAKE_OVERRIDE[k] || _toCamel(k);
    obj[key] = v ?? "";
  });
  obj.cId     = obj.id     || "";
  obj.cStatus = obj.status || "";
  return obj;
}

function _tercToRow(obj) {
  const row = { id: obj.tId };
  Object.entries(obj).forEach(([k, v]) => {
    if (k === 'tId') return;
    row[_toSnake(k)] = (v === "" || v === undefined) ? null : v;
  });
  return row;
}
function _rowToTerc(row) {
  const obj = { tId: row.id };
  Object.entries(row).forEach(([k, v]) => {
    if (k === 'id') return;
    obj[_toCamel(k)] = v ?? "";
  });
  return obj;
}

function _avalToRow(obj) {
  const row = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (_EXCL_AVAL.has(k)) return;
    row[_toSnake(k)] = (v === "" || v === undefined) ? null : v;
  });
  return row;
}
function _toGenericCamel(row) {
  const obj = {};
  Object.entries(row).forEach(([k, v]) => { obj[_toCamel(k)] = v ?? ""; });
  return obj;
}
function _audToRow(obj) {
  const row = {};
  Object.entries(obj).forEach(([k, v]) => {
    row[_toSnake(k)] = (v === "" || v === undefined) ? null : v;
  });
  return row;
}

// ══════════════════════════════════════════════════════
//  SUPABASE CRUD
// ══════════════════════════════════════════════════════
async function carregarDBSupabase() {
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      supa.from('contratos').select('*').order('criado_em', { ascending: false }),
      supa.from('terceirizados').select('*').order('criado_em', { ascending: false }),
      supa.from('avaliacoes').select('*').order('criado_em', { ascending: false }),
      supa.from('auditoria').select('*').order('data', { ascending: false }).limit(500),
    ]);
    DB.contratos     = (r1.data || []).map(_rowToCtr);
    DB.terceirizados = (r2.data || []).map(_rowToTerc);
    DB.avaliacoes    = (r3.data || []).map(_toGenericCamel);
    DB.auditoria     = (r4.data || []).map(_toGenericCamel);
  } catch(e) {
    mostrarToast("Erro ao carregar dados do servidor.", "err");
  }
}

function syncContrato(contrato) {
  supa.from('contratos').upsert(_ctrToRow(contrato), { onConflict: 'id' })
    .then(({ error }) => { if (error) mostrarToast("Aviso: falha ao sincronizar contrato.", "err"); });
}

function syncTerceirizado(terc) {
  supa.from('terceirizados').upsert(_tercToRow(terc), { onConflict: 'id' })
    .then(({ error }) => { if (error) mostrarToast("Aviso: falha ao sincronizar terceirizado.", "err"); });
}

function syncAvaliacao(aval) {
  supa.from('avaliacoes').upsert(_avalToRow(aval), { onConflict: 'id' })
    .then(({ error }) => { if (error) mostrarToast("Aviso: falha ao sincronizar avaliação.", "err"); });
}

function syncAuditoria(entry) {
  supa.from('auditoria').insert(_audToRow(entry))
    .then(({ error }) => { if (error) console.warn("syncAuditoria error:", error); });
}

function deleteSupabase(tabela, id) {
  supa.from(tabela).delete().eq('id', id)
    .then(({ error }) => { if (error) console.warn("deleteSupabase error:", error); });
}

// ══════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════
function mostrarLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("sidebar").classList.add("hidden");
  document.getElementById("inputCodigo").value = "";
  document.getElementById("loginErro").classList.add("hidden");
  setTimeout(() => document.getElementById("inputCodigo").focus(), 80);
}

async function mostrarApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("sidebar").classList.remove("hidden");
  mostrarToast("Carregando dados…", "ok");
  await carregarDBSupabase();
  registrarListeners();
  aplicarPermissoes();
  irParaSecao("dashboard");
  document.getElementById("dashData").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });
}

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function validarLogin() {
  const btnEntrar = document.getElementById("btnEntrar");
  const codigo    = document.getElementById("inputCodigo").value.trim();
  if (!codigo) return;
  btnEntrar.disabled = true;
  btnEntrar.textContent = "Verificando…";
  document.getElementById("loginErro").classList.add("hidden");
  document.getElementById("loginErroCon").classList.add("hidden");
  try {
    const hash = await _sha256(codigo);
    const TIMEOUT_MS = 12000;
    const timeoutPromise = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)
    );
    const queryPromise = supa
      .from('usuarios')
      .select('nome, perfil, iniciais, label, setor, gestor')
      .eq('codigo_hash', hash)
      .eq('ativo', true)
      .limit(1);
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    if (error || !data || data.length === 0) {
      document.getElementById("loginErro").classList.remove("hidden");
      document.getElementById("inputCodigo").select();
      return;
    }
    const usuario = data[0];
    STATE.perfil      = usuario.perfil;
    STATE.nomeUsuario = usuario.nome;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ perfil: usuario.perfil, nomeUsuario: usuario.nome }));
    await mostrarApp();
  } catch(e) {
    if (e.message === "timeout") {
      document.getElementById("loginErroCon").classList.remove("hidden");
    } else {
      document.getElementById("loginErro").classList.remove("hidden");
    }
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
  }
}

function sair() {
  sessionStorage.removeItem(SESSION_KEY);
  STATE.perfil = "solicitante";
  STATE.nomeUsuario = "";
  mostrarLogin();
}

function initLoginEvents() {
  const input     = document.getElementById("inputCodigo");
  const btnToggle = document.getElementById("btnToggleSenha");
  const olhoAberto  = document.getElementById("iconOlhoAberto");
  const olhoFechado = document.getElementById("iconOlhoFechado");
  document.getElementById("btnEntrar").addEventListener("click", validarLogin);
  input.addEventListener("keydown", e => { if (e.key === "Enter") validarLogin(); });
  btnToggle.addEventListener("click", () => {
    if (input.type === "password") {
      input.type = "text"; olhoAberto.style.display = "none"; olhoFechado.style.display = "";
    } else {
      input.type = "password"; olhoAberto.style.display = ""; olhoFechado.style.display = "none";
    }
  });
}

// ══════════════════════════════════════════════════════
//  LISTENERS
// ══════════════════════════════════════════════════════
let _listenersRegistered = false;
function registrarListeners() {
  if (_listenersRegistered) return;
  _listenersRegistered = true;

  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", () => irParaSecao(btn.dataset.secao));
  });
  document.getElementById("btnSair").addEventListener("click", sair);

  // ── Contratos ──
  document.getElementById("btnNovoContrato").addEventListener("click", abrirFormNovoContrato);
  document.getElementById("btnFecharContrato").addEventListener("click", fecharFormContrato);
  document.getElementById("btnSalvarContrato").addEventListener("click", salvarContrato);
  document.getElementById("btnLimparContrato").addEventListener("click", limparFormContrato);
  document.getElementById("btnImprimirContrato").addEventListener("click", imprimirContrato);
  document.getElementById("depTelefone").addEventListener("input",  () => mascaraTelId("depTelefone"));
  document.getElementById("depEmerg1Tel").addEventListener("input",  () => mascaraTelId("depEmerg1Tel"));
  document.getElementById("depEmerg2Tel").addEventListener("input",  () => mascaraTelId("depEmerg2Tel"));
  document.getElementById("auxTelefone").addEventListener("input",  () => mascaraTelId("auxTelefone"));
  document.getElementById("auxEmerg1Tel").addEventListener("input", () => mascaraTelId("auxEmerg1Tel"));
  document.getElementById("auxEmerg2Tel").addEventListener("input", () => mascaraTelId("auxEmerg2Tel"));
  document.querySelectorAll('input[name="auxPossuiCnh"]').forEach(r => r.addEventListener("change", () => {
    const grp = document.getElementById("grpAuxExpDirecao");
    if (grp) grp.style.display = r.value === "Sim" && r.checked ? "" : "none";
  }));
  document.querySelectorAll('input[name="depFormaPgto"]').forEach(r => r.addEventListener("change", () => toggleParcelasGrupo("depFormaPgto","grpDepParcelas")));
  document.querySelectorAll('input[name="auxFormaPgto"]').forEach(r => r.addEventListener("change", () => toggleParcelasGrupo("auxFormaPgto","grpAuxParcelas")));

  document.getElementById("pillsStatusC").querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("pillsStatusC").querySelectorAll(".filter-pill").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      STATE.filtros.contratos.status = btn.dataset.status;
      STATE.filtros.contratos.pagina = 1;
      renderContratos();
    });
  });
  document.getElementById("filtroEmpresaC").addEventListener("change", () => { STATE.filtros.contratos.empresa=document.getElementById("filtroEmpresaC").value; STATE.filtros.contratos.pagina=1; renderContratos(); });
  document.getElementById("filtroTipoC").addEventListener("change", () => { STATE.filtros.contratos.tipo=document.getElementById("filtroTipoC").value; STATE.filtros.contratos.pagina=1; renderContratos(); });
  document.getElementById("buscaC").addEventListener("input", () => { STATE.filtros.contratos.busca=document.getElementById("buscaC").value.toLowerCase(); STATE.filtros.contratos.pagina=1; renderContratos(); });
  document.getElementById("prevC").addEventListener("click", () => { STATE.filtros.contratos.pagina--; renderContratos(); });
  document.getElementById("nextC").addEventListener("click", () => { STATE.filtros.contratos.pagina++; renderContratos(); });
  document.getElementById("perPageC").addEventListener("change", () => { STATE.filtros.contratos.pagina=1; renderContratos(); });

  // ── Terceirizados ──
  document.getElementById("btnNovoTerc").addEventListener("click", abrirFormNovoTerc);
  document.getElementById("btnFecharTerc").addEventListener("click", fecharFormTerc);
  document.getElementById("btnSalvarTerc").addEventListener("click", salvarTerceirizado);
  document.getElementById("btnLimparTerc").addEventListener("click", limparFormTerc);
  document.getElementById("tPossuiCnpj").addEventListener("change", () => toggleCondicional("tPossuiCnpj","Sim","grpCnpjTerc"));
  document.getElementById("tFormaPgto").addEventListener("change", () => toggleCondicional("tFormaPgto","Parcelado","grpParcelasTerc"));
  document.getElementById("tCpf").addEventListener("input", () => mascaraCpfId("tCpf"));
  document.getElementById("tTelefone").addEventListener("input", () => mascaraTelId("tTelefone"));
  document.getElementById("filtroTipoT").addEventListener("change", () => { STATE.filtros.terceirizados.tipo=document.getElementById("filtroTipoT").value; STATE.filtros.terceirizados.pagina=1; renderTerceirizados(); });
  document.getElementById("buscaT").addEventListener("input", () => { STATE.filtros.terceirizados.busca=document.getElementById("buscaT").value.toLowerCase(); STATE.filtros.terceirizados.pagina=1; renderTerceirizados(); });
  document.getElementById("prevT").addEventListener("click", () => { STATE.filtros.terceirizados.pagina--; renderTerceirizados(); });
  document.getElementById("nextT").addEventListener("click", () => { STATE.filtros.terceirizados.pagina++; renderTerceirizados(); });

  // ── Avaliações ──
  document.getElementById("btnNovaAval").addEventListener("click", () => abrirFormAval(null));
  document.getElementById("btnFecharAval").addEventListener("click", fecharFormAval);
  document.getElementById("btnCancelarAval").addEventListener("click", fecharFormAval);
  document.getElementById("btnSalvarAval").addEventListener("click", salvarAvaliacao);

  // ── Modais ──
  document.getElementById("btnFecharDetalhes").addEventListener("click", () => fecharModal("modalDetalhes"));
  document.getElementById("btnFecharDetalhesOk").addEventListener("click", () => fecharModal("modalDetalhes"));
  document.getElementById("btnImprimirDetalhes").addEventListener("click", imprimirDetalhes);
  document.getElementById("btnAddObs").addEventListener("click", () => {
    const id = document.getElementById("modalDetalhes").dataset.currentId;
    if (id) abrirModalObs(id);
  });
  document.getElementById("btnFecharSelecionarTipo").addEventListener("click", () => fecharModal("modalSelecionarTipo"));
  document.getElementById("modalSelecionarTipo").addEventListener("click", e => { if (e.target === e.currentTarget) fecharModal("modalSelecionarTipo"); });
  document.querySelectorAll(".tipo-sel-card").forEach(btn => {
    btn.addEventListener("click", () => selecionarTipoContrato(btn.dataset.tipo));
  });
  document.getElementById("btnFecharObs").addEventListener("click", () => fecharModal("modalObs"));
  document.getElementById("btnCancelarObs").addEventListener("click", () => fecharModal("modalObs"));
  document.getElementById("btnSalvarObs").addEventListener("click", salvarObs);
  document.getElementById("btnFecharAnalise").addEventListener("click", () => fecharModal("modalAnalise"));
  document.getElementById("btnCancelarAnalise").addEventListener("click", () => fecharModal("modalAnalise"));
  document.getElementById("btnSalvarAnalise").addEventListener("click", salvarAnalise);
  document.getElementById("btnFecharExcluir").addEventListener("click", () => fecharModal("modalExcluir"));
  document.getElementById("btnCancelarExcluir").addEventListener("click", () => fecharModal("modalExcluir"));
  document.getElementById("btnConfirmarExcluir").addEventListener("click", confirmarExcluir);
  document.getElementById("btnFecharContratoDoc").addEventListener("click", fecharModalContratoDoc);
  document.getElementById("btnFecharContratoDocOk").addEventListener("click", fecharModalContratoDoc);
  document.getElementById("btnRegerarContratoDoc").addEventListener("click", regenerarContratoDoc);
  document.getElementById("btnExportarContratoPDF").addEventListener("click", exportarContratoPDF);
  document.getElementById("prevAval").addEventListener("click", () => { STATE.filtros.avaliacoes.pagina--; renderAvaliacoes(); });
  document.getElementById("nextAval").addEventListener("click", () => { STATE.filtros.avaliacoes.pagina++; renderAvaliacoes(); });
  document.getElementById("perPageAval").addEventListener("change", () => { STATE.filtros.avaliacoes.pagina=1; renderAvaliacoes(); });

  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => { if (e.target===m) m.classList.remove("active"); });
  });
  document.getElementById("btnFecharVerTerc").addEventListener("click", () => fecharModal("modalVerTerc"));
  document.getElementById("btnFecharVerTercOk").addEventListener("click", () => fecharModal("modalVerTerc"));

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
    const formTerc = document.getElementById("formTerc");
    if (formTerc && !formTerc.classList.contains("hidden")) fecharFormTerc();
  });
}

// ══════════════════════════════════════════════════════
//  PERMISSÕES
// ══════════════════════════════════════════════════════
function aplicarPermissoes() {
  const p = STATE.perfil;
  const label = p==="gestao" ? "Gestão" : p==="gestao-pessoas" ? "Gestão de Pessoas" : STATE.nomeUsuario;
  document.getElementById("perfilBadge").textContent = label;
  const initials = p==="gestao" ? "G" : p==="gestao-pessoas" ? "GP"
    : STATE.nomeUsuario.split(" ").filter(Boolean).map(w=>w[0]).join("").substring(0,2).toUpperCase();
  const av = document.getElementById("sidebarAvatar");
  if (av) av.textContent = initials;
  document.querySelectorAll(".perm-gp-gestao").forEach(el => el.classList.toggle("hidden", p==="solicitante"));
  document.querySelectorAll(".campo-interno").forEach(el => el.classList.toggle("hidden", p==="solicitante"));
  document.querySelectorAll(".campo-gestao").forEach(el => el.classList.toggle("hidden", p!=="gestao"));

  // Avaliações: visões diferentes por perfil
  const isGP = p !== "solicitante";
  const vG = document.getElementById("avalViewGestao");
  const vS = document.getElementById("avalViewSolicitante");
  if (vG) vG.classList.toggle("hidden", !isGP);
  if (vS) vS.classList.toggle("hidden", isGP);
}

function podeEditar(item) {
  if (STATE.perfil !== "solicitante") return true;
  // Líder pode editar somente os próprios contratos em "Em Fila" ou "Pendente" (retornado para ajuste)
  return item && item.criadoPor === STATE.nomeUsuario && ["Em Fila","Pendente"].includes(item.status);
}
function podeExcluir()  { return STATE.perfil === "gestao"; }
function podeAnalisar() { return STATE.perfil !== "solicitante"; }
function ehGestaoOuGP() { return STATE.perfil !== "solicitante"; }

function contratoAguardaAvaliacao(c) {
  if (!["Encerrado","Finalizado"].includes(c.status)) return false;
  if (STATE.perfil === "solicitante" && c.criadoPor !== STATE.nomeUsuario) return false;
  return !DB.avaliacoes.find(a => a.contratoId === c.id);
}

// ══════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ══════════════════════════════════════════════════════
function irParaSecao(secao) {
  STATE.secaoAtiva = secao;
  document.querySelectorAll(".secao").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".sidebar-btn").forEach(t => t.classList.remove("active"));
  const el = document.getElementById("secao-" + secao);
  if (el) el.classList.add("active");
  const tab = document.querySelector(`.sidebar-btn[data-secao="${secao}"]`);
  if (tab) tab.classList.add("active");
  switch(secao) {
    case "dashboard":     renderDashboard();     break;
    case "contratos":     renderContratos();     break;
    case "terceirizados": renderTerceirizados(); break;
    case "avaliacoes":    renderAvaliacoes();    break;
    case "alertas":       renderAlertas();       break;
  }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
function renderDashboard() {
  const meus = STATE.perfil === "solicitante"
    ? DB.contratos.filter(c => c.criadoPor === STATE.nomeUsuario)
    : DB.contratos;

  document.getElementById("kpiAtivos").textContent     = meus.filter(c=>!["Reprovado","Finalizado"].includes(c.status)).length;
  document.getElementById("kpiAprovados").textContent  = meus.filter(c=>c.status==="Aprovado").length;
  document.getElementById("kpiVencendo").textContent   = meus.filter(c=>{const d=diasAteVencer(c.cDataFim);return d!==null&&d>=0&&d<=30;}).length;
  document.getElementById("kpiPendencias").textContent = meus.filter(c=>["Em Fila","Pendente"].includes(c.status)).length;
  document.getElementById("kpiTercs").textContent      = DB.terceirizados.length;
  document.getElementById("kpiAvalPendentes").textContent = meus.filter(c=>contratoAguardaAvaliacao(c)).length;

  const totalAlertas = gerarAlertas().length;
  const badge = document.getElementById("badgeAlertas");
  badge.textContent = totalAlertas;
  badge.classList.toggle("hidden", totalAlertas===0);

  renderSolicitacoesRecentes(meus);
}

function renderSolicitacoesRecentes(lista) {
  const tbody = document.getElementById("dashTabelaRecentes");
  const empty = document.getElementById("emptyDashRecentes");
  if (!tbody) return;
  const sorted = [...lista].sort((a,b)=>{
    const da = a.atualizadoEm||a.criadoEm||"";
    const db = b.atualizadoEm||b.criadoEm||"";
    return db.localeCompare(da);
  }).slice(0,30);
  if (!sorted.length) {
    tbody.innerHTML="";
    empty.classList.add("visible");
    return;
  }
  empty.classList.remove("visible");
  tbody.innerHTML = sorted.map(c=>{
    const acoes = [`<button class="btn-icon" title="Visualizar" onclick="verDetalhesContrato('${c.id}')">👁</button>`];
    if (podeEditar(c)) acoes.push(`<button class="btn-icon btn-icon-orange" title="Editar" onclick="editarContrato('${c.id}')">✎</button>`);
    if (podeAnalisar()) acoes.push(`<button class="btn-icon btn-icon-green" title="Atualizar Status" onclick="abrirAnalise('${c.id}')">⚙</button>`);
    return `<tr>
      <td><span style="color:var(--blue-light);font-weight:700">${esc(c.id)}</span></td>
      <td>${esc(c.cTipoContratacao||"-")}</td>
      <td>${esc(c.criadoPor||"-")}</td>
      <td>${esc(c.cEmpresaContratante||"-")}</td>
      <td>${esc(c.cTercNome||c.cRazaoSocial||"-")}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="white-space:nowrap">${formatarData(c.criadoEm)}</td>
      <td style="white-space:nowrap">${c.atualizadoEm?formatarData(c.atualizadoEm):"-"}</td>
      <td><div class="table-actions">${acoes.join("")}</div></td>
    </tr>`;
  }).join("");
}

// ══════════════════════════════════════════════════════
//  CONTRATOS
// ══════════════════════════════════════════════════════
function abrirFormNovoContrato() {
  document.getElementById("modalSelecionarTipo").classList.add("active");
}

function selecionarTipoContrato(tipo) {
  document.getElementById("modalSelecionarTipo").classList.remove("active");
  limparFormContrato();
  document.getElementById("formContratoTitulo").textContent = "Novo Contrato";
  document.getElementById("listaContratos").classList.add("hidden");
  document.getElementById("formContrato").classList.remove("hidden");
  popularSelectTerceirizados();
  const sel = document.getElementById("cTipoContratacao");
  sel.value = tipo;
  atualizarSecaoTerceirizado();
  aplicarPermissoes();
  const primeiro = document.querySelector(
    tipo === "Despachante" ? "#depNome" : "#auxNome"
  );
  if (primeiro) setTimeout(() => primeiro.focus(), 80);
}

function fecharFormContrato() {
  document.getElementById("formContrato").classList.add("hidden");
  document.getElementById("listaContratos").classList.remove("hidden");
  renderContratos();
}

function limparFormContrato() {
  document.getElementById("contratoForm").reset();
  document.getElementById("cId").value = "";
  document.getElementById("cStatus").value = "Em Fila";
  document.getElementById("secaoRespostaPendencia").classList.add("hidden");
  const rp = document.getElementById("cRespostaPendencia");
  if (rp) rp.value = "";
  document.getElementById("secaoCTercDespachante").classList.add("hidden");
  document.getElementById("secaoCTercAuxiliar").classList.add("hidden");
  document.querySelectorAll('#secaoCTercDespachante input[type="radio"], #secaoCTercAuxiliar input[type="radio"]').forEach(r => r.checked = false);
  const grpExp = document.getElementById("grpAuxExpDirecao");
  if (grpExp) grpExp.style.display = "none";
  const grpDepParc = document.getElementById("grpDepParcelas");
  if (grpDepParc) grpDepParc.style.display = "none";
  const grpAuxParc = document.getElementById("grpAuxParcelas");
  if (grpAuxParc) grpAuxParc.style.display = "none";
}

function popularSelectTerceirizados() {
  const sel = document.getElementById("cTerceirizadoId");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Preencher manualmente abaixo —</option>';
  DB.terceirizados.forEach(t => { sel.innerHTML += `<option value="${t.tId}">${esc(t.tNome)} · ${t.tTipo||""}</option>`; });
}

function preencherTerceirizadoDoSelect() {
  const id = document.getElementById("cTerceirizadoId").value;
  if (!id) return;
  const t = DB.terceirizados.find(x=>x.tId===id);
  if (!t) return;
  const tipo = document.getElementById("cTipoContratacao").value;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el && val) el.value = val; };

  // Campos de identificação: sempre puxados para o bloco "Dados do Contrato"
  set("cTercCpf", t.tCpf);
  set("cTercRg", t.tRg);
  set("cTercEstadoCivil", t.tEstadoCivil);
  set("cTercEndereco", t.tEndereco);

  // Campos específicos do formulário do tipo selecionado — reaproveita os
  // preencherCampos* usados na edição de contrato para puxar TUDO que já
  // existe no cadastro do terceirizado, evitando redigitar o que já foi informado.
  if (tipo === "Despachante") {
    preencherCamposDespachante({
      cTercNome: t.tNome,
      cTercEmail: t.tEmail,
      cTercTelefone: t.tTelefone,
      cTercMunicipio: [t.tCidade, t.tEstado].filter(Boolean).join(" - "),
      cDadosPagamento: t.tDadosBancarios,
      cTercDisponibilidade: t.tDisponibilidade,
      cTercEmerg1Nome: t.tEmerg1Nome,
      cTercEmerg1Tel: t.tEmerg1Tel,
      cTercEmerg2Nome: t.tEmerg2Nome,
      cTercEmerg2Tel: t.tEmerg2Tel,
      cTercComprovante: t.tComprovante,
      cTercEmissao: t.tEmissao,
      cTercFormaPgto: t.tFormaPgto,
      cTercParcelas: t.tParcelas
    });
  } else if (tipo === "Prestador de serviço") {
    preencherCamposAuxiliar({
      cTercNome: t.tNome,
      cTercGraduacao: t.tGraduacao,
      cTercEmail: t.tEmail,
      cTercTelefone: t.tTelefone,
      cTercNascimento: t.tNascimento,
      cTercEndereco: t.tEndereco,
      cTercMunicipio: t.tCidade,
      cDadosPagamento: t.tDadosBancarios,
      cTercEmerg1Nome: t.tEmerg1Nome,
      cTercEmerg1Tel: t.tEmerg1Tel,
      cTercEmerg2Nome: t.tEmerg2Nome,
      cTercEmerg2Tel: t.tEmerg2Tel,
      cTercProjetosSeteg: t.tProjetosSeteg,
      cTercAreaExpertise: t.tAreaExpertise,
      cTercComprovante: t.tComprovante,
      cTercEmissao: t.tEmissao,
      cTercFormaPgto: t.tFormaPgto,
      cTercParcelas: t.tParcelas,
      cTercCnh: t.tCnh ? ("Sim" + (t.tExpDirecao ? " – " + t.tExpDirecao : "")) : "Não"
    });
  }
  mostrarToast("Dados de " + t.tNome + " preenchidos automaticamente.", "ok");
}

function atualizarSecaoTerceirizado() {
  const tipo = document.getElementById("cTipoContratacao").value;
  document.getElementById("secaoCTercDespachante").classList.toggle("hidden", tipo !== "Despachante");
  document.getElementById("secaoCTercAuxiliar").classList.toggle("hidden", tipo !== "Prestador de serviço");
}

function lerCamposDespachante(item) {
  const v = id => (document.getElementById(id)?.value||"").trim();
  item.cTercNome            = v("depNome");
  item.cTercEmail           = v("depEmail");
  item.cTercTelefone        = v("depTelefone");
  item.cTercMunicipio       = v("depMunicipioEstado");
  item.cTercEstado          = "";
  item.cTercFuncao          = "Despachante";
  item.cDadosPagamento      = v("depDadosBancarios");
  item.cTercDisponibilidade = v("depDisponibilidade");
  item.cTercEmerg1Nome      = v("depEmerg1Nome");
  item.cTercEmerg1Tel       = v("depEmerg1Tel");
  item.cTercEmerg2Nome      = v("depEmerg2Nome");
  item.cTercEmerg2Tel       = v("depEmerg2Tel");
  item.cTercComprovante     = document.querySelector('input[name="depComprovante"]:checked')?.value || "";
  item.cTercEmissao         = document.querySelector('input[name="depEmissao"]:checked')?.value    || "";
  item.cTercFormaPgto       = document.querySelector('input[name="depFormaPgto"]:checked')?.value  || "";
  item.cTercParcelas       = item.cTercFormaPgto === "Parcelado" ? v("depParcelas") : "";
}

function preencherCamposDespachante(item) {
  const s = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||""; };
  s("depNome",            item.cTercNome);
  s("depEmail",           item.cTercEmail);
  s("depTelefone",        item.cTercTelefone);
  s("depMunicipioEstado", item.cTercMunicipio);
  s("depDadosBancarios",  item.cDadosPagamento);
  s("depDisponibilidade", item.cTercDisponibilidade);
  s("depEmerg1Nome",      item.cTercEmerg1Nome);
  s("depEmerg1Tel",       item.cTercEmerg1Tel);
  s("depEmerg2Nome",      item.cTercEmerg2Nome);
  s("depEmerg2Tel",       item.cTercEmerg2Tel);
  const chk = (name, val) => {
    if (!val) return;
    const r = document.querySelector(`input[name="${name}"][value="${val}"]`);
    if (r) r.checked = true;
  };
  chk("depComprovante", item.cTercComprovante);
  chk("depEmissao",     item.cTercEmissao);
  chk("depFormaPgto",   item.cTercFormaPgto);
  s("depParcelas", item.cTercParcelas);
  toggleParcelasGrupo("depFormaPgto","grpDepParcelas");
}

function lerCamposAuxiliar(item) {
  const v = id => (document.getElementById(id)?.value||"").trim();
  item.cTercNome          = v("auxNome");
  item.cTercGraduacao     = v("auxGraduacao");
  item.cTercEmail         = v("auxEmail");
  item.cTercTelefone      = v("auxTelefone");
  item.cTercNascimento    = v("auxNascimento");
  item.cTercEndereco      = v("auxEndereco") || v("cTercEndereco");
  item.cTercMunicipio     = v("auxCidade");
  item.cTercEstado        = "";
  item.cTercFuncao        = "Prestador de serviço";
  item.cDadosPagamento    = v("auxDadosBancarios");
  item.cTercEmerg1Nome    = v("auxEmerg1Nome");
  item.cTercEmerg1Tel     = v("auxEmerg1Tel");
  item.cTercEmerg2Nome    = v("auxEmerg2Nome");
  item.cTercEmerg2Tel     = v("auxEmerg2Tel");
  item.cTercProjetosSeteg = v("auxProjetosSeteg");
  item.cTercAreaExpertise = document.querySelector('input[name="auxAreaAfinidade"]:checked')?.value || "";
  item.cTercComprovante   = document.querySelector('input[name="auxComprovante"]:checked')?.value  || "";
  item.cTercEmissao       = document.querySelector('input[name="auxEmissao"]:checked')?.value      || "";
  item.cTercFormaPgto     = document.querySelector('input[name="auxFormaPgto"]:checked')?.value    || "";
  item.cTercParcelas      = item.cTercFormaPgto === "Parcelado" ? v("auxParcelas") : "";
  const cnh = document.querySelector('input[name="auxPossuiCnh"]:checked')?.value || "";
  const exp = v("auxExpDirecao");
  item.cTercCnh = cnh === "Sim" ? (exp ? "Sim – " + exp : "Sim") : (cnh || "");
}

function preencherCamposAuxiliar(item) {
  const s = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||""; };
  s("auxNome",           item.cTercNome);
  s("auxGraduacao",      item.cTercGraduacao);
  s("auxEmail",          item.cTercEmail);
  s("auxTelefone",       item.cTercTelefone);
  s("auxNascimento",     item.cTercNascimento);
  s("auxEndereco",       item.cTercEndereco);
  s("auxCidade",         item.cTercMunicipio);
  s("auxDadosBancarios", item.cDadosPagamento);
  s("auxEmerg1Nome",     item.cTercEmerg1Nome);
  s("auxEmerg1Tel",      item.cTercEmerg1Tel);
  s("auxEmerg2Nome",     item.cTercEmerg2Nome);
  s("auxEmerg2Tel",      item.cTercEmerg2Tel);
  s("auxProjetosSeteg",  item.cTercProjetosSeteg);
  const chk = (name, val) => {
    if (!val) return;
    const r = document.querySelector(`input[name="${name}"][value="${val}"]`);
    if (r) r.checked = true;
  };
  chk("auxAreaAfinidade", item.cTercAreaExpertise);
  chk("auxComprovante",   item.cTercComprovante);
  chk("auxEmissao",       item.cTercEmissao);
  chk("auxFormaPgto",     item.cTercFormaPgto);
  s("auxParcelas", item.cTercParcelas);
  toggleParcelasGrupo("auxFormaPgto","grpAuxParcelas");
  if (item.cTercCnh) {
    const hasCnh = item.cTercCnh.startsWith("Sim");
    chk("auxPossuiCnh", hasCnh ? "Sim" : "Não");
    const grp = document.getElementById("grpAuxExpDirecao");
    if (hasCnh) {
      if (grp) grp.style.display = "";
      if (item.cTercCnh.includes("–")) s("auxExpDirecao", item.cTercCnh.split("–")[1]?.trim());
    }
  }
}

function salvarContrato() {
  const item = coletarCampos(CAMPOS_CONTRATO);
  if      (item.cTipoContratacao === "Despachante")     lerCamposDespachante(item);
  else if (item.cTipoContratacao === "Prestador de serviço") lerCamposAuxiliar(item);
  item.id = item.cId || gerarId("CTR");
  // Solicitante sempre submete como "Em Fila" (aguarda aprovação da Gestão)
  item.status = STATE.perfil === "solicitante" ? "Em Fila" : (item.cStatus || "Em Fila");
  const err = validarContrato(item);
  if (err) { mostrarToast(err,"err"); return; }
  const idx = DB.contratos.findIndex(c=>c.id===item.id);
  if (idx >= 0) {
    const ant = DB.contratos[idx].status;
    const eraPendente = ant === "Pendente" && STATE.perfil === "solicitante";
    DB.contratos[idx] = { ...DB.contratos[idx], ...item, atualizadoEm:new Date().toISOString(), atualizadoPor:STATE.nomeUsuario };

    if (eraPendente) {
      // Líder respondendo à pendência: registra resposta e volta a Em Fila
      const resposta = (document.getElementById("cRespostaPendencia")?.value||"").trim()
        || "Contrato reenviado após ajuste pelo líder.";
      DB.contratos[idx].historico = [...(DB.contratos[idx].historico||[]), {
        data: new Date().toISOString(),
        usuario: STATE.nomeUsuario,
        perfil: STATE.perfil,
        status: "Em Fila",
        obs: resposta
      }];
      registrarAuditoria("Resposta à Pendência","Contratos",item.id,ant,"Em Fila",resposta);
      mostrarToast("Contrato reenviado para análise.","ok");
    } else {
      registrarAuditoria("Edição","Contratos",item.id,ant,item.status,`Contrato de ${item.cTercNome||"-"}`);
      mostrarToast("Contrato atualizado.","ok");
    }
    syncContrato(DB.contratos[idx]);
  } else {
    item.criadoEm  = new Date().toISOString();
    item.criadoPor = STATE.nomeUsuario;
    item.historico = [{ data:new Date().toISOString(), usuario:STATE.nomeUsuario, perfil:STATE.perfil, status:item.status, obs:"Contrato criado e enviado para análise." }];
    DB.contratos.unshift(item);
    registrarAuditoria("Criação","Contratos",item.id,"",item.status,`Contrato de ${item.cTercNome||"-"}`);
    syncContrato(item);
    mostrarToast("Contrato enviado para análise.","ok");
  }
  fecharFormContrato();
}

function validarContrato(item) {
  if (!item.cTipoContratacao) return "Tipo de contratação não selecionado.";
  if (!item.cTercNome)        return "Informe o nome completo (Q1).";
  if (!item.cTercEmissao)     return "Informe se haverá emissão de nota fiscal ou recibo.";
  if (!item.cTercFormaPgto)   return "Informe a forma de pagamento.";
  if (item.cTercFormaPgto === "Parcelado" && !item.cTercParcelas) return "Informe o número de parcelas.";
  return null;
}

function editarContrato(id) {
  const item = DB.contratos.find(c=>c.id===id);
  if (!item) return;
  if (!podeEditar(item)) { mostrarToast("Sem permissão para editar.","err"); return; }
  limparFormContrato();
  document.getElementById("formContratoTitulo").textContent = "Editar Contrato · " + item.id;
  popularSelectTerceirizados();
  CAMPOS_CONTRATO.forEach(campo => {
    const el = document.getElementById(campo);
    if (!el) return;
    const chave = campo==="cId"?"id":campo==="cStatus"?"status":campo;
    el.value = item[chave]!==undefined ? item[chave] : (item[campo]||"");
  });
  document.getElementById("cId").value    = item.id;
  document.getElementById("cStatus").value = item.status;
  atualizarSecaoTerceirizado();
  if      (item.cTipoContratacao === "Despachante")       preencherCamposDespachante(item);
  else if (item.cTipoContratacao === "Prestador de serviço") preencherCamposAuxiliar(item);
  // Mostra seção de resposta à pendência para líder que está respondendo
  const mostraPendencia = item.status === "Pendente" && STATE.perfil === "solicitante";
  document.getElementById("secaoRespostaPendencia").classList.toggle("hidden", !mostraPendencia);
  if (mostraPendencia) {
    const rp = document.getElementById("cRespostaPendencia");
    if (rp) rp.value = "";
  }

  document.getElementById("listaContratos").classList.add("hidden");
  document.getElementById("formContrato").classList.remove("hidden");
  aplicarPermissoes();
}

function abrirAnalise(id) {
  if (!podeAnalisar()) { mostrarToast("Sem permissão.","err"); return; }
  const item = DB.contratos.find(c=>c.id===id);
  if (!item) return;
  document.getElementById("analiseId").value = id;
  document.getElementById("analiseStatusVal").value = "";
  document.getElementById("analiseObs").value = "";

  const btns = STATUS_BTNS[STATE.perfil] || [];
  const group = document.getElementById("statusBtnGroup");
  group.innerHTML = btns.map(b =>
    `<button type="button" class="btn-status ${b.cls}" data-status="${b.status}">
       <span class="btn-status-icon">${b.icon}</span>${b.label}
     </button>`
  ).join("");

  group.querySelectorAll(".btn-status").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".btn-status").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("analiseStatusVal").value = btn.dataset.status;
    });
  });

  abrirModal("modalAnalise");
}

function salvarAnalise() {
  const id  = document.getElementById("analiseId").value;
  const obs = document.getElementById("analiseObs").value.trim();
  let novoStatus = document.getElementById("analiseStatusVal").value;
  if (!id) return;

  // Obs sem decisão explícita → entra como Pendente
  if (!novoStatus && obs) novoStatus = "Pendente";
  if (!novoStatus) { mostrarToast("Selecione uma decisão ou adicione uma observação.","err"); return; }

  let contratoAtualizado;
  DB.contratos = DB.contratos.map(c => {
    if (c.id !== id) return c;
    const ant = c.status;
    const historico = [...(c.historico||[]), {
      data: new Date().toISOString(),
      usuario: STATE.nomeUsuario,
      perfil: STATE.perfil,
      status: novoStatus,
      obs: obs || `Decisão: ${novoStatus}.`
    }];
    registrarAuditoria("Mudança de Status","Contratos",id,ant,novoStatus,obs||"");
    contratoAtualizado = {...c, status:novoStatus, historico, atualizadoEm:new Date().toISOString(), atualizadoPor:STATE.nomeUsuario};
    return contratoAtualizado;
  });
  if (contratoAtualizado) syncContrato(contratoAtualizado);
  fecharModal("modalAnalise");
  renderContratos();
  mostrarToast(`Status: ${novoStatus}.`,"ok");
}

function abrirModalObs(id) {
  document.getElementById("obsContratoId").value = id;
  document.getElementById("obsTexto").value = "";
  fecharModal("modalDetalhes");
  abrirModal("modalObs");
}

function salvarObs() {
  const id    = document.getElementById("obsContratoId").value;
  const texto = document.getElementById("obsTexto").value.trim();
  if (!texto) { mostrarToast("Digite uma observação.","err"); return; }
  const idx = DB.contratos.findIndex(c=>c.id===id);
  if (idx<0) return;
  const c = DB.contratos[idx];
  const historico = [...(c.historico||[]),{
    data: new Date().toISOString(),
    usuario: STATE.nomeUsuario,
    perfil: STATE.perfil,
    status: c.status,
    obs: texto
  }];
  DB.contratos[idx] = {...c, historico, atualizadoEm:new Date().toISOString(), atualizadoPor:STATE.nomeUsuario};
  syncContrato(DB.contratos[idx]);
  registrarAuditoria("Observação","Contratos",id,c.status,c.status,texto);
  fecharModal("modalObs");
  mostrarToast("Observação registrada.","ok");
  verDetalhesContrato(id);
}

function verDetalhesContrato(id) {
  const item = DB.contratos.find(c=>c.id===id);
  if (!item) return;
  document.getElementById("modalDetalhesTitulo").textContent = "Contrato · " + item.id;
  document.getElementById("modalDetalhesBody").innerHTML = gerarHTMLDetalhes(item);
  document.getElementById("modalDetalhes").dataset.currentId = id;
  const btnObs = document.getElementById("btnAddObs");
  if (btnObs) btnObs.classList.toggle("hidden", STATE.perfil === "solicitante");
  abrirModal("modalDetalhes");
}

function gerarHTMLDetalhes(item) {
  const hist = item.historico||[];
  const histHTML = hist.length
    ? `<div class="historico-lista">${hist.map(h=>`<div class="historico-item"><small>${formatarDataHora(h.data)} · ${esc(h.usuario||"-")}</small><strong>${esc(h.status)}</strong><p>${esc(h.obs||"-")}</p></div>`).join("")}</div>`
    : "<em style='color:var(--text-muted)'>Sem histórico.</em>";
  const entregasHTML = (item.entregas||[]).length
    ? `<table style="width:100%;border-collapse:collapse;font-size:.76rem"><thead><tr style="background:rgba(10,36,89,.5)"><th style="padding:.3rem .5rem;color:var(--text-secondary);font-size:.62rem;text-transform:uppercase">Entrega</th><th>Marco</th><th>Data</th><th>Valor</th><th>Pgto</th></tr></thead><tbody>${(item.entregas||[]).map(e=>`<tr style="border-bottom:1px solid var(--border-color)"><td style="padding:.3rem .5rem">${esc(e.entrega||"-")}</td><td style="padding:.3rem .5rem">${esc(e.marco||"-")}</td><td style="padding:.3rem .5rem">${formatarData(e.data)}</td><td style="padding:.3rem .5rem;color:var(--green)">${formatarMoeda(e.valor)}</td><td style="padding:.3rem .5rem">${esc(e.formaPagamento||"-")}</td></tr>`).join("")}</tbody></table>`
    : "<em style='color:var(--text-muted)'>Nenhuma entrega cadastrada.</em>";

  const aval = DB.avaliacoes.find(a=>a.contratoId===item.id);
  let avalHTML = "";
  if (aval) {
    avalHTML = ehGestaoOuGP()
      ? `<div class="detail-section-title">Avaliação do Prestador</div>
         <div class="detail-item full"><span>Avaliador</span><strong>${esc(aval.avaliador)} · ${formatarData(aval.criadoEm)}</strong></div>
         <div class="detail-item"><span>Campo</span><strong>${esc(aval.nivelCampo||"-")}</strong></div>
         <div class="detail-item"><span>Relatório</span><strong>${esc(aval.nivelRelatorio||"-")}</strong></div>
         <div class="detail-item"><span>Prazo</span><strong>${esc(aval.prazo||"-")}</strong></div>
         <div class="detail-item"><span>Relacionamento</span><strong>${esc(aval.relacionamento||"-")}</strong></div>
         ${aval.motivo?`<div class="detail-item full"><span>Observações</span><strong>${esc(aval.motivo)}</strong></div>`:""}
         ${aval.obs?`<div class="detail-item full"><span>Comentário geral</span><strong>${esc(aval.obs)}</strong></div>`:""}`
      : `<div class="detail-section-title">Avaliação</div>
         <div class="detail-item full"><span>Situação</span><strong><span class="status-badge st-aprovado">✓ Avaliado em ${formatarData(aval.criadoEm)}</span></strong></div>`;
  } else if (item.status==="Encerrado") {
    avalHTML = `<div class="detail-section-title">Avaliação</div>
      <div class="detail-item full"><span>Situação</span><strong><span class="status-badge st-pendente">Aguardando avaliação do líder responsável</span></strong></div>`;
  }

  return `<div class="detail-grid">
    <div class="detail-section-title">Identificação</div>
    ${det("Nº",item.id)}${det("Status",statusBadge(item.status))}${det("Criado em",formatarDataHora(item.criadoEm))}${det("Por",item.criadoPor)}
    <div class="detail-section-title">A · Empresa</div>
    ${det("Razão Social",item.cRazaoSocial)}${det("CNPJ",item.cCnpjEmpresa)}${det("Contratante",item.cEmpresaContratante)}${det("Tipo",item.cTipoContratacao)}
    <div class="detail-section-title">B · Contrato</div>
    ${det("Nº Contrato",item.cNumeroContrato)}${det("Projeto",item.cProjeto)}${det("Objeto",item.cObjeto)}${det("Início",formatarData(item.cDataInicio))}${det("Término",formatarData(item.cDataFim))}${det("Valor Total",item.cValorTotal?formatarMoeda(item.cValorTotal):"-")}
    ${det("Escopo",item.cEscopo,"full")}
    <div class="detail-section-title">C · Terceirizado / Prestador</div>
    ${det("Nome",item.cTercNome)}${det("E-mail",item.cTercEmail)}${det("CPF",item.cTercCpf)}${det("Estado Civil",item.cTercEstadoCivil)}${det("Endereço",item.cTercEndereco)}${det("Função",item.cTercFuncao)}
    ${det("Telefone",item.cTercTelefone)}${det("Área",item.cTercAreaExpertise)}${det("Emissão",item.cTercEmissao)}${det("Forma Pgto",item.cTercFormaPgto)}
    ${item.cTercFormaPgto==="Parcelado"?det("Parcelas",item.cTercParcelas):""}
    ${det("Dados Bancários / Pix",item.cDadosPagamento,"full")}
    <div class="detail-section-title">D · Entregas</div>
    <div class="detail-item full"><span>Tabela</span><strong>${entregasHTML}</strong></div>
    <div class="detail-section-title">E · Responsável Interno</div>
    ${det("Nome",item.cRespNome)}${det("Setor",item.cRespSetor)}${det("Diretoria",item.cRespDiretoria)}
    ${item.cObsGP?`<div class="detail-section-title">Obs. DP/RH</div>${det("",item.cObsGP,"full")}`:""}
    ${item.cObsGestao?`<div class="detail-section-title">Obs. Gestão</div>${det("",item.cObsGestao,"full")}`:""}
    ${avalHTML}
    <div class="detail-section-title">Histórico</div>
    <div class="detail-item full"><span>Linha do Tempo</span><strong>${histHTML}</strong></div>
  </div>`;
}

function det(label, valor, extra) {
  return `<div class="detail-item ${extra||""}"><span>${label}</span><strong>${valor||"-"}</strong></div>`;
}

function verDetalhesAvaliacao(id) {
  const item = DB.avaliacoes.find(a=>a.id===id);
  if (!item) return;
  document.getElementById("modalDetalhesTitulo").textContent = "Avaliação · " + item.id;
  document.getElementById("modalDetalhesBody").innerHTML = gerarHTMLDetalhesAvaliacao(item);
  document.getElementById("modalDetalhes").dataset.currentId = id;
  const btnObs = document.getElementById("btnAddObs");
  if (btnObs) btnObs.classList.add("hidden");
  abrirModal("modalDetalhes");
}

function gerarHTMLDetalhesAvaliacao(item) {
  return `<div class="detail-grid">
    <div class="detail-section-title">Identificação</div>
    ${det("Nº",item.id)}${det("Criado em",formatarDataHora(item.criadoEm))}${det("Avaliador",item.avaliador)}${det("Avaliado",item.avaliado)}
    ${item.contratoId?det("Contrato",item.contratoId):""}
    <div class="detail-section-title">Cliente / Projeto</div>
    ${det("Cliente",item.cliente)}${det("Projeto",item.projeto)}
    <div class="detail-section-title">Avaliação Técnica</div>
    ${det("Nível técnico em campo",item.nivelCampo)}${det("Nível técnico do relatório",item.nivelRelatorio)}
    ${det("Prazo cumprido",item.prazo)}${det("Relacionamento com a Seteg",item.relacionamento)}
    ${item.motivo?`<div class="detail-section-title">Atrasos</div>${det("Motivo/Situação",item.motivo,"full")}`:""}
    ${item.obs?`<div class="detail-section-title">Observações</div>${det("",item.obs,"full")}`:""}
  </div>`;
}

function excluirContrato(id) {
  if (!podeExcluir()) { mostrarToast("Apenas Gestão pode excluir contratos.","err"); return; }
  document.getElementById("excluirId").value  = id;
  document.getElementById("excluirTipo").value = "contrato";
  abrirModal("modalExcluir");
}

function confirmarExcluir() {
  const id   = document.getElementById("excluirId").value;
  const tipo = document.getElementById("excluirTipo").value;
  fecharModal("modalExcluir");
  if (tipo==="contrato") {
    DB.contratos  = DB.contratos.filter(c=>c.id!==id);
    DB.avaliacoes = DB.avaliacoes.filter(a=>a.contratoId!==id);
    registrarAuditoria("Exclusão","Contratos",id,"","","Excluído.");
    deleteSupabase('contratos', id);
    mostrarToast("Contrato excluído.","ok"); renderContratos();
  } else if (tipo==="terceirizado") {
    DB.terceirizados = DB.terceirizados.filter(t=>t.tId!==id);
    registrarAuditoria("Exclusão","Terceirizados",id,"","","Excluído.");
    deleteSupabase('terceirizados', id);
    mostrarToast("Terceirizado excluído.","ok"); renderTerceirizados();
  } else if (tipo==="avaliacao") {
    DB.avaliacoes = DB.avaliacoes.filter(a=>a.id!==id);
    deleteSupabase('avaliacoes', id);
    mostrarToast("Avaliação excluída.","ok"); renderAvaliacoes();
  }
}

function renderContratos() {
  const f = STATE.filtros.contratos;
  let lista = DB.contratos.filter(c => {
    if (STATE.perfil==="solicitante" && c.criadoPor!==STATE.nomeUsuario) return false;
    const txt = `${c.id} ${c.cRazaoSocial} ${c.cNomeFantasia} ${c.cTercNome} ${c.cRespNome} ${c.cProjeto}`.toLowerCase();
    return (!f.status||c.status===f.status)&&(!f.empresa||c.cEmpresaContratante===f.empresa)&&(!f.tipo||c.cTipoContratacao===f.tipo)&&(!f.busca||txt.includes(f.busca));
  });
  const porPagina = Number(document.getElementById("perPageC").value);
  const totalPag  = Math.max(1,Math.ceil(lista.length/porPagina));
  if (f.pagina>totalPag) f.pagina=totalPag;
  const ini   = (f.pagina-1)*porPagina;
  const fatia = lista.slice(ini,ini+porPagina);
  const tbody = document.getElementById("tabelaContratos");
  const empty = document.getElementById("emptyContratos");
  tbody.innerHTML="";
  fatia.forEach(c=>{
    const dias   = diasAteVencer(c.cDataFim);
    const alerta = dias!==null&&dias<=30?`<span title="Vence em ${dias}d" style="color:var(--red);margin-left:.3rem">⚠</span>`:"";
    const aval   = DB.avaliacoes.find(a=>a.contratoId===c.id);
    const podaAvaliar = ["Encerrado","Finalizado"].includes(c.status) && !aval && (ehGestaoOuGP() || c.criadoPor===STATE.nomeUsuario);
    const avalBtn = aval
      ? `<span class="status-badge st-aprovado" title="Avaliado em ${formatarData(aval.criadoEm)}" style="font-size:.62rem">✓ Avaliado</span>`
      : (podaAvaliar ? `<button class="btn-icon btn-icon-teal" title="Avaliar prestador" onclick="abrirFormAvalPorContrato('${c.id}')">⭐</button>` : "");
    tbody.innerHTML+=`<tr>
      <td><span style="color:var(--blue-light);font-weight:700">${esc(c.id)}</span></td>
      <td>${esc(c.cRazaoSocial||c.cNomeFantasia||"-")}</td>
      <td>${esc(c.cTercNome||"-")}</td>
      <td>${esc(c.cTipoContratacao||"-")}</td>
      <td>${esc(c.cEmpresaContratante||"-")}</td>
      <td>${formatarData(c.cDataInicio)}</td>
      <td>${formatarData(c.cDataFim)}${alerta}</td>
      <td style="color:var(--green)">${c.cValorTotal?formatarMoeda(c.cValorTotal):"-"}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="col-acoes"><div class="table-actions">
        <button class="btn-icon" title="Visualizar" onclick="verDetalhesContrato('${c.id}')">👁</button>
        ${["Aprovado","Finalizado"].includes(c.status)
          ? (c.cContratoHtml
            ? `<button class="btn-icon btn-icon-green" title="Ver / Baixar Contrato Gerado" onclick="abrirGerarContrato('${c.id}')">📄</button>`
            : `<button class="btn-icon btn-icon-teal" title="Gerar Contrato" onclick="abrirGerarContrato('${c.id}')">📄</button>`)
          : ""}
        ${podeEditar(c)?`<button class="btn-icon btn-icon-orange" title="Editar" onclick="editarContrato('${c.id}')">✎</button>`:""}
        ${podeAnalisar()?`<button class="btn-icon btn-icon-green" title="Atualizar Status" onclick="abrirAnalise('${c.id}')">⚙</button>`:""}
        ${ehGestaoOuGP()?`<button class="btn-icon" title="Adicionar Observação" onclick="abrirModalObs('${c.id}')" style="font-size:.7rem">💬</button>`:""}
        ${avalBtn}
        ${podeExcluir()?`<button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirContrato('${c.id}')">✕</button>`:""}
      </div></td>
    </tr>`;
  });
  empty.classList.toggle("visible",lista.length===0);
  document.getElementById("infoC").textContent = lista.length?`${ini+1}–${Math.min(ini+porPagina,lista.length)} de ${lista.length}`:"0 registros";
  document.getElementById("pageC").textContent = f.pagina;
  document.getElementById("prevC").disabled = f.pagina<=1;
  document.getElementById("nextC").disabled = f.pagina>=totalPag;
}

function imprimirContrato() {
  const item = coletarCampos(CAMPOS_CONTRATO);
  item.id = item.cId||"Novo";
  if      (item.cTipoContratacao === "Despachante")       lerCamposDespachante(item);
  else if (item.cTipoContratacao === "Prestador de serviço") lerCamposAuxiliar(item);
  gerarPrintArea(item); window.print();
}
function imprimirDetalhes() {
  const id = document.getElementById("modalDetalhes").dataset.currentId;
  const item = DB.contratos.find(c=>c.id===id);
  if (item) { gerarPrintArea(item); window.print(); }
}

function gerarPrintArea(item) {
  document.getElementById("printArea").innerHTML=`
    <div class="pc">
      <div class="ptitle">Formulário de Contratação de Terceirizado / Prestador de Serviço</div>
      <div class="psub">Seteg – Soluções Geológicas e Ambientais &nbsp;|&nbsp; Nº: ${item.id||"Novo"} &nbsp;|&nbsp; ${new Date().toLocaleDateString("pt-BR")}</div>
      <div class="ps"><div class="psh">A · Empresa Contratada</div><div class="pg">
        <div class="pf"><div class="pfl">Razão Social</div><div class="pfv">${esc(item.cRazaoSocial||"-")}</div></div>
        <div class="pf"><div class="pfl">CNPJ</div><div class="pfv">${esc(item.cCnpjEmpresa||"-")}</div></div>
        <div class="pf"><div class="pfl">Empresa Contratante</div><div class="pfv">${esc(item.cEmpresaContratante||"-")}</div></div>
        <div class="pf"><div class="pfl">Tipo</div><div class="pfv">${esc(item.cTipoContratacao||"-")}</div></div>
      </div></div>
      <div class="ps"><div class="psh">B · Dados do Contrato</div><div class="pg">
        <div class="pf"><div class="pfl">Objeto</div><div class="pfv">${esc(item.cObjeto||"-")}</div></div>
        <div class="pf"><div class="pfl">Início</div><div class="pfv">${formatarData(item.cDataInicio)}</div></div>
        <div class="pf"><div class="pfl">Término</div><div class="pfv">${formatarData(item.cDataFim)}</div></div>
        <div class="pf"><div class="pfl">Valor Total</div><div class="pfv">${item.cValorTotal?formatarMoeda(item.cValorTotal):"-"}</div></div>
        <div class="pf pfw"><div class="pfl">Escopo</div><div class="pfv">${esc(item.cEscopo||"-")}</div></div>
      </div></div>
      <div class="ps"><div class="psh">C · Terceirizado / Prestador</div><div class="pg">
        <div class="pf"><div class="pfl">Nome</div><div class="pfv">${esc(item.cTercNome||"-")}</div></div>
        <div class="pf"><div class="pfl">Função</div><div class="pfv">${esc(item.cTercFuncao||"-")}</div></div>
        <div class="pf"><div class="pfl">Emissão de</div><div class="pfv">${esc(item.cTercEmissao||"-")}</div></div>
        <div class="pf"><div class="pfl">Forma de Pagamento</div><div class="pfv">${esc(item.cTercFormaPgto||"-")}${item.cTercFormaPgto==="Parcelado"&&item.cTercParcelas?` (${esc(item.cTercParcelas)}x)`:""}</div></div>
        <div class="pf pfw"><div class="pfl">Dados Bancários / Pix</div><div class="pfv">${esc(item.cDadosPagamento||"-")}</div></div>
      </div></div>
      <div class="ps"><div class="psh">E · Responsável Interno</div><div class="pg">
        <div class="pf"><div class="pfl">Nome</div><div class="pfv">${esc(item.cRespNome||"-")}</div></div>
        <div class="pf"><div class="pfl">Setor</div><div class="pfv">${esc(item.cRespSetor||"-")}</div></div>
        <div class="pf"><div class="pfl">Diretoria</div><div class="pfv">${esc(item.cRespDiretoria||"-")}</div></div>
      </div></div>
      <div class="passinaturas" style="grid-template-columns:1fr 1fr 1fr">
        <div class="passina"><div class="passina-linha"></div><div>${esc(item.cRespNome||"Responsável")}</div><div class="passina-cargo">Responsável pela Contratação</div></div>
        <div class="passina"><div class="passina-linha"></div><div>Gestão de Pessoas / DP</div><div class="passina-cargo">Análise e Validação</div></div>
        <div class="passina"><div class="passina-linha"></div><div>Gestão</div><div class="passina-cargo">Aprovação</div></div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  GERAÇÃO DO CONTRATO DE PRESTAÇÃO DE SERVIÇOS (modelo Seteg)
// ══════════════════════════════════════════════════════
const MESES_EXT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function formatarDataExtenso(dataStr) {
  if (!dataStr) return "";
  const d = dataStr.length > 10 ? new Date(dataStr) : new Date(dataStr + "T00:00:00");
  if (isNaN(d)) return "";
  return `${d.getDate()} de ${MESES_EXT[d.getMonth()]} de ${d.getFullYear()}`;
}

function calcularPrazoDias(inicio, fim) {
  if (!inicio || !fim) return null;
  const di = new Date(inicio + "T00:00:00"), df = new Date(fim + "T00:00:00");
  if (isNaN(di) || isNaN(df)) return null;
  const dias = Math.round((df - di) / 86400000);
  return dias >= 0 ? dias : null;
}

function cgFill(valor, placeholder) {
  const v = (valor || "").toString().trim();
  return v ? esc(v) : `<span class="cg-yellow">[${esc(placeholder || "completar")}]</span>`;
}

function abrirGerarContrato(id) {
  const item = DB.contratos.find(c => c.id === id);
  if (!item) return;
  document.getElementById("modalContratoDoc").dataset.currentId = id;
  abrirModal("modalContratoDoc");
  const jaGerado = !!item.cContratoHtml;
  document.getElementById("modalContratoDocTitulo").textContent = jaGerado
    ? "📄 Contrato de Prestação de Serviços · gerado em " + formatarDataHora(item.cContratoGeradoEm)
    : "📄 Contrato de Prestação de Serviços";
  document.getElementById("contratoDocHint").style.display = jaGerado ? "none" : "";
  if (jaGerado) {
    // Reabre a versão já salva (preserva edições manuais) em vez de regenerar do zero.
    document.getElementById("contratoDocArea").innerHTML = item.cContratoHtml;
  } else {
    // Paginação depende de medir altura real — só funciona com o modal já visível.
    paginarContrato(document.getElementById("contratoDocArea"), montarContratoHTML(item));
  }
}

function regenerarContratoDoc() {
  const id = document.getElementById("modalContratoDoc").dataset.currentId;
  const item = DB.contratos.find(c => c.id === id);
  if (!item) return;
  if (item.cContratoHtml && !confirm("Isso descarta as edições feitas no documento salvo e gera um novo a partir dos dados atuais do contrato. Deseja continuar?")) return;
  document.getElementById("contratoDocHint").style.display = "";
  document.getElementById("modalContratoDocTitulo").textContent = "📄 Contrato de Prestação de Serviços";
  paginarContrato(document.getElementById("contratoDocArea"), montarContratoHTML(item));
}

function salvarContratoDoc(sufixo) {
  const id = document.getElementById("modalContratoDoc").dataset.currentId;
  const idx = DB.contratos.findIndex(c => c.id === id);
  if (idx < 0) return;
  const html = document.getElementById("contratoDocArea").innerHTML;
  if (!html.trim()) return;
  const jaExistia = !!DB.contratos[idx].cContratoHtml;
  const mudou = html !== DB.contratos[idx].cContratoHtml;
  if (!mudou && !sufixo) return; // nada mudou e não foi um download explícito: evita poluir o histórico

  // A 1ª vez que o documento é salvo conta como "gerado"; da 2ª em diante, "atualizado".
  let acao;
  if (mudou) {
    acao = jaExistia ? "Documento do contrato atualizado" : "Documento do contrato gerado";
    if (sufixo) acao += " e " + sufixo;
  } else {
    acao = "Documento do contrato " + sufixo;
  }

  DB.contratos[idx].cContratoHtml = html;
  DB.contratos[idx].cContratoGeradoEm = new Date().toISOString();
  DB.contratos[idx].historico = [...(DB.contratos[idx].historico || []), {
    data: new Date().toISOString(), usuario: STATE.nomeUsuario, perfil: STATE.perfil,
    status: DB.contratos[idx].status, obs: acao + "."
  }];
  registrarAuditoria(acao, "Contratos", id, "", "", acao);
  syncContrato(DB.contratos[idx]);
  renderContratos();
}

function fecharModalContratoDoc() {
  salvarContratoDoc();
  fecharModal("modalContratoDoc");
}

function exportarContratoPDF() {
  salvarContratoDoc("baixado em PDF");
  document.getElementById("printArea").innerHTML = document.getElementById("contratoDocArea").innerHTML;
  window.print();
}

// Divide o HTML gerado em páginas A4 físicas (297mm), respeitando a margem
// de segurança do timbrado em toda página — não só na primeira.
function novaPaginaContrato(container) {
  const pagina = document.createElement("div");
  pagina.className = "contrato-page";
  pagina.innerHTML = `<div class="contrato-page-bg"></div><div class="contrato-page-content"></div>`;
  container.appendChild(pagina);
  return pagina.querySelector(".contrato-page-content");
}

function paginarContrato(container, rawHtml) {
  // scrollHeight de .contrato-page-content já inclui seu próprio padding (38mm + 36mm),
  // então o limite de comparação é a altura física total da página (297mm), não a área útil.
  const MM_TO_PX = 96 / 25.4;
  const ALTURA_UTIL = 297 * MM_TO_PX;

  const buffer = document.createElement("div");
  buffer.innerHTML = rawHtml;
  const blocos = Array.from(buffer.children);

  container.innerHTML = "";
  let conteudo = novaPaginaContrato(container);
  const transbordou = () => conteudo.scrollHeight > ALTURA_UTIL;

  const colocar = node => {
    conteudo.appendChild(node);
    if (transbordou() && conteudo.childNodes.length > 1) {
      conteudo.removeChild(node);
      conteudo = novaPaginaContrato(container);
      conteudo.appendChild(node);
    }
  };

  blocos.forEach(bloco => {
    if (bloco.tagName === "OL" && bloco.classList.contains("cg-lista")) {
      const itens = Array.from(bloco.children);
      let total = 0;
      let ol = document.createElement("ol");
      ol.className = "cg-lista";
      conteudo.appendChild(ol);
      itens.forEach(li => {
        ol.appendChild(li);
        total++;
        if (transbordou() && (ol.children.length > 1 || conteudo.childNodes.length > 1)) {
          ol.removeChild(li);
          total--;
          conteudo = novaPaginaContrato(container);
          ol = document.createElement("ol");
          ol.className = "cg-lista";
          ol.style.counterReset = "cg-item " + total;
          conteudo.appendChild(ol);
          ol.appendChild(li);
          total++;
        }
      });
    } else {
      colocar(bloco);
    }
  });
}

function montarContratoHTML(item) {
  const nomeContratada     = cgFill(item.cTercNome, "nome completo");
  const estadoCivil        = cgFill(item.cTercEstadoCivil, "estado civil");
  const profissao          = cgFill(item.cTercFuncao, "profissão / função");
  const rg                 = cgFill(item.cTercRg, "RG");
  const cpf                = cgFill(item.cTercCpf, "CPF");
  const enderecoCompleto   = cgFill(
    [item.cTercEndereco, item.cTercMunicipio].filter(Boolean).join(", "),
    "endereço completo"
  );
  const objeto             = cgFill(item.cObjeto, "descrever o objeto do contrato");
  const projeto            = cgFill(item.cProjeto, "nome do projeto");
  const valorTotal         = item.cValorTotal ? esc(formatarMoeda(item.cValorTotal)) : `<span class="cg-yellow">[valor total]</span>`;
  const dadosBancarios     = item.cDadosPagamento
    ? `<div class="cg-bank">${esc(item.cDadosPagamento)}</div>`
    : `<div class="cg-bank cg-yellow">[conta / agência / banco / chave PIX]</div>`;
  const dias               = calcularPrazoDias(item.cDataInicio, item.cDataFim);
  const prazoTexto         = dias !== null ? `${dias} ${dias === 1 ? "dia" : "dias"}` : `<span class="cg-yellow">[nº de dias]</span>`;
  const dataInicioExt      = item.cDataInicio ? formatarDataExtenso(item.cDataInicio) : `<span class="cg-yellow">[data de início]</span>`;
  const numeroContrato     = item.cNumeroContrato ? esc(item.cNumeroContrato) : `<span class="cg-yellow">[nº/ano]</span>`;
  const dataAssinaturaExt  = formatarDataExtenso(new Date().toISOString().slice(0, 10));

  const formaPgto = item.cTercFormaPgto || "";
  let textoParcelamento, textoMeioPagamento;
  if (formaPgto === "Parcelado") {
    const nParcelas = item.cTercParcelas ? esc(item.cTercParcelas) : `<span class="cg-yellow">[nº de parcelas]</span>`;
    textoParcelamento  = `Pela execução dos serviços objeto deste contrato, a CONTRATANTE pagará ao(à) CONTRATADO (A) o valor total de ${valorTotal}, em ${nParcelas} parcelas, com vencimentos a serem definidos entre as Partes, mediante validação da entrega e cumprimento das obrigações pactuadas.`;
    textoMeioPagamento = `Os pagamentos mencionados deverão ser realizados mediante depósito ou transferência bancária em conta de titularidade da CONTRATADA, a seguir indicada:`;
  } else {
    textoParcelamento  = `Pela execução dos serviços objeto deste contrato, a CONTRATANTE pagará ao(à) CONTRATADO (A) o valor total de ${valorTotal}. O pagamento será realizado em parcela única, após a conclusão das atividades previstas no contrato, mediante validação da entrega e cumprimento das obrigações pactuadas.`;
    if (formaPgto === "Pix") {
      textoMeioPagamento = `Os pagamentos mencionados deverão ser realizados via Pix, na chave de titularidade da CONTRATADA a seguir indicada:`;
    } else if (formaPgto === "Boleto") {
      textoMeioPagamento = `Os pagamentos mencionados deverão ser realizados mediante boleto bancário emitido em nome da CONTRATADA, conforme dados a seguir indicados:`;
    } else {
      textoMeioPagamento = `Os pagamentos mencionados deverão ser realizados por transferência bancária em conta de titularidade da CONTRATADA, a seguir indicada:`;
    }
  }

  const clausula = (n, texto) => `<p class="cg-p"><strong>Cláusula ${n}ª.</strong> ${texto}</p>`;
  const paragrafoUnico = texto => `<p class="cg-p cg-paragrafo">Parágrafo único. ${texto}</p>`;
  const paragrafoSimbolo = (n, texto) => `<p class="cg-p cg-paragrafo">§${n}º. ${texto}</p>`;
  const secao = (num, titulo) => `<p class="cg-secao">${num} – ${titulo}</p>`;
  const listaLetras = itens => `<ol class="cg-lista">${itens.map(i => `<li>${i}</li>`).join("")}</ol>`;

  return `
    <p class="cg-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</p>
    <p class="cg-sub">Contrato ${numeroContrato}</p>

    <p class="cg-p">Pelo presente instrumento particular, de um lado, como “CONTRATANTE”:</p>
    <p class="cg-p">SETEG - SOLUÇÕES GEOLÓGICAS E AMBIENTAIS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 35.237.262/0001-59, com contrato social arquivado com registro na Junta Comercial do Estado do Ceará sob o NIRE 23200470522, com sede na Rua Zezito Gomes, nº 410, Timbu, Eusébio/CE, CEP: 61.777-270 (“SETEG”), neste ato representada por seu administrador MATHEUS FONTENELLE XIMENES DE FARIAS, brasileiro, casado sob o regime de comunhão parcial de bens, biólogo, inscrito no CPF sob o nº 630.555.383-15, portador do documento de identidade de nº 00913923006 DETRAN/CE, com endereço profissional retro informado. (“CONTRATANTE”);</p>

    <p class="cg-p">E de outro lado, na qualidade de “CONTRATADA”:</p>
    <p class="cg-p">${nomeContratada}, brasileiro(a), ${estadoCivil}, ${profissao}, portador(a) da carteira de identidade de n° ${rg}, inscrito(a) no CPF sob o n° ${cpf}, com endereço residencial em ${enderecoCompleto}. (“CONTRATADA”)</p>

    <p class="cg-p">Tratados por “Parte” quando tratados individualmente e, quando em conjunto, por “Partes”, firmam o presente Contrato de Prestação de Serviços (“Contrato”) pela melhor forma em direito admitida, dando tudo por bom, firme e valioso, considerando as cláusulas e condições que se seguem:</p>

    ${secao("I", "DO OBJETO DO CONTRATO")}
    ${clausula(1, `Por meio do presente Contrato, a CONTRATADA se compromete a realizar serviços específicos de ${objeto}, conforme estratégia elaborada e previamente alinhada junto à CONTRATANTE.`)}

    ${secao("II", "DO LOCAL DA PRESTAÇÃO DOS SERVIÇOS")}
    ${clausula(2, `Os serviços serão desempenhados em local definido em acordo prévio entre as Partes, para a execução das atividades destacadas no objeto.`)}
    <p class="cg-p cg-indent">Projeto: ${projeto}</p>

    ${secao("III", "DO PREÇO E FORMA DE PAGAMENTO")}
    ${clausula(3, textoParcelamento)}
    ${clausula(4, textoMeioPagamento)}
    ${dadosBancarios}
    ${paragrafoUnico(`Eventuais tributos decorrentes da prestação dos Serviços deverão ser arcados pelas respectivas PARTES, de acordo com a legislação tributária, e já estão abrangidos pela contraprestação.`)}
    ${clausula(5, `Os pagamentos das diárias, para efeito de elucidação, considerarão cada mês completo de prestação de Serviços, com eventual pagamento proporcional no caso de prestação dos Serviços em período parcial do correspondente mês.`)}
    ${clausula(6, `Todos os pagamentos devidos pela CONTRATANTE à CONTRATADA realizados por meio de crédito em conta corrente de titularidade da CONTRATADA terão o comprovante de depósito como prova inequívoca do respectivo pagamento e mecanismo de outorga automática de quitação por parte da CONTRATADA, da mesma forma, os pagamentos realizados em espécie deverão ser realizados e confirmados por meio de recibo que comprova a devida realização da quitação.`)}
    ${clausula(7, `A CONTRATADA, sempre que for solicitada pela CONTRATANTE, exibirá os comprovantes dos pagamentos e liquidação de todas as obrigações decorrentes do cumprimento do presente Contrato.`)}

    ${secao("IV", "DAS OBRIGAÇÕES COMUNS DAS PARTES")}
    ${clausula(8, `As Partes acordam que os direitos de propriedade intelectual e/ou industrial vinculados às operações desenvolvidas serão de titularidade exclusiva da CONTRATANTE.`)}
    ${clausula(9, `As Partes comprometem-se a cumprir, isolada ou conjuntamente, quando couber, todas as determinações impostas pelas autoridades públicas competentes, relativas ao serviço, bem como o pagamento de todos os tributos federais, estaduais e municipais que incidam ou venham a incidir sobre a atividade.`)}
    ${clausula(10, `As Partes comprometem-se a não repassar qualquer material confidencial a terceiro ou para os concorrentes.`)}

    ${secao("V", "DOS DIREITOS E OBRIGAÇÕES DA CONTRATANTE")}
    ${clausula(11, `A CONTRATANTE fornecerá à CONTRATADA todas as informações e elementos necessários à execução do seu trabalho, envidando o máximo de esforços para a execução do Objeto deste Contrato e devendo especificar os detalhes necessários à sua perfeita consecução.`)}
    ${clausula(12, `A CONTRATANTE poderá realizar auditorias periódicas para verificar a conformidade da CONTRATADA com as políticas de segurança, saúde e sustentabilidade. Qualquer não conformidade identificada deverá ser corrigida imediatamente, sob pena de rescisão do contrato.`)}
    ${clausula(13, `Pelos serviços desempenhados, a CONTRATANTE compromete-se a realizar o pagamento pactuado na forma e periodicidade previstas neste Contrato.`)}

    ${secao("VI", "DOS DIREITOS E OBRIGAÇÕES DA CONTRATADA")}
    ${clausula(14, `Pela CONTRATADA, visando a realização do objeto deste Contrato, há a obrigação do que se segue:`)}
    ${listaLetras([
      "Prestar os serviços solicitados pela CONTRATANTE conforme descritivo, especificações previstas no Objeto;",
      "Realizar a plena quitação de todas as obrigações fiscais e previdenciárias, quando aplicáveis, decorrentes do exercício de suas atividades;",
      "Manter alto padrão de qualidade na execução dos Serviços;",
      "Observar, na prestação dos Serviços, a legislação em vigor, incluindo, sem limitação, normas, leis, regulamentos, posturas e recomendações Federais, Estaduais e Municipais, obrigando-se a obter e manter de forma regular toda a habilitação, registro, licenças e/ou autorização pertinentes ao desenvolvimento regular das suas atividades, responsabilizando-se integralmente junto aos órgãos fiscalizadores;",
      "Executar suas atividades em conformidade com os princípios da sustentabilidade e a Política Ambiental da CONTRATANTE, minimizando os impactos ambientais e promovendo o uso racional de recursos naturais, cumprindo todas as legislações ambientais aplicáveis, incluindo a Lei Federal nº 12.305/2010 (Política Nacional de Resíduos Sólidos) e demais normas federais, estaduais e municipais pertinentes à proteção e preservação do meio ambiente;",
      "Implementar práticas de gestão de resíduos e de controle de poluição, garantindo a conformidade com os padrões estabelecidos pelos órgãos ambientais competentes;",
      "Cumprir integralmente as normas de segurança e saúde estabelecidas pela CONTRATANTE, conforme disposto em sua Política de Saúde e Segurança e em conformidade com as demais legislações federais, estaduais e municipais aplicáveis à segurança e saúde ocupacional;",
      "Utilizar corretamente os Equipamentos de Proteção Individual (EPIs), os quais devem possuir Certificado de Aprovação (CA) emitido pelo órgão competente e seguir as práticas de segurança estabelecidas no ambiente de trabalho e no campo;",
      "Participar treinamentos e capacitações obrigatórias, conforme exigido pelas NRs e outras normativas legais relacionadas;",
      "Realizar os esclarecimentos necessários à CONTRATANTE, bem como as informações concernentes à natureza e andamento dos Serviços;",
      "Fornecer os respectivos documentos fiscais, referente ao(s) pagamento(s) do presente instrumento;",
      "Fornecer a devida autorização de uso de imagem e voz e outros dados sensíveis, quando necessário, em nome da CONTRATANTE, para garantir toda a execução das atividades previstas neste Contrato;",
      "Tratar de forma estritamente confidencial as informações levadas a seu conhecimento pela CONTRATANTE, pelos clientes ou dos terceiros envolvidos com as partes anteriormente descritas, somente utilizando-as para os fins contratados, sendo VEDADA a comercialização ou utilização para outros fins;",
      "Manter o absoluto sigilo sobre as operações, dados, estratégias, materiais, informações e documentos da CONTRATANTE, dos clientes ou dos terceiros envolvidos com as partes anteriormente descritas, mesmo após a conclusão dos serviços ou do término da relação contratual."
    ])}
    ${clausula(15, `A CONTRATADA não poderá subcontratar terceiros para a execução dos serviços contratados sem a prévia e expressa autorização por escrito da CONTRATANTE. Caso a subcontratação seja autorizada, a CONTRATADA permanecerá integralmente responsável pelos atos e omissões de seus subcontratados, sendo sua obrigação garantir que estes cumpram todas as obrigações estabelecidas neste contrato, inclusive no que tange às normas de segurança, saúde e sustentabilidade.`)}
    ${clausula(16, `Caso a impossibilidade referida na cláusula acima perdure por mais de 7 (sete) dias e a CONTRATADA não apresente, dentro deste prazo, substituto considerado adequado pela CONTRATANTE, nos termos da cláusula, a CONTRATANTE poderá rescindir o presente Contrato, sem pagamento de nenhuma multa ou penalidade, sem prejuízo de pleitear eventual reparação judicial pelos danos causados pela ausência da prestação dos serviços.`)}

    ${secao("VII", "DO PRAZO")}
    ${clausula(17, `O presente Contrato terá prazo de ${prazoTexto}, podendo ser renovado mediante aditivo contratual.`)}
    ${paragrafoUnico(`Caso a CONTRATADA não cumpra os prazos estabelecidos para a execução dos serviços, será aplicada uma multa moratória de 0,5% (meio por cento) sobre o valor total contratual por dia de atraso, limitada ao máximo de 30% (trinta por cento) do valor total do contrato. A aplicação da multa ocorrerá automaticamente, independentemente de notificação prévia por parte da CONTRATANTE.`)}

    ${secao("VIII", "DAS VEDAÇÕES E RESPONSABILIDADES")}
    ${clausula(18, `É vedado à CONTRATADA, a qualquer título, ceder o uso da propriedade intelectual ou industrial relacionadas aos projetos decorrentes dos Serviços a terceiros ou utilizar as marcas dos projetos decorrentes deste Contrato para fins diferentes dos estabelecidos neste instrumento.`)}
    ${clausula(19, `Fica vedado à CONTRATADA divulgar, por qualquer meio, assim como utilizar em outros estabelecimentos ou iniciativas as informações que tratem sobre fórmulas, metodologias, planilhas e demais informações confidenciais dos clientes e projetos que tenham ficado sob seu conhecimento em razão deste Contrato.`)}
    ${clausula(20, `A CONTRATADA declara expressamente estar legalmente habilitada para a prestação dos Serviços objeto deste Contrato e que dispõe e manterá disponíveis durante toda a vigência do presente Contrato, as autorizações, registros, licenças e habilitações exigidas, bem como os recursos materiais e humanos, a qualificação, o conhecimento técnico e a expertise suficientes e adequados para a prestação dos Serviços.`)}
    ${clausula(21, `A relação das Partes é àquela de contratantes independentes. Em nenhuma circunstância ou situação será presumida a existência de uma sociedade entre a CONTRATANTE e a CONTRATADA. Nenhuma disposição neste instrumento atribui nem atribuirá à CONTRATADA o status de sócio, distribuidor e/ou representante comercial da CONTRATANTE.`)}
    ${clausula(22, `Em decorrência deste Contrato, sob nenhuma hipótese ou em qualquer situação, se presumirá a eventual existência, ou se estabelecerá a presunção de qualquer vínculo empregatício ou obrigações de caráter trabalhista e previdenciário entre a CONTRATANTE e a CONTRATADA, nem a CONTRATANTE será fiadora das obrigações e encargos trabalhistas e previdenciários da CONTRATADA, que assume, neste ato, integral responsabilidade por tais obrigações, inclusive as de caráter civil, penal, tributário e previdenciário.`)}
    ${clausula(23, `A CONTRATADA declara e garante que não emprega trabalho infantil, forçado ou análogo ao escravo em suas operações, direta ou indiretamente. O descumprimento desta cláusula implicará em rescisão imediata do Contrato e aplicação de penalidades.`)}

    ${secao("IX", "DOS DIREITOS DE TITULARIDADE")}
    ${clausula(24, `Todo o desenvolvimento de peças publicitárias, conteúdo digital e/ou outros materiais vinculados ao Serviço, devidamente publicados nos canais oficiais das produções, bem como os grafismos, fotografias, vídeos, sons, imagens, vozes, músicas, roteiros, adaptações, assim como de todo o material e conteúdo de bastidores e produção são de propriedade exclusiva da CONTRATANTE, podendo deles se utilizar de forma irrestrita, não podendo a CONTRATADA, em hipótese alguma, mesmo em caso de rescisão contratual, pleitear judicial ou extrajudicialmente, a suspensão, impedimento, retirada do ar, diminuição ou vedação de circulação, publicidade, exposição, comercialização, mas não se limitando a estes, de todo o material e conteúdo oriundos do Contrato.`)}
    ${paragrafoUnico(`O disposto acima aplica-se também ao conteúdo eventualmente produzido pela CONTRATANTE que ainda não tenha sido eventualmente lançado.`)}

    ${secao("X", "DA RESCISÃO")}
    ${clausula(25, `O presente Contrato poderá ser rescindido imediata e unilateralmente pelas Partes nas seguintes hipóteses:`)}
    ${listaLetras([
      "Ocorrência de comportamento ou acontecimento, no qual a CONTRATADA possua culpa ou dolo, que comprometa negativamente a reputação ou a imagem da CONTRATANTE ou de quaisquer dos seus Sócios, quando for o caso;",
      "Prática de atos ilícitos por parte das Partes ou por terceiros sob as suas ordens e/ou responsabilidade;",
      "Infração ao compromisso de confidencialidade pactuado na Cláusula 29ª;",
      "Infração do compromisso anticorrupção pactuado na Cláusula 32ª;",
      "A não observância de qualquer disposição deste Contrato por qualquer das Partes ou por qualquer indivíduo sob sua responsabilidade;",
      "Em caso de regime de falência, em liquidação judicial ou extrajudicial, ou ainda se houver a dissolução total amigável ou judicial da sociedade;",
      "Haja o encerramento das atividades de quaisquer das Partes."
    ])}
    ${clausula(26, `A ocorrência de qualquer das hipóteses mencionadas nas alíneas “a”, “b”, “c” e “d” da Cláusula supracitada implicará em multa devida pela Parte infratora na importância de R$100.000,00 (cem mil reais), sem prejuízo de indenizações cabíveis.`)}
    ${clausula(27, `As Partes poderão ainda rescindir o presente Contrato sem justificativa, mediante comunicação prévia e escrita, com 30 (trinta) dias de antecedência. Caso contrário, será devido à CONTRATANTE multa compensatória no valor correspondente a 20% (vinte por cento) do valor do contrato.`)}
    ${clausula(28, `Na hipótese de descumprimento de obrigação contratual por parte da CONTRATADA, que impossibilite a concretização do objeto do contrato, ocorrerá a rescisão do presente instrumento, sendo devido à CONTRATANTE multa compensatória no valor de 20% (vinte por cento) do valor do contrato.`)}

    ${secao("XI", "DA CONFIDENCIALIDADE, NÃO COMPETIÇÃO E NÃO ALICIAMENTO")}
    ${clausula(29, `As Partes, durante a vigência do presente Contrato e nos 02 (dois) anos subsequentes ao seu término ou rescisão, obrigar-se-ão a manter o mais completo e absoluto sigilo sobre quaisquer dados, materiais, informações, documentos, especificações técnicas ou comerciais, inovações e aperfeiçoamentos obtidos de uma Parte em relação à outra (“Informações Confidenciais”), ou que venham a lhe ser confiados em razão deste Contrato e dos serviços executados no curso deste, sejam eles de interesse de uma das Partes ou de terceiros, não podendo, sob qualquer pretexto, divulgar, revelar, reproduzir, utilizar ou deles dar conhecimento a terceiros, estranhos a esta contratação, sem a prévia anuência e concordância da Parte reveladora.`)}
    ${paragrafoSimbolo(1, `A obrigação de confidencialidade aqui prevista não se aplica às informações disponibilizadas por qualquer uma das Partes que: (a) já eram de conhecimento da Parte receptora, quando de sua divulgação; (b) já eram de domínio público quando de sua divulgação; sem que tenha ocorrido qualquer violação de obrigação de confidencialidade pela Parte receptora; (c) tenham sido independentemente desenvolvidas ou obtidas pela Parte receptora sem a violação deste Contrato, exceto quando tais informações tiverem sido desenvolvidas com base nas Informações Confidenciais.`)}
    ${paragrafoSimbolo(2, `A inobservância do disposto na Cláusula 29ª sujeitará a Parte violadora às penalidades decorrentes da violação e quebra de sigilo contratual prevista na Cláusula mencionada, sem prejuízo de arcar com as perdas e danos decorrentes do seu ato, apurado em processo judicial competente para esta finalidade.`)}
    ${clausula(30, `A CONTRATADA, durante a vigência do presente Contrato e nos 02 (dois) anos subsequentes ao seu término ou rescisão, não poderá tomar parte, direta ou indiretamente, por meio de seus prepostos ou parentes, na qualidade de sócio, acionista, administrador, conselheiro, funcionário, representante, prestador de serviços ou outros, individualmente ou por meio de qualquer sociedade, negócio e/ou empreendimento que atue no Ramo de Negócios dentro do território brasileiro, junto a e/ou em favor de clientes da CONTRATANTE, sob pena de multa não compensatória no valor de R$100.000,00 (cem mil reais), sem prejuízo de arcar com as perdas e danos decorrentes do seu ato, apurado em processo judicial competente para esta finalidade.`)}
    ${clausula(31, `Sob pena de multa não compensatória no valor de R$100.000,00 (cem mil reais), as Partes deverão se abster de contatar, negociar ou contratar empregados, parceiros, sócios ou diretores que tenham vínculo com a Parte contrária, não os encorajando, induzindo ou aliciando, direta ou indiretamente, para que deixem de prestar tais serviços e/ou para que ajuízem ações judiciais em face da Parte Contrária, ou para que revelem, direta ou indiretamente, seus segredos comerciais, seja em benefício próprio ou de terceiros.`)}

    ${secao("XII", "DA LEI ANTICORRUPÇÃO")}
    ${clausula(32, `As Partes declaram, entre si que:`)}
    ${listaLetras([
      "Ter sempre cumprido todas as leis aplicáveis, e não ter cometido, por ação ou omissão, nenhum ato que pudesse ou possa ser considerado uma violação às leis brasileiras ou estrangeiras aplicáveis, relacionadas a corrupção, suborno, fraude, conflito de interesses públicos, improbidade administrativa, violações a licitações e contratos públicos, lavagem de dinheiro, doações políticas ou eleitorais, ou condução de negócios de forma não ética, incluindo, sem limitação, o Decreto-Lei n° 2.848/1940, a Lei n° 8.429/1992, a Lei n° 8.666/1993, a Lei n° 9.504/1997, a Lei n° 9.613/1998, a Lei n° 12.813/2013 e a Lei nº 12.846/2013, assim como leis estrangeiras com eficácia extraterritorial aprovadas com base na Convenção sobre o Combate da Corrupção de Funcionários Públicos Estrangeiros em Transações Comerciais Internacionais da OCDE, inclusive seus regulamentos e demais normas relacionadas, bem como suas futuras alterações (“Leis Anticorrupção”).",
      "Ter sempre cumprido todas as leis aplicáveis e normas relacionadas a contribuições e doações políticas, presentes, gratificações e despesas pagas a ou em nome de (i) agente, autoridade, funcionário, servidor, empregado, diretor, conselheiro ou representante de qualquer entidade governamental, departamento, agência ou ofício públicos, incluindo quaisquer entidades dos poderes Executivo, Legislativo e Judiciário, entidades da administração pública direta ou indireta, empresas públicas, sociedades de economia mista e fundações públicas, nacionais ou estrangeiras; (ii) qualquer pessoa exercendo, ainda que temporariamente e sem remuneração, cargo, função ou emprego em qualquer entidade de um Estado; (iii) diretor, conselheiro, empregado ou representante de uma organização internacional pública; e (iv) diretor, conselheiro ou empregado de qualquer partido político, bem como candidatos concorrendo a cargos públicos eletivos ou políticos, no Brasil ou no exterior (“Agentes Públicos”), ou a qualquer terceiro relacionado com um Agente Público;",
      "Não ter (i) concedido, prometido ou autorizado a dação, oferta ou promessa de qualquer vantagem indevida (em dinheiro ou qualquer coisa de valor) a qualquer Agente Público, ou qualquer terceiro relacionado a Agente Público; (ii) financiado, provido, patrocinado ou subsidiado qualquer ato prejudicial ao governo ou qualquer Estado, nação ou governo (federal, estadual, municipal ou qualquer outra entidade ou subdivisão pública), qualquer entidade da administração pública direta, indireta ou fundacional, nacional ou estrangeira, incluindo, sem limitações, qualquer autoridade, órgão, autarquia, agência, conselho, comissão, secretariado, tribunal judicial ou arbitral, departamento, escritório ou representação, que exerça função executiva, legislativa, judiciária, regulatória ou administrativa, bem como organismo autônomo governamental, organização internacional de direito público e partidos políticos (“Autoridade Governamental”); (iii) usado terceiros, pessoas físicas ou jurídicas, para esconder ou simular os interesses reais ou a identidade dos beneficiários de qualquer ato prejudicial contra qualquer Autoridade Governamental; (iv) fraudado, manipulado, impedido, evitado, interferido ou obtido qualquer vantagem indevida de qualquer processo de licitação pública, ou de quaisquer contratos com qualquer Autoridade Governamental, ou (v) impedido investigações ou fiscalização por qualquer Autoridade Governamental ou interferido em seus atos;",
      "Não ter recebido quaisquer notificações ou comunicações sobre violações às Leis Anticorrupção, e que não está, direta ou indiretamente (i) sob investigação ou monitoramento em virtude de denúncias de suborno e/ou corrupção; (ii) sujeito a processo judicial e/ou administrativo em curso; (iii) banido, listado como inidôneo ou proibido ou com restrições de direitos de contratar com qualquer Autoridade Governamental; (iv) sujeito a restrições ou sanções econômicas e de negócios por qualquer Autoridade Governamental; e (v) publicamente acusado ou suspeito de práticas de corrupção ou atos lesivos contra a administração pública;",
      "Que, durante a vigência deste Acordo, obriga-se, não violar e não realizar qualquer ato que possa ser interpretado como uma violação a qualquer norma prevista nas Leis Anticorrupção;",
      "Que se compromete a notificar por escrito a outra Parte, no prazo máximo de 24 (vinte e quatro) horas contadas da tomada de conhecimento do fato, a respeito de qualquer suspeita de ou efetiva violação das Leis Anticorrupção, bem como em casos em que obtiver ciência acerca de qualquer prática de suborno ou corrupção envolvendo seu nome."
    ])}
    ${paragrafoUnico(`O descumprimento, por uma das Partes, das Leis Anticorrupção poderá ser considerado uma infração grave, que implicará na rescisão da Parceria, sem prejuízo de obter reparação integral por perdas e danos, inclusive por quaisquer multas, tributos, juros, despesas, custos e honorários incorridos em conexão com a investigação de irregularidades ou defesas, diante de quaisquer acusações ou processos relacionados à violação ou suposta violação das Leis Anticorrupção de qualquer jurisdição.`)}

    ${secao("XIII", "DA LEI GERAL DE PROTEÇÃO DE DADOS – LGPD")}
    ${clausula(33, `As Partes declaram e garantem, mutuamente, que cumprem toda a legislação aplicável sobre segurança da informação, privacidade e proteção de dados, incluindo (sempre e quando aplicáveis ao presente Contrato) a Constituição Federal, o Código de Defesa do Consumidor, o Código Civil, o Marco Civil da Internet (Lei Federal nº 12.965/2014) e respectivo decreto regulamentador (Decreto nº 8.771/2016), a Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018) e demais normas setoriais ou gerais sobre o tema, comprometendo-se a tratar os dados classificados como pessoais, que sejam coletados, fornecidos ou acessados por meio ou em decorrência deste instrumento, exclusivamente para fins da execução do objeto de seu objeto, no curso do relacionamento existente entre as Partes e somente nos estritos limites aqui previstos, sem transferi-los a qualquer terceiro, exceto se expressamente autorizado pelo titular dos dados, por este ou outro instrumento ou, ainda, para o cumprimento de obrigação legal ou regulatória ou em caso de decisão judicial que obrigue o fornecimento.`)}
    ${paragrafoSimbolo(1, `Em caso de eventual vazamento indevido de dados, as Partes a informar umas às outras sobre o vazamento, bem como sobre qual o dado vertido e a ação necessária para mitigação dos eventuais danos causados.`)}
    ${paragrafoSimbolo(2, `A Partes se comprometem a executar os trabalhos a partir das premissas da LGPD, em especial os princípios da finalidade, adequação, transparência, livre acesso, segurança, prevenção e não discriminação no tratamento dos dados.`)}

    ${secao("XIV", "DISPOSIÇÕES FINAIS")}
    ${clausula(34, `O presente Contrato entra em vigor a partir do dia ${dataInicioExt}.`)}
    ${clausula(35, `O presente Contrato reflete o acordo integral entre as Partes e legalmente substitui e revoga todos os documentos, obrigações e acordos assumidos entre elas antes da data deste instrumento, sejam eles verbais ou escritos, no que diz respeito ao objeto do presente Contrato.`)}
    ${clausula(36, `Eventual tolerância às infrações das cláusulas e condições deste Contrato não constituirão novação ou renúncia aos direitos que são conferidos às Partes, podendo o cumprimento da obrigação e/ou a incidência da penalidade cominada ser exigida a qualquer tempo.`)}
    ${clausula(37, `O presente Contrato obriga as Partes e os seus sucessores, a qualquer título, sendo as Partes responsáveis pelos atos e omissões de seus respectivos funcionários, administradores ou gerentes, prestadores de serviços, contratados ou prepostos, sob qualquer denominação.`)}
    ${clausula(38, `Este Contrato é celebrado pelas Partes em caráter irrevogável e irretratável, e vincula não só as Partes, mas também seus respectivos sucessores e cessionários, a qualquer título, que assumam as obrigações dele decorrentes.`)}
    ${clausula(39, `Os direitos e obrigações decorrentes do presente Contrato somente poderão ser cedidos por uma Parte mediante o consentimento por escrito da outra Parte. Não se aplica o disposto neste item às hipóteses de sucessão empresarial, seja em virtude de cisão, incorporação, fusão ou qualquer outra forma de reorganização societária.`)}
    ${clausula(40, `Este Contrato não poderá ser alterado ou modificado em nenhuma de suas cláusulas ou condições, salvo mediante acordo por escrito, assinado pelos representantes legais de ambas as Partes.`)}
    ${clausula(41, `Se uma disposição deste Contrato (ou parte de qualquer disposição) for considerada ilegal, inválida ou inexequível, a eficácia deste Contrato não será afetada, e tal disposição será aplicada com a mínima modificação necessária para torná-la legal, válida e exequível.`)}
    ${clausula(42, `A Partes elegem o foro da cidade de Fortaleza/CE para dirimir quaisquer conflitos que possam surgir, assim como para dirimir dúvidas provenientes da execução e cumprimento deste instrumento.`)}
    ${clausula(43, `Todas as obrigações e deveres contidos neste Contrato, poderão ser exigidos judicialmente, mesmo após do final mesmo, sendo este um documento com todos os efeitos de um Título Executivo Extrajudicial.`)}
    ${clausula(44, `As Partes pactuam que o presente Contrato pode sofrer alterações em suas cláusulas por meio de Aditivo Contratual, firmado pelas Partes.`)}
    ${clausula(45, `Fica estabelecido que o relacionamento entre as Partes, visando resguardar responsabilidades e obrigações, será normalmente pela forma escrita, através de consultas e respostas.`)}

    <p class="cg-p">E, por estarem justas e convencionadas, as Partes assinam o presente Contrato em 02 (duas) vias de igual teor, juntamente com 02 (duas) testemunhas instrumentárias.</p>

    <p class="cg-p cg-data-final">Fortaleza/CE, ${dataAssinaturaExt}.</p>

    <div class="cg-sign-grid">
      <div class="cg-sign-box">
        <div class="cg-sign-line"></div>
        <div>SETEG - SOLUÇÕES GEOLÓGICAS E AMBIENTAIS LTDA</div>
        <div>R.p. Matheus Fontenelle Ximenes de Farias</div>
        <div class="cg-sign-tag">(CONTRATANTE)</div>
      </div>
      <div class="cg-sign-box">
        <div class="cg-sign-line"></div>
        <div>${nomeContratada}</div>
        <div class="cg-sign-tag">(CONTRATADA)</div>
      </div>
    </div>

    <p class="cg-p cg-testemunhas">TESTEMUNHAS:</p>
    <div class="cg-wit-grid">
      <div class="cg-sign-box"><div class="cg-sign-line"></div><div>Nome:</div><div>CPF:</div></div>
      <div class="cg-sign-box"><div class="cg-sign-line"></div><div>Nome:</div><div>CPF:</div></div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
//  ENTREGAS
// ══════════════════════════════════════════════════════
function adicionarLinhaEntrega(dados){entregas.push(dados||{entrega:"",marco:"",data:"",valor:"",formaPagamento:"",salvo:false});renderEntregas();}
function removerEntrega(i){entregas.splice(i,1);renderEntregas();}
function editarEntrega(i){entregas[i].salvo=false;renderEntregas();}
function salvarEntrega(i){if(!entregas[i].entrega){mostrarToast("Informe a descrição da entrega.","err");return;}entregas[i].salvo=true;renderEntregas();}
function atualizarEntrega(i,campo,valor){entregas[i][campo]=valor;if(campo==="valor")calcularTotalEntregas();}

function renderEntregas() {
  const tbody=document.getElementById("entregasBody");
  const vazio=document.getElementById("entregasVazio");
  if(!tbody) return;
  tbody.innerHTML="";
  entregas.forEach((e,i)=>{
    const tr=document.createElement("tr");
    if(e.salvo){
      tr.innerHTML=`<td class="td-salvo">${esc(e.entrega)||"—"}</td><td class="td-salvo">${esc(e.marco)||"—"}</td><td class="td-salvo">${formatarData(e.data)}</td><td class="td-salvo td-valor">${formatarMoeda(e.valor)}</td><td class="td-salvo">${esc(e.formaPagamento)||"—"}</td><td><div style="display:flex;gap:.25rem"><button type="button" class="btn-icon" onclick="editarEntrega(${i})">✎</button><button type="button" class="btn-icon btn-icon-danger" onclick="removerEntrega(${i})">✕</button></div></td>`;
    } else {
      tr.innerHTML=`<td><input class="form-control" value="${esc(e.entrega)}" oninput="atualizarEntrega(${i},'entrega',this.value)" placeholder="Descrição"/></td><td><input class="form-control" value="${esc(e.marco)}" oninput="atualizarEntrega(${i},'marco',this.value)" placeholder="Marco"/></td><td><input class="form-control" type="date" value="${esc(e.data)}" oninput="atualizarEntrega(${i},'data',this.value)"/></td><td><input class="form-control" value="${esc(e.valor)}" oninput="atualizarEntrega(${i},'valor',this.value)" placeholder="0,00"/></td><td><input class="form-control" value="${esc(e.formaPagamento)}" oninput="atualizarEntrega(${i},'formaPagamento',this.value)" placeholder="Pix, Boleto..."/></td><td><div style="display:flex;gap:.25rem"><button type="button" class="btn-salvar-entrega" onclick="salvarEntrega(${i})">✓</button><button type="button" class="btn-icon btn-icon-danger" onclick="removerEntrega(${i})">✕</button></div></td>`;
    }
    tbody.appendChild(tr);
  });
  vazio.style.display=entregas.length?"none":"block";
  calcularTotalEntregas();
}

function calcularTotalEntregas(){
  const el=document.getElementById("totalEntregas");
  if(!el) return;
  const total=entregas.reduce((a,e)=>{const v=parseFloat(String(e.valor||"0").replace(/\./g,"").replace(",","."))||0;return a+v;},0);
  el.textContent=total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

// ══════════════════════════════════════════════════════
//  TERCEIRIZADOS
// ══════════════════════════════════════════════════════
function abrirFormNovoTerc(){limparFormTerc();document.getElementById("formTercTitulo").textContent="Cadastrar Terceirizado";document.getElementById("listaTerceirizados").classList.add("hidden");document.getElementById("formTerc").classList.remove("hidden");}
function fecharFormTerc(){document.getElementById("formTerc").classList.add("hidden");document.getElementById("listaTerceirizados").classList.remove("hidden");renderTerceirizados();}
function limparFormTerc(){document.getElementById("tercForm").reset();document.getElementById("tId").value="";document.getElementById("grpCnpjTerc").classList.add("hidden");document.getElementById("grpParcelasTerc").classList.add("hidden");}
function salvarTerceirizado(){
  const item=coletarCampos(CAMPOS_TERC);item.tId=item.tId||gerarId("TER");
  if(!item.tNome){mostrarToast("Informe o nome.","err");return;}
  if(!item.tTipo){mostrarToast("Informe o tipo.","err");return;}
  if(!item.tEmail){mostrarToast("Informe o e-mail.","err");return;}
  if(!item.tCpf){mostrarToast("Informe o CPF.","err");return;}
  if(!item.tTelefone){mostrarToast("Informe o telefone.","err");return;}
  if(item.tFormaPgto==="Parcelado"&&!item.tParcelas){mostrarToast("Informe o número de parcelas.","err");return;}
  const idx=DB.terceirizados.findIndex(t=>t.tId===item.tId);
  if(idx>=0){
    const antigo=DB.terceirizados[idx];
    const diffs=Object.entries(TERC_LABELS).filter(([k])=>String(antigo[k]||"")!==String(item[k]||"")).map(([k,l])=>`${l}: "${antigo[k]||"-"}" → "${item[k]||"-"}"`);
    const detalheEdit=diffs.length?diffs.join(" | "):"Sem alterações detectadas";
    DB.terceirizados[idx]={...antigo,...item,atualizadoEm:new Date().toISOString()};
    registrarAuditoria("Edição","Terceirizados",item.tId,"","",detalheEdit);
    syncTerceirizado(DB.terceirizados[idx]);mostrarToast("Atualizado.","ok");
  }
  else{item.criadoEm=new Date().toISOString();item.criadoPor=STATE.nomeUsuario;DB.terceirizados.unshift(item);registrarAuditoria("Criação","Terceirizados",item.tId,"","",item.tNome);syncTerceirizado(item);mostrarToast("Cadastrado.","ok");}
  fecharFormTerc();
}
function editarTerceirizado(id){
  const item=DB.terceirizados.find(t=>t.tId===id);if(!item)return;
  limparFormTerc();document.getElementById("formTercTitulo").textContent="Editar Terceirizado";
  CAMPOS_TERC.forEach(campo=>{const el=document.getElementById(campo);if(el)el.value=item[campo]||"";});
  toggleCondicional("tPossuiCnpj","Sim","grpCnpjTerc");
  toggleCondicional("tFormaPgto","Parcelado","grpParcelasTerc");
  document.getElementById("listaTerceirizados").classList.add("hidden");document.getElementById("formTerc").classList.remove("hidden");
}
function verTerceirizado(id) {
  const t = DB.terceirizados.find(x => x.tId === id);
  if (!t) return;
  const hist = DB.auditoria.filter(a => a.registroId === id && a.modulo === "Terceirizados");
  document.getElementById("modalVerTercTitulo").textContent = t.tNome + (t.tTipo ? " · " + t.tTipo : "");
  document.getElementById("modalVerTercBody").innerHTML = gerarHTMLDetalhesTerceirizado(t, hist);
  const btnEditar = document.getElementById("btnEditarVerTerc");
  if (ehGestaoOuGP()) {
    btnEditar.classList.remove("hidden");
    btnEditar.onclick = () => { fecharModal("modalVerTerc"); editarTerceirizado(id); };
  } else {
    btnEditar.classList.add("hidden");
  }
  abrirModal("modalVerTerc");
}
function gerarHTMLDetalhesTerceirizado(t, hist) {
  const di  = (l,v) => v ? `<div class="detail-item"><span>${l}</span><strong>${esc(String(v))}</strong></div>` : "";
  const diF = (l,v) => v ? `<div class="detail-item full"><span>${l}</span><strong>${esc(String(v))}</strong></div>` : "";
  const histHTML = hist.length
    ? hist.map(h=>`<div class="historico-item"><small>${formatarDataHora(h.data)} · ${esc(h.usuario||"-")} · ${esc(h.perfil||"-")}</small><strong>${esc(h.acao)}</strong><p style="font-size:.75rem;color:var(--text-secondary);margin:.2rem 0 0;white-space:pre-wrap;word-break:break-word">${esc(h.detalhe||"-").replace(/ \| /g,"\n")}</p></div>`).join("")
    : `<p style="color:var(--text-muted);font-size:.8rem;padding:.5rem 0">Nenhum histórico de edição registrado.</p>`;
  return `<div class="detail-grid">
    <div class="detail-section-title">1 · Identificação</div>
    ${di("Nome",t.tNome)}${di("Tipo",t.tTipo)}${di("E-mail",t.tEmail)}${di("CPF",t.tCpf)}${di("RG",t.tRg)}${di("Nascimento",formatarData(t.tNascimento))}${di("Estado Civil",t.tEstadoCivil)}${di("Telefone",t.tTelefone)}${di("Estado",t.tEstado)}${di("Cidade",t.tCidade)}${diF("Endereço",t.tEndereco)}
    <div class="detail-section-title">2 · Formação e Expertise</div>
    ${di("Graduação",t.tGraduacao)}${di("Nível Formação",t.tNivelFormacao)}${di("Área",t.tAreaExpertise)}${di("Cursos extras",t.tCursosExtras)}${di("Lattes",t.tLattes)}${di("Registro",t.tRegistro)}${di("CRBio2",t.tCrbio2)}${di("CTF",t.tCtf)}${di("CNH",t.tCnh)}${diF("Exp. Direção",t.tExpDirecao)}
    <div class="detail-section-title">3 · Dados Financeiros</div>
    ${di("Possui CNPJ",t.tPossuiCnpj)}${di("CNPJ",t.tCnpj)}${di("Comprovante",t.tComprovante)}${di("Emissão",t.tEmissao)}${di("Forma Pgto",t.tFormaPgto)}${t.tFormaPgto==="Parcelado"?di("Parcelas",t.tParcelas):""}${diF("Dados Bancários",t.tDadosBancarios)}${di("Disponibilidade",t.tDisponibilidade)}
    <div class="detail-section-title">4 · Emergência</div>
    ${di("Emergência 1",t.tEmerg1Nome?(t.tEmerg1Nome+(t.tEmerg1Tel?" · "+t.tEmerg1Tel:"")):"")}${di("Emergência 2",t.tEmerg2Nome?(t.tEmerg2Nome+(t.tEmerg2Tel?" · "+t.tEmerg2Tel:"")):"")}</div>
    ${t.tProjetosSeteg||t.tOutrasInfo?`<div class="detail-grid"><div class="detail-section-title">5 · Projetos e Informações</div>${diF("Projetos Seteg",t.tProjetosSeteg)}${diF("Outras Informações",t.tOutrasInfo)}</div>`:""}
    <div class="detail-section-title" style="padding:.75rem 0 .5rem;font-size:.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.07em;border-top:1px solid var(--border-color);margin-top:.5rem">Histórico de Edições</div>
    <div class="historico-lista">${histHTML}</div>`;
}
function excluirTerceirizado(id){
  if(!podeExcluir()){mostrarToast("Apenas Gestão pode excluir.","err");return;}
  document.getElementById("excluirId").value=id;document.getElementById("excluirTipo").value="terceirizado";abrirModal("modalExcluir");
}
function renderTerceirizados(){
  const f=STATE.filtros.terceirizados;
  let lista=DB.terceirizados.filter(t=>{const txt=`${t.tNome} ${t.tCpf} ${t.tEmail} ${t.tAreaExpertise} ${t.tTipo}`.toLowerCase();return(!f.tipo||t.tTipo===f.tipo)&&(!f.busca||txt.includes(f.busca));});
  const porPagina=20;const totalPag=Math.max(1,Math.ceil(lista.length/porPagina));if(f.pagina>totalPag)f.pagina=totalPag;
  const ini=(f.pagina-1)*porPagina;const fatia=lista.slice(ini,ini+porPagina);
  const tbody=document.getElementById("tabelaTerceirizados");const empty=document.getElementById("emptyTerc");tbody.innerHTML="";
  fatia.forEach(t=>{tbody.innerHTML+=`<tr><td>${esc(t.tNome)}</td><td>${esc(t.tTipo||"-")}</td><td>${esc(t.tAreaExpertise||"-")}</td><td>${esc(t.tCpf||"-")}</td><td>${esc(t.tEmail||"-")}</td><td>${esc(t.tTelefone||"-")}</td><td>${esc(t.tCnpj||"-")}</td><td class="col-acoes"><div class="table-actions"><button class="btn-icon" title="Visualizar" onclick="verTerceirizado('${t.tId}')">👁</button>${ehGestaoOuGP()?`<button class="btn-icon btn-icon-orange" title="Editar" onclick="editarTerceirizado('${t.tId}')">✎</button>`:""} ${podeExcluir()?`<button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirTerceirizado('${t.tId}')">✕</button>`:""}</div></td></tr>`;});
  empty.classList.toggle("visible",lista.length===0);
  document.getElementById("infoT").textContent=`${lista.length} registros`;
  document.getElementById("pageT").textContent=f.pagina;
  document.getElementById("prevT").disabled=f.pagina<=1;document.getElementById("nextT").disabled=f.pagina>=totalPag;
}

function copiarLinkCadastro() {
  const url = new URL('cadastro.html', window.location.href).href;
  navigator.clipboard.writeText(url)
    .then(() => mostrarToast('Link de cadastro copiado! Envie para o terceirizado.', 'ok'))
    .catch(() => mostrarToast('Copie o link manualmente: ' + url, 'err'));
}

// ══════════════════════════════════════════════════════
//  AVALIAÇÕES
// ══════════════════════════════════════════════════════

// Abre o formulário — se contratoId passado, pré-preenche
function abrirFormAval(contratoId) {
  document.getElementById("formAvalTitulo").textContent = contratoId
    ? "Avaliação do Prestador — Contrato " + contratoId
    : "Nova Avaliação de Prestador";
  document.getElementById("aContrato").value  = contratoId || "";
  document.getElementById("aAvaliador").value = STATE.nomeUsuario;
  document.getElementById("aCliente").value   = "";
  document.getElementById("aProjeto").value   = "";
  document.getElementById("aMotivo").value    = "";
  document.getElementById("aObs").value       = "";
  // Limpar todos os radio buttons do formulário
  document.querySelectorAll('#formAval input[type="radio"]').forEach(r => r.checked = false);

  popularSelectAvaliados();

  if (contratoId) {
    const c = DB.contratos.find(x=>x.id===contratoId);
    if (c) {
      document.getElementById("aProjeto").value = c.cProjeto || c.cEscopo?.substring(0,60) || "";
      document.getElementById("aCliente").value = c.cEmpresaContratante || "";
      if (c.cTerceirizadoId) {
        setTimeout(() => {
          const s = document.getElementById("aAvaliado");
          if (s) s.value = c.cTerceirizadoId;
        }, 50);
      }
    }
  }

  document.getElementById("listaAvaliacoes").classList.add("hidden");
  document.getElementById("formAval").classList.remove("hidden");
}

// Chamado pelo botão ⭐ na linha do contrato
function abrirFormAvalPorContrato(contratoId) {
  if (DB.avaliacoes.find(a=>a.contratoId===contratoId)) {
    mostrarToast("Este contrato já foi avaliado.","err"); return;
  }
  irParaSecao("avaliacoes");
  setTimeout(() => abrirFormAval(contratoId), 80);
}

function fecharFormAval(){
  document.getElementById("formAval").classList.add("hidden");
  document.getElementById("listaAvaliacoes").classList.remove("hidden");
  renderAvaliacoes();
}

function popularSelectAvaliados(){
  const sel=document.getElementById("aAvaliado");
  sel.innerHTML='<option value="">Selecione</option>';
  DB.terceirizados.forEach(t=>{sel.innerHTML+=`<option value="${t.tId}">${esc(t.tNome)}</option>`;});
}

function salvarAvaliacao(){
  const avaliadoSel  = document.getElementById("aAvaliado");
  const contratoId   = document.getElementById("aContrato").value.trim() || null;
  const nivelCampo   = document.querySelector('input[name="aNivelCampo"]:checked')?.value   || "";
  const nivelRelat   = document.querySelector('input[name="aNivelRelatorio"]:checked')?.value || "";
  const prazo        = document.querySelector('input[name="aPrazo"]:checked')?.value         || "";
  const relacionam   = document.querySelector('input[name="aRelacionamento"]:checked')?.value || "";

  const aval = {
    id:             gerarId("AVL"),
    contratoId,
    avaliador:      document.getElementById("aAvaliador").value.trim(),
    avaliadoId:     avaliadoSel.value,
    avaliado:       avaliadoSel.options[avaliadoSel.selectedIndex]?.text || "",
    cliente:        document.getElementById("aCliente").value.trim(),
    projeto:        document.getElementById("aProjeto").value.trim(),
    nivelCampo,
    nivelRelatorio: nivelRelat,
    prazo,
    relacionamento: relacionam,
    motivo:         document.getElementById("aMotivo").value.trim(),
    obs:            document.getElementById("aObs").value.trim(),
    criadoEm:       new Date().toISOString(),
    criadoPor:      STATE.nomeUsuario
  };

  if(!aval.avaliador)      {mostrarToast("Informe seu nome como avaliador (Q1).","err");return;}
  if(!aval.avaliadoId)     {mostrarToast("Selecione o prestador avaliado (Q2).","err");return;}
  if(!aval.nivelCampo)     {mostrarToast("Selecione o nível técnico em campo (Q3).","err");return;}
  if(!aval.nivelRelatorio) {mostrarToast("Selecione o nível técnico do relatório (Q4).","err");return;}
  if(!aval.prazo)          {mostrarToast("Selecione o cumprimento do prazo (Q5).","err");return;}
  if(!aval.relacionamento) {mostrarToast("Selecione a avaliação de relacionamento (Q7).","err");return;}
  if(!aval.cliente)        {mostrarToast("Informe o nome do cliente (Q8).","err");return;}
  if(!aval.projeto)        {mostrarToast("Informe o nome do projeto (Q9).","err");return;}

  DB.avaliacoes.unshift(aval);
  syncAvaliacao(aval);
  registrarAuditoria("Criação","Avaliações",aval.id,"","",`Avaliação de ${aval.avaliado} por ${aval.avaliador}`);
  mostrarToast("Avaliação enviada com sucesso.","ok");
  fecharFormAval();
}

function excluirAvaliacao(id){
  if(!podeExcluir()){mostrarToast("Apenas Gestão pode excluir avaliações.","err");return;}
  document.getElementById("excluirId").value  = id;
  document.getElementById("excluirTipo").value = "avaliacao";
  abrirModal("modalExcluir");
}

function renderAvaliacoes(){
  aplicarPermissoes();
  const em = {Excelente:"st-aprovado",Bom:"st-elaboracao","Intermediário":"st-aguar-gp",Ruim:"st-aguar-gestao","Péssimo":"st-reprovado","Não se aplica":"st-rascunho"};
  const nb  = n => n ? `<span class="status-badge ${em[n]||""}">${esc(n)}</span>` : "-";

  const fa    = STATE.filtros.avaliacoes;
  const ppA   = Number(document.getElementById("perPageAval")?.value || 20);
  const infoA = document.getElementById("infoAval");
  const pgA   = document.getElementById("pageAval");
  const prvA  = document.getElementById("prevAval");
  const nxtA  = document.getElementById("nextAval");

  if (ehGestaoOuGP()) {
    const tbody = document.getElementById("tabelaAvaliacoes");
    const empty = document.getElementById("emptyAval");
    const total = DB.avaliacoes.length;
    const totPag = Math.max(1, Math.ceil(total / ppA));
    if (fa.pagina > totPag) fa.pagina = totPag;
    const ini   = (fa.pagina - 1) * ppA;
    const fatia = DB.avaliacoes.slice(ini, ini + ppA);
    tbody.innerHTML = "";
    fatia.forEach(a=>{
      const ctrLabel = a.contratoId ? `<br><small style="color:var(--text-muted)">${esc(a.contratoId)}</small>` : "";
      tbody.innerHTML += `<tr>
        <td style="white-space:nowrap">${formatarData(a.criadoEm)}</td>
        <td>${esc(a.avaliador)}</td>
        <td>${esc(a.avaliado)}${ctrLabel}</td>
        <td>${esc(a.cliente||"-")}</td>
        <td>${esc(a.projeto||"-")}</td>
        <td>${nb(a.nivelCampo)}</td>
        <td>${nb(a.nivelRelatorio)}</td>
        <td><span class="status-badge ${a.prazo==="Totalmente"?"st-aprovado":a.prazo==="Não cumprido"?"st-reprovado":"st-aguar-gp"}">${esc(a.prazo||"-")}</span></td>
        <td>${nb(a.relacionamento)}</td>
        <td class="col-acoes"><div class="table-actions"><button class="btn-icon" title="Visualizar" onclick="verDetalhesAvaliacao('${a.id}')">👁</button>${podeExcluir()?`<button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirAvaliacao('${a.id}')">✕</button>`:""}</div></td>
      </tr>`;
    });
    empty.classList.toggle("visible", total===0);
    if (infoA) infoA.textContent = total ? `${ini+1}–${Math.min(ini+ppA,total)} de ${total}` : "0 registros";
    if (pgA)   pgA.textContent   = fa.pagina;
    if (prvA)  prvA.disabled     = fa.pagina <= 1;
    if (nxtA)  nxtA.disabled     = fa.pagina >= totPag;
    return;
  }

  // Vista Solicitante — apenas as suas, sem notas
  const minhas  = DB.avaliacoes.filter(a => a.criadoPor === STATE.nomeUsuario);
  const totPagS = Math.max(1, Math.ceil(minhas.length / ppA));
  if (fa.pagina > totPagS) fa.pagina = totPagS;
  const iniS    = (fa.pagina - 1) * ppA;
  const fatiaS  = minhas.slice(iniS, iniS + ppA);
  const tbody2  = document.getElementById("tabelaAvalSolicitante");
  const empty2  = document.getElementById("emptyAvalSolicitante");
  tbody2.innerHTML = "";
  fatiaS.forEach(a=>{
    const ctr = a.contratoId ? `<span style="color:var(--blue-light)">${esc(a.contratoId)}</span>` : "—";
    tbody2.innerHTML += `<tr>
      <td style="white-space:nowrap">${formatarData(a.criadoEm)}</td>
      <td>${ctr}</td>
      <td>${esc(a.avaliado)}</td>
      <td><span class="status-badge st-aprovado">✓ Avaliação enviada</span></td>
    </tr>`;
  });
  empty2.classList.toggle("visible", minhas.length===0);
  if (infoA) infoA.textContent = minhas.length ? `${iniS+1}–${Math.min(iniS+ppA,minhas.length)} de ${minhas.length}` : "0 registros";
  if (pgA)   pgA.textContent   = fa.pagina;
  if (prvA)  prvA.disabled     = fa.pagina <= 1;
  if (nxtA)  nxtA.disabled     = fa.pagina >= totPagS;
}

// ══════════════════════════════════════════════════════
//  ALERTAS
// ══════════════════════════════════════════════════════
function gerarAlertas(){
  const base = STATE.perfil==="solicitante"
    ? DB.contratos.filter(c=>c.criadoPor===STATE.nomeUsuario)
    : DB.contratos;
  return base
    .map(c => { const dias=diasAteVencer(c.cDataFim); return {titulo:`Contrato ${c.id} · ${c.cTercNome||c.cRazaoSocial}`,desc:"Vencimento do contrato",dias,tipo:dias<=7?"critico":dias<=15?"atencao":"aviso"}; })
    .filter(a => a.dias!==null && a.dias<=30)
    .sort((a,b)=>a.dias-b.dias);
}

function renderAlertas(){
  const alertas=gerarAlertas();
  const badge=document.getElementById("badgeAlertas");badge.textContent=alertas.length;badge.classList.toggle("hidden",alertas.length===0);
  const el=document.getElementById("listaAlertas");
  if(!alertas.length){el.innerHTML=`<div class="alertas-empty">✅ Nenhum vencimento próximo nos próximos 30 dias.</div>`;return;}
  el.innerHTML=alertas.map(a=>{const dl=a.dias<0?`Vencido há ${Math.abs(a.dias)} dia(s)`:a.dias===0?"Vence hoje!":`Vence em ${a.dias} dia(s)`;return`<div class="alerta-card alerta-${a.tipo}"><div class="alerta-titulo">${esc(a.titulo)}</div><div class="alerta-desc">${esc(a.desc)}</div><div class="alerta-meta">${dl}</div></div>`;}).join("");
}

// ══════════════════════════════════════════════════════
//  AUDITORIA
// ══════════════════════════════════════════════════════
function registrarAuditoria(acao,modulo,registroId,statusAnt,statusNovo,detalhe){
  const entry={id:gerarId("AUD"),data:new Date().toISOString(),usuario:STATE.nomeUsuario,perfil:STATE.perfil,acao,modulo,registroId:String(registroId),statusAnt:String(statusAnt),statusNovo:String(statusNovo),detalhe:String(detalhe).substring(0,200)};
  DB.auditoria.unshift(entry);
  if(DB.auditoria.length>500)DB.auditoria=DB.auditoria.slice(0,500);
  syncAuditoria(entry);
}

// ══════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════
function gerarId(prefixo){
  const mapa={CTR:"contratos",TER:"terceirizados",AVL:"avaliacoes",AUD:"auditoria"};
  const arr=DB[mapa[prefixo]]||[];
  const max=arr.length?Math.max(...arr.map(x=>parseInt(String(x.id||x.tId||"0").replace(/\D/g,""))||0)):0;
  return`${prefixo}-${String(max+1).padStart(4,"0")}`;
}
function coletarCampos(campos){const obj={};campos.forEach(c=>{const el=document.getElementById(c);if(el)obj[c]=el.value?el.value.trim():"";});return obj;}
function toggleCondicional(selectId,valorAlvo,grupoId){const sel=document.getElementById(selectId);const grp=document.getElementById(grupoId);if(!sel||!grp)return;grp.classList.toggle("hidden",sel.value!==valorAlvo);}
function toggleParcelasGrupo(radioName,grupoId){const grp=document.getElementById(grupoId);if(!grp)return;const marcado=document.querySelector(`input[name="${radioName}"]:checked`)?.value==="Parcelado";grp.style.display=marcado?"":"none";}
function diasAteVencer(dataStr){if(!dataStr)return null;const h=new Date();h.setHours(0,0,0,0);const f=new Date(dataStr+"T00:00:00");return Math.round((f-h)/86400000);}
function formatarData(data){if(!data)return"-";const d=data.length>10?new Date(data):new Date(data+"T00:00:00");if(isNaN(d))return"-";return d.toLocaleDateString("pt-BR");}
function formatarDataHora(data){if(!data)return"-";const d=new Date(data);if(isNaN(d))return"-";return d.toLocaleString("pt-BR");}
function formatarMoeda(valor){const v=parseFloat(String(valor||"0").replace(/\./g,"").replace(",","."))||0;return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function statusBadge(status){const cls=STATUS_CLASS[status]||"st-rascunho";return`<span class="status-badge ${cls}">${esc(status||"-")}</span>`;}
function esc(str){return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function abrirModal(id){document.getElementById(id).classList.add("active");}
function fecharModal(id){document.getElementById(id).classList.remove("active");}
function mostrarToast(msg,tipo){const t=document.getElementById("toast");t.textContent=msg;t.className="toast show"+(tipo==="ok"?" toast-ok":tipo==="err"?" toast-err":"");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),3400);}
function mascaraCnpjId(id){const el=document.getElementById(id);if(!el)return;let v=el.value.replace(/\D/g,"").slice(0,14);v=v.replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d)/,"$1-$2");el.value=v;}
function mascaraCpfId(id){const el=document.getElementById(id);if(!el)return;let v=el.value.replace(/\D/g,"").slice(0,11);v=v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");el.value=v;}
function mascaraTelId(id){const el=document.getElementById(id);if(!el)return;let v=el.value.replace(/\D/g,"").slice(0,11);if(v.length<=10)v=v.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3");else v=v.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3");el.value=v;}
function mascaraMoedaId(id){
  const el=document.getElementById(id); if(!el) return;
  const v=el.value.replace(/[^\d,]/g,"");
  const partes=v.split(",");
  let inteiro=partes[0].replace(/^0+(?=\d)/,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  const decimal=partes.length>1?","+partes[1].slice(0,2):"";
  el.value=inteiro+decimal;
}

// ══════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════
applyTheme(localStorage.getItem('secter_theme') || 'dark');
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
initLoginEvents();
init();
