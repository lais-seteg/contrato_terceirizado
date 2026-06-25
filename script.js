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
  "cTercGraduacao","cTercNivelFormacao","cTercAreaExpertise","cTercRegistro",
  "cTercCrbio2","cTercCtf","cTercLattes","cTercCnh","cTercCursosExtras",
  "cTercComprovante","cTercCnpj","cTercEmissao","cTercFormaPgto","cDadosPagamento",
  "cTercDisponibilidade","cTercEmerg1Nome","cTercEmerg1Tel","cTercEmerg2Nome","cTercEmerg2Tel",
  "cTercProjetosSeteg",
  "cRespNome","cRespSetor","cRespCargo","cRespEmail","cRespDiretoria",
  "cOutrasInfo","cObsGP","cObsGestao"
];

const CAMPOS_TERC = [
  "tId","tNome","tTipo","tEmail","tCpf","tRg","tNascimento","tTelefone","tEstado",
  "tCidade","tEndereco","tGraduacao","tNivelFormacao","tAreaExpertise","tCursosExtras",
  "tLattes","tRegistro","tCrbio2","tCtf","tCnh","tExpDirecao","tPossuiCnpj","tCnpj",
  "tComprovante","tEmissao","tFormaPgto","tDadosBancarios","tEmerg1Nome","tEmerg1Tel",
  "tEmerg2Nome","tEmerg2Tel","tProjetosSeteg","tDisponibilidade","tOutrasInfo"
];

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
  document.getElementById("buscaAudit").addEventListener("input", () => { STATE.filtros.auditoria.busca=document.getElementById("buscaAudit").value.toLowerCase(); STATE.filtros.auditoria.pagina=1; renderAuditoria(); });
  document.getElementById("prevAudit").addEventListener("click", () => { STATE.filtros.auditoria.pagina--; renderAuditoria(); });
  document.getElementById("nextAudit").addEventListener("click", () => { STATE.filtros.auditoria.pagina++; renderAuditoria(); });
  document.getElementById("perPageAudit").addEventListener("change", () => { STATE.filtros.auditoria.pagina=1; renderAuditoria(); });
  document.getElementById("prevAval").addEventListener("click", () => { STATE.filtros.avaliacoes.pagina--; renderAvaliacoes(); });
  document.getElementById("nextAval").addEventListener("click", () => { STATE.filtros.avaliacoes.pagina++; renderAvaliacoes(); });
  document.getElementById("perPageAval").addEventListener("change", () => { STATE.filtros.avaliacoes.pagina=1; renderAvaliacoes(); });

  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => { if (e.target===m) m.classList.remove("active"); });
  });
  document.addEventListener("keydown", e => {
    if (e.key==="Escape") document.querySelectorAll(".modal-overlay").forEach(m=>m.classList.remove("active"));
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
  document.getElementById("tabAuditoria").classList.toggle("hidden", p !== "gestao");
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
    case "auditoria":     renderAuditoria();     break;
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
    const acoes = [`<button class="btn-icon" title="Visualizar" onclick="verDetalhesContrato('${c.id}')">◉</button>`];
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
  const map = {
    tNome:"cTercNome",tEmail:"cTercEmail",tCpf:"cTercCpf",tRg:"cTercRg",tNascimento:"cTercNascimento",
    tTipo:"cTercFuncao",tTelefone:"cTercTelefone",tEstado:"cTercEstado",tCidade:"cTercMunicipio",
    tEndereco:"cTercEndereco",tGraduacao:"cTercGraduacao",tNivelFormacao:"cTercNivelFormacao",
    tAreaExpertise:"cTercAreaExpertise",tRegistro:"cTercRegistro",tCrbio2:"cTercCrbio2",
    tCtf:"cTercCtf",tLattes:"cTercLattes",tCnh:"cTercCnh",tCursosExtras:"cTercCursosExtras",
    tComprovante:"cTercComprovante",tCnpj:"cTercCnpj",tEmissao:"cTercEmissao",
    tFormaPgto:"cTercFormaPgto",tDadosBancarios:"cDadosPagamento",tDisponibilidade:"cTercDisponibilidade",
    tEmerg1Nome:"cTercEmerg1Nome",tEmerg1Tel:"cTercEmerg1Tel",
    tEmerg2Nome:"cTercEmerg2Nome",tEmerg2Tel:"cTercEmerg2Tel",tProjetosSeteg:"cTercProjetosSeteg"
  };
  Object.entries(map).forEach(([src,dst]) => { const el=document.getElementById(dst); if(el&&t[src]) el.value=t[src]; });
}

function atualizarSecaoTerceirizado() {
  const tipo = document.getElementById("cTipoContratacao").value;
  document.getElementById("secaoCTercDespachante").classList.toggle("hidden", tipo !== "Despachante");
  document.getElementById("secaoCTercAuxiliar").classList.toggle("hidden", tipo !== "Auxiliar de campo");
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
}

function lerCamposAuxiliar(item) {
  const v = id => (document.getElementById(id)?.value||"").trim();
  item.cTercNome          = v("auxNome");
  item.cTercGraduacao     = v("auxGraduacao");
  item.cTercEmail         = v("auxEmail");
  item.cTercTelefone      = v("auxTelefone");
  item.cTercNascimento    = v("auxNascimento");
  item.cTercEndereco      = v("auxEndereco");
  item.cTercMunicipio     = v("auxCidade");
  item.cTercEstado        = "";
  item.cTercFuncao        = "Auxiliar de campo";
  item.cDadosPagamento    = v("auxDadosBancarios");
  item.cTercEmerg1Nome    = v("auxEmerg1Nome");
  item.cTercEmerg1Tel     = v("auxEmerg1Tel");
  item.cTercEmerg2Nome    = v("auxEmerg2Nome");
  item.cTercEmerg2Tel     = v("auxEmerg2Tel");
  item.cTercProjetosSeteg = v("auxProjetosSeteg");
  item.cTercAreaExpertise = document.querySelector('input[name="auxAreaAfinidade"]:checked')?.value || "";
  item.cTercComprovante   = document.querySelector('input[name="auxComprovante"]:checked')?.value  || "";
  item.cTercEmissao       = document.querySelector('input[name="auxEmissao"]:checked')?.value      || "";
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
  else if (item.cTipoContratacao === "Auxiliar de campo") lerCamposAuxiliar(item);
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
  return null;
}

function editarContrato(id) {
  const item = DB.contratos.find(c=>c.id===id);
  if (!item) return;
  if (!podeEditar(item)) { mostrarToast("Sem permissão para editar.","err"); return; }
  limparFormContrato();
  document.getElementById("formContratoTitulo").textContent = "Editar Contrato · " + item.id;
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
  else if (item.cTipoContratacao === "Auxiliar de campo") preencherCamposAuxiliar(item);
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
    ${det("Objeto",item.cObjeto)}${det("Início",formatarData(item.cDataInicio))}${det("Término",formatarData(item.cDataFim))}${det("Valor Total",item.cValorTotal?"R$ "+item.cValorTotal:"-")}
    ${det("Escopo",item.cEscopo,"full")}
    <div class="detail-section-title">C · Terceirizado / Prestador</div>
    ${det("Nome",item.cTercNome)}${det("E-mail",item.cTercEmail)}${det("CPF",item.cTercCpf)}${det("Função",item.cTercFuncao)}
    ${det("Telefone",item.cTercTelefone)}${det("Área",item.cTercAreaExpertise)}${det("Emissão",item.cTercEmissao)}${det("Forma Pgto",item.cTercFormaPgto)}
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
      <td style="color:var(--green)">${c.cValorTotal?"R$ "+c.cValorTotal:"-"}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="col-acoes"><div class="table-actions">
        <button class="btn-icon" title="Visualizar" onclick="verDetalhesContrato('${c.id}')">◉</button>
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
  else if (item.cTipoContratacao === "Auxiliar de campo") lerCamposAuxiliar(item);
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
        <div class="pf"><div class="pfl">Valor Total</div><div class="pfv">${item.cValorTotal?"R$ "+item.cValorTotal:"-"}</div></div>
        <div class="pf pfw"><div class="pfl">Escopo</div><div class="pfv">${esc(item.cEscopo||"-")}</div></div>
      </div></div>
      <div class="ps"><div class="psh">C · Terceirizado / Prestador</div><div class="pg">
        <div class="pf"><div class="pfl">Nome</div><div class="pfv">${esc(item.cTercNome||"-")}</div></div>
        <div class="pf"><div class="pfl">Função</div><div class="pfv">${esc(item.cTercFuncao||"-")}</div></div>
        <div class="pf"><div class="pfl">Emissão de</div><div class="pfv">${esc(item.cTercEmissao||"-")}</div></div>
        <div class="pf"><div class="pfl">Forma de Pagamento</div><div class="pfv">${esc(item.cTercFormaPgto||"-")}</div></div>
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
function limparFormTerc(){document.getElementById("tercForm").reset();document.getElementById("tId").value="";document.getElementById("grpCnpjTerc").classList.add("hidden");}
function salvarTerceirizado(){
  const item=coletarCampos(CAMPOS_TERC);item.tId=item.tId||gerarId("TER");
  if(!item.tNome){mostrarToast("Informe o nome.","err");return;}
  if(!item.tTipo){mostrarToast("Informe o tipo.","err");return;}
  if(!item.tEmail){mostrarToast("Informe o e-mail.","err");return;}
  if(!item.tCpf){mostrarToast("Informe o CPF.","err");return;}
  if(!item.tTelefone){mostrarToast("Informe o telefone.","err");return;}
  const idx=DB.terceirizados.findIndex(t=>t.tId===item.tId);
  if(idx>=0){DB.terceirizados[idx]={...DB.terceirizados[idx],...item,atualizadoEm:new Date().toISOString()};registrarAuditoria("Edição","Terceirizados",item.tId,"","",item.tNome);syncTerceirizado(DB.terceirizados[idx]);mostrarToast("Atualizado.","ok");}
  else{item.criadoEm=new Date().toISOString();item.criadoPor=STATE.nomeUsuario;DB.terceirizados.unshift(item);registrarAuditoria("Criação","Terceirizados",item.tId,"","",item.tNome);syncTerceirizado(item);mostrarToast("Cadastrado.","ok");}
  fecharFormTerc();
}
function editarTerceirizado(id){
  const item=DB.terceirizados.find(t=>t.tId===id);if(!item)return;
  limparFormTerc();document.getElementById("formTercTitulo").textContent="Editar Terceirizado";
  CAMPOS_TERC.forEach(campo=>{const el=document.getElementById(campo);if(el)el.value=item[campo]||"";});
  toggleCondicional("tPossuiCnpj","Sim","grpCnpjTerc");
  document.getElementById("listaTerceirizados").classList.add("hidden");document.getElementById("formTerc").classList.remove("hidden");
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
  fatia.forEach(t=>{tbody.innerHTML+=`<tr><td>${esc(t.tNome)}</td><td>${esc(t.tTipo||"-")}</td><td>${esc(t.tAreaExpertise||"-")}</td><td>${esc(t.tCpf||"-")}</td><td>${esc(t.tEmail||"-")}</td><td>${esc(t.tTelefone||"-")}</td><td>${esc(t.tCnpj||"-")}</td><td class="col-acoes"><div class="table-actions"><button class="btn-icon btn-icon-orange" onclick="editarTerceirizado('${t.tId}')">✎</button>${podeExcluir()?`<button class="btn-icon btn-icon-danger" onclick="excluirTerceirizado('${t.tId}')">✕</button>`:""}</div></td></tr>`;});
  empty.classList.toggle("visible",lista.length===0);
  document.getElementById("infoT").textContent=`${lista.length} registros`;
  document.getElementById("pageT").textContent=f.pagina;
  document.getElementById("prevT").disabled=f.pagina<=1;document.getElementById("nextT").disabled=f.pagina>=totalPag;
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
        <td class="col-acoes"><div class="table-actions">${podeExcluir()?`<button class="btn-icon btn-icon-danger" onclick="excluirAvaliacao('${a.id}')">✕</button>`:""}</div></td>
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
function renderAuditoria(){
  const fu=STATE.filtros.auditoria;
  const busca=fu.busca;
  let lista=DB.auditoria.filter(a=>!busca||`${a.acao} ${a.modulo} ${a.usuario} ${a.registroId} ${a.detalhe}`.toLowerCase().includes(busca));
  const ppU  = Number(document.getElementById("perPageAudit")?.value || 20);
  const totU = lista.length;
  const totPag=Math.max(1,Math.ceil(totU/ppU));
  if(fu.pagina>totPag)fu.pagina=totPag;
  const iniU=(fu.pagina-1)*ppU;
  const fatia=lista.slice(iniU,iniU+ppU);
  document.getElementById("auditoriaTotal").textContent=`${totU} registros`;
  const tbody=document.getElementById("tabelaAuditoria");
  const empty=document.getElementById("emptyAudit");
  tbody.innerHTML="";
  fatia.forEach(a=>{tbody.innerHTML+=`<tr><td style="white-space:nowrap">${formatarDataHora(a.data)}</td><td>${esc(a.usuario)}</td><td><span class="status-badge ${a.perfil==="gestao"?"st-aprovado":a.perfil==="gestao-pessoas"?"st-elaboracao":"st-rascunho"}">${esc(a.perfil)}</span></td><td>${esc(a.acao)}</td><td>${esc(a.modulo)}</td><td style="color:var(--blue-light)">${esc(a.registroId)}</td><td>${a.statusAnt?statusBadge(a.statusAnt):"-"}</td><td>${a.statusNovo?statusBadge(a.statusNovo):"-"}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(a.detalhe)}">${esc(a.detalhe||"-")}</td></tr>`;});
  empty.classList.toggle("visible",lista.length===0);
  const infoU=document.getElementById("infoAudit");
  const pgU  =document.getElementById("pageAudit");
  const prvU =document.getElementById("prevAudit");
  const nxtU =document.getElementById("nextAudit");
  if(infoU)infoU.textContent=totU?`${iniU+1}–${Math.min(iniU+ppU,totU)} de ${totU}`:"0 registros";
  if(pgU)  pgU.textContent  =fu.pagina;
  if(prvU) prvU.disabled    =fu.pagina<=1;
  if(nxtU) nxtU.disabled    =fu.pagina>=totPag;
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

// ══════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════
applyTheme(localStorage.getItem('secter_theme') || 'dark');
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
initLoginEvents();
init();
