'use strict';
// Interfaz para la API Flask existente: /health, /register, /login,
// /logout, /elecciones, /vote y /results/<eleccion_id>.
// Usa cookies de sesión del mismo origen; no almacena credenciales.
const $ = (id) => document.getElementById(id);
const state = { mode: 'login', elections: [], election: null, selectedCandidate: null, busy: false };

function notify(message, type = 'info') {
  const node = $('notice');
  node.hidden = !message;
  node.className = `notice ${type}`;
  node.textContent = message || '';
  if (message) node.scrollIntoView({block: 'nearest', behavior: 'smooth'});
}
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function failText(body, status) {
  if (body && typeof body === 'object') return body.error || body.message || body.detail || body.mensaje || `La petición falló (HTTP ${status}).`;
  return `La petición falló (HTTP ${status}).`;
}
async function api(path, method = 'GET', payload) {
  const options = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (payload !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('json')) {
    try { data = await response.json(); } catch { /* Respuesta vacía o incorrecta. */ }
  } else {
    const raw = await response.text();
    if (raw && !response.ok) data = {error: `El servidor devolvió HTTP ${response.status}.`};
  }
  if (!response.ok) {
    const err = new Error(failText(data, response.status));
    err.status = response.status;
    throw err;
  }
  return data;
}
function showLogin(mode) {
  state.mode = mode;
  const register = mode === 'register';
  $('tab-login').classList.toggle('active', !register);
  $('tab-register').classList.toggle('active', register);
  $('tab-login').setAttribute('aria-selected', String(!register));
  $('tab-register').setAttribute('aria-selected', String(register));
  $('name-field').hidden = !register;
  $('name').required = register;
  $('form-title').textContent = register ? 'Crea tu cuenta' : '¡Qué bueno verte!';
  $('form-desc').textContent = register ? 'Registra un usuario de prueba para participar.' : 'Inicia sesión para participar en la elección.';
  $('auth-submit-text').textContent = register ? 'Registrarme y acceder' : 'Ingresar al sistema';
  $('password').setAttribute('autocomplete', register ? 'new-password' : 'current-password');
  notify('');
}
function setBusy(busy) {
  state.busy = busy;
  $('auth-submit').disabled = busy;
  $('auth-submit-text').textContent = busy ? 'Procesando...' : (state.mode === 'register' ? 'Registrarme y acceder' : 'Ingresar al sistema');
}
function showDashboard(on) {
  $('auth-view').hidden = on;
  $('dashboard-view').hidden = !on;
  $('panel-subtitle').textContent = on ? 'Tu información se actualiza desde el servidor Flask.' : 'Ingresa con tu cuenta para consultar las elecciones.';
}
function normalizeElections(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.elecciones)) return data.elecciones;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && typeof data === 'object' && data.id != null) return [data];
  return [];
}
function formatDate(value) {
  if (!value) return null;
  const date = new Date(value.endsWith?.('Z') || value.includes('+') ? value : value + 'Z');
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', {day:'2-digit', month:'short', year:'numeric'});
}
async function loadElections({silent = false} = {}) {
  try {
    const data = await api('/elecciones');
    state.elections = normalizeElections(data);
    showDashboard(true);
    if (state.elections.length === 0) {
      $('election-content').replaceChildren(make('p','empty-state','No se encontraron elecciones disponibles.'));
      $('results-content').replaceChildren(make('p','empty-state','Cuando exista una elección aparecerán aquí sus resultados.'));
      return;
    }
    const matched = state.elections.find(e => String(e.id) === String(state.election?.id));
    state.election = matched || state.elections[0];
    renderElection();
    await loadResults();
    if (!silent) notify('Elecciones cargadas correctamente.', 'success');
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      showDashboard(false);
      if (!silent) notify('Inicia sesión para acceder a las elecciones.', 'error');
    } else {
      notify(`No fue posible cargar las elecciones: ${err.message}`, 'error');
    }
  }
}
function renderElection() {
  const item = state.election;
  if (!item) return;
  const parent = $('election-content'); parent.replaceChildren();
  $('election-status').textContent = item.activa ? '● Activa' : '● No activa';
  $('election-status').classList.toggle('inactive', !item.activa);
  parent.append(make('h3','election-heading', item.nombre || `Elección ${item.id}`));
  parent.append(make('p','election-description',item.descripcion || 'Selecciona tu opción preferida.'));
  const dates = make('div','date-line');
  const start = formatDate(item.fecha_inicio), end = formatDate(item.fecha_fin);
  if (start) dates.append(make('span', null, `Inicio: ${start}`));
  if (end) dates.append(make('span', null, `Finaliza: ${end}`));
  parent.append(dates);
  const list = make('div','candidate-list');
  const candidates = Array.isArray(item.candidatos) ? item.candidatos : [];
  if (!candidates.length) list.append(make('p','empty-state','Esta elección aún no tiene candidatos disponibles.'));
  for (const candidate of candidates) {
    const label = make('label','candidate');
    const input = make('input'); input.type='radio'; input.name='candidate'; input.value=String(candidate.id);
    input.disabled = !item.activa;
    input.checked = String(state.selectedCandidate) === String(candidate.id);
    if (input.checked) label.classList.add('selected');
    input.addEventListener('change', () => {state.selectedCandidate = candidate.id; renderElection();});
    const initials = (candidate.nombre || '?').split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const avatar = make('span','avatar',initials);
    const details=make('div');details.append(make('strong',null,candidate.nombre || `Candidato ${candidate.id}`));
    if (candidate.propuesta) details.append(make('p',null,candidate.propuesta));
    label.append(input, avatar, details);list.append(label);
  }
  parent.append(list);
  const vote = make('button','primary-btn vote-btn');vote.type='button';vote.disabled = !item.activa || !candidates.length;
  vote.append(make('span',null,'Confirmar mi voto'),make('span',null,'↗'));
  vote.addEventListener('click',submitVote);
  parent.append(vote);
  parent.append(make('p','hint','Puedes votar una sola vez por elección. Para cambiar de usuario, cierra sesión.'));
  if(state.elections.length>1) {
    const select=make('select','switch-election');select.setAttribute('aria-label','Elegir elección');
    state.elections.forEach(e=>{const option=make('option',null,e.nombre || `Elección ${e.id}`);option.value=e.id;option.selected=String(e.id)===String(item.id);select.append(option);});
    select.addEventListener('change',()=>{state.election=state.elections.find(e=>String(e.id)===select.value);state.selectedCandidate=null;renderElection();loadResults();});
    parent.append(select);
  }
}
async function loadResults() {
  if (!state.election) return;
  const parent=$('results-content'); parent.replaceChildren(make('p','empty-state','Consultando resultados...'));
  try {
    const data=await api(`/results/${encodeURIComponent(state.election.id)}`);
    const rows = Array.isArray(data?.resultados) ? data.resultados : (Array.isArray(data)?data:[]);
    parent.replaceChildren();
    if (!rows.length) {parent.append(make('p','empty-state','Todavía no hay resultados disponibles.'));return;}
    const sum = rows.reduce((total,row)=>total+(Number(row.votos)||0),0);
    const list=make('div','results-list');
    rows.forEach(row=>{
      const count=Math.max(0,Number(row.votos)||0);const pct=sum ? Math.round(count/sum*100):0;
      const entry=make('div','result-entry'),top=make('div','result-top');
      top.append(make('span',null,row.candidato || row.nombre || 'Candidato'),make('b',null,`${count} · ${pct}%`));
      const track=make('div','progress-track'),bar=make('div','progress-bar');
      bar.style.width=`${pct}%`;bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuenow',String(pct));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
      track.append(bar);entry.append(top,track);list.append(entry);
    });
    const total=make('div','results-total');total.append(make('span',null,'Votos registrados'),make('strong',null,sum));
    parent.append(list,total);
  } catch(err) {parent.replaceChildren(make('p','empty-state',`No fue posible consultar resultados: ${err.message}`));}
}
async function submitVote() {
  if (!state.selectedCandidate) {notify('Selecciona un candidato para continuar.','error');return;}
  if (!state.election) return;
  const candidate=state.election.candidatos?.find(c=>String(c.id)===String(state.selectedCandidate));
  if (!window.confirm(`¿Confirmas tu voto por ${candidate?.nombre || 'el candidato seleccionado'}? Esta acción no se puede deshacer.`)) return;
  const voteButton=document.querySelector('.vote-btn'); if(voteButton) voteButton.disabled=true;
  try {
    await api('/vote','POST',{eleccion_id:state.election.id,candidato_id:Number(state.selectedCandidate)});
    notify('¡Tu voto fue registrado! Consulta los resultados actualizados.','success');
    await loadResults();
  } catch(err) {
    notify(err.status===409 ? 'Ya registraste un voto en esta elección. No puedes votar dos veces.' : `No se pudo registrar el voto: ${err.message}`,'error');
  } finally {if(voteButton)voteButton.disabled=false;}
}
async function submitAuth(event) {
  event.preventDefault(); if(state.busy)return;
  const nombre=$('name').value.trim(),correo=$('email').value.trim(),password=$('password').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){notify('Escribe un correo electrónico válido.','error');return;}
  if(password.length<6){notify('La contraseña debe tener al menos seis caracteres.','error');return;}
  if(state.mode==='register' && nombre.length<2){notify('Escribe tu nombre completo.','error');return;}
  setBusy(true);
  try {
    if(state.mode==='register') await api('/register','POST',{nombre,correo,password});
    await api('/login','POST',{correo,password});
    $('password').value='';notify('¡Sesión iniciada correctamente!','success');
    await loadElections({silent:true});
  } catch(err) {notify(`No se pudo ${state.mode==='register'?'registrar o iniciar sesión':'iniciar sesión'}: ${err.message}`,'error');}
  finally {setBusy(false);}
}
async function logout() {
  try {await api('/logout','POST');}
  catch(err) {if(err.status!==401)notify(`No fue posible cerrar sesión: ${err.message}`,'error');}
  state.election=null;state.elections=[];state.selectedCandidate=null;showDashboard(false);
  $('email').value='';$('password').value='';showLogin('login');notify('Sesión cerrada.','success');
}
async function init() {
  $('auth-form').addEventListener('submit',submitAuth);
  $('tab-login').addEventListener('click',()=>showLogin('login'));
  $('tab-register').addEventListener('click',()=>showLogin('register'));
  $('refresh-btn').addEventListener('click',()=>loadElections());
  $('logout-btn').addEventListener('click',logout);
  try {await api('/health');$('server-pill').innerHTML='<span class="pulse-dot"></span> API disponible';}
  catch {$('server-pill').classList.add('offline');$('server-pill').innerHTML='<span class="pulse-dot"></span> API no disponible';}
  await loadElections({silent:true});
}
document.addEventListener('DOMContentLoaded',init);
