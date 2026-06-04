import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_KEY = 'diario-exploradores-tarefas';
const MAX_PHOTOS = 3;
const STORAGE_BUCKET = 'images';
const authSection = document.getElementById('auth');
const appSection = document.getElementById('app');
const signinForm = document.getElementById('signin-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup');
const signinBtn = document.getElementById('signin');
const signoutHeaderBtn = document.getElementById('signout-header');
const userInfoHeader = document.getElementById('user-email-header');
const userEmail = document.getElementById('user-email');
const networkStatus = document.getElementById('network-status');
const syncButton = document.getElementById('sync-button');
const resetCacheBtn = document.getElementById('reset-cache');
const tabs = Array.from(document.querySelectorAll('.tab'));
const registroPanel = document.getElementById('registro-panel');
const listaPanel = document.getElementById('lista-panel');
const dashboardPanel = document.getElementById('dashboard-panel');
const favoritosPanel = document.getElementById('favoritos-panel');
const searchInput = document.getElementById('search');
const filterRaridade = document.getElementById('filter-raridade');
const showFavorites = document.getElementById('show-favorites');
const notesList = document.getElementById('notes');
const favoritesList = document.getElementById('favorites');
const photoInput = document.getElementById('fotos');
const photoPreview = document.getElementById('photo-preview');
const titleInput = document.getElementById('titulo');
const descricaoInput = document.getElementById('descricao');
const categoriaInput = document.getElementById('categoria');
const raridadeSelect = document.getElementById('raridade');
const noteForm = document.getElementById('note-form');
const nextStepBtn = document.getElementById('next-step');
const prevStepBtn = document.getElementById('prev-step');
const saveBtn = document.getElementById('save');
const stepPills = Array.from(document.querySelectorAll('.step-pill'));
const stepPanes = Array.from(document.querySelectorAll('.step-pane'));
let currentStep = 1;
let currentUserData = null;
let authRequestInFlight = false;
let authCooldown = false;
const totalCount = document.getElementById('total-count');
const comumCount = document.getElementById('comum-count');
const raraCount = document.getElementById('rara-count');
const muitoRaraCount = document.getElementById('muito-rara-count');
const syncCount = document.getElementById('sync-count');
const messageContainer = document.getElementById('message-container');
let localTasks = [];
function getLocalTasks(){
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function setLocalTasks(tasks){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localTasks = tasks;
}
function currentUser(){
  return currentUserData;
}
function clearMessage(){
  messageContainer.innerHTML = '';
}
function showMessage(message, type = 'error', duration = 5000){
  clearMessage();
  const card = document.createElement('div');
  card.className = `message-box ${type}`;
  card.textContent = message;
  messageContainer.appendChild(card);
  if(duration > 0){
    setTimeout(clearMessage, duration);
  }
}
async function createWelcomeTask(user){
  if(!user) return;
  const tasks = normalizeTasks(getLocalTasks()).filter(task => task.usuario_id === user.id);
  if(tasks.length > 0) return;
  const task = {
    id: `welcome-${Date.now()}`,
    usuario_id: user.id,
    titulo: 'Primeira descoberta no Diário de Bordo',
    descricao: 'Bem-vindo! Este é seu primeiro registro. Adicione fotos e detalhes para testar a sincronização.',
    categoria: 'Introdução',
    raridade: 'Comum',
    favorito: false,
    fotos: [],
    criado_em: new Date().toISOString(),
    sincronizado: navigator.onLine
  };
  saveLocalTask(task);
  if(navigator.onLine){
    await syncPending();
  }
  showMessage('Bem-vindo! Um registro inicial foi criado e será sincronizado.', 'success', 6000);
}
async function refreshSession(){
  updateNetworkStatus();
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Erro ao obter sessão Supabase:', error.message);
      const refreshError = /refresh_token|invalid_grant|token/i.test(error.message || '') || error.status === 400;
      if (refreshError) {
        await supabase.auth.signOut();
        currentUserData = null;
      } else {
        currentUserData = data?.session?.user || null;
      }
    } else {
      currentUserData = data?.session?.user || null;
    }
  } catch (err) {
    console.warn('Falha ao recuperar sessão Supabase:', err);
    currentUserData = null;
  }

  setUserState(currentUserData);
  if (currentUserData){
    await createWelcomeTask(currentUserData);
  }
  localTasks = normalizeTasks(getLocalTasks());
  render();
}

// Garante que exista um registro de perfil para o usuário autenticado
async function ensureUserProfile(user){
  if(!user || !user.id) return;
  try{
    const profile = {
      id: user.id,
      email: user.email || null,
      nome: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null
    };
    // upsert para criar ou atualizar o perfil; 'returning: minimal' evita payloads grandes
    const { error } = await supabase.from('usuarios').upsert([profile], { returning: 'minimal' });
    if(error) console.warn('Erro ao gravar perfil de usuário:', error);
  }catch(err){
    console.warn('ensureUserProfile erro:', err);
  }
}
function updateNetworkStatus(){
  const online = navigator.onLine;
  networkStatus.textContent = online ? 'Online' : 'Offline';
  networkStatus.className = online ? 'status online' : 'status offline';
}
function validateAuthInputs(){
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if(!email || !password){
    showMessage('Preencha email e senha para continuar.', 'error');
    return false;
  }
  if(!/^\S+@\S+\.\S+$/.test(email)){
    showMessage('Informe um email válido.', 'error');
    return false;
  }
  if(password.length < 6){
    showMessage('A senha precisa ter pelo menos 6 caracteres.', 'error');
    return false;
  }
  return true;
}
function setAuthButtonsDisabled(disabled){
  signinBtn.disabled = disabled || authCooldown;
  signupBtn.disabled = disabled || authCooldown;
}
function startAuthCooldown(duration = 10000){
  authCooldown = true;
  setAuthButtonsDisabled(true);
  setTimeout(() => {
    authCooldown = false;
    setAuthButtonsDisabled(false);
  }, duration);
}
function switchView(view){
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
  registroPanel.classList.toggle('active', view === 'registro');
  listaPanel.classList.toggle('active', view === 'lista');
  dashboardPanel.classList.toggle('active', view === 'dashboard');
  favoritosPanel.classList.toggle('active', view === 'favoritos');
}
function formatDate(value){
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
function normalizeTasks(tasks){
  return tasks.map(task => ({
    ...task,
    favorito: Boolean(task.favorito),
    fotos: Array.isArray(task.fotos) ? task.fotos : []
  }));
}
function render(){
  const search = searchInput.value.trim().toLowerCase();
  const raridadeFilter = filterRaridade.value;
  const onlyFavorites = showFavorites.dataset.active === 'true';
  const tasks = normalizeTasks(getLocalTasks());
  const filtered = tasks.filter(task => {
    const text = `${task.titulo} ${task.descricao} ${task.categoria}`.toLowerCase();
    const passesSearch = !search || text.includes(search);
    const passesRaridade = !raridadeFilter || task.raridade === raridadeFilter;
    const passesFavorites = !onlyFavorites || task.favorito;
    return passesSearch && passesRaridade && passesFavorites;
  });
  notesList.innerHTML = filtered.map(task => {
    const images = task.fotos.slice(0,3).map(src => `<div class="photo-thumb" style="background-image:url('${src}')"></div>`).join('');
    return `<li class="record-card">
      <h3>${escapeHtml(task.titulo)}</h3>
      <p>${escapeHtml(task.descricao)}</p>
      <div class="record-meta">
        <span class="badge">${escapeHtml(task.categoria)}</span>
        <span>Raridade: ${escapeHtml(task.raridade)}</span>
        <span>${formatDate(task.criado_em)}</span>
        <span>${task.sincronizado ? 'Sincronizado' : 'Pendente'}</span>
      </div>
      <div class="photo-grid">${images}</div>
      <div class="record-actions">
        <button class="favorite ${task.favorito ? 'active' : ''}" data-action="favorite" data-id="${task.id}">${task.favorito ? 'Remover favorito' : 'Favoritar'}</button>
        <button class="danger" data-action="delete" data-id="${task.id}">Apagar</button>
      </div>
    </li>`;
  }).join('');
  favoritesList.innerHTML = tasks.filter(task => task.favorito).map(task => {
    return `<li class="record-card">
      <h3>${escapeHtml(task.titulo)}</h3>
      <p>${escapeHtml(task.descricao)}</p>
      <div class="record-meta">
        <span class="badge">${escapeHtml(task.categoria)}</span>
        <span>Raridade: ${escapeHtml(task.raridade)}</span>
      </div>
      <div class="record-actions">
        <button class="favorite active" data-action="favorite" data-id="${task.id}">Remover favorito</button>
      </div>
    </li>`;
  }).join('');
  const total = tasks.length;
  const comum = tasks.filter(task => task.raridade === 'Comum').length;
  const rara = tasks.filter(task => task.raridade === 'Rara').length;
  const muitoRara = tasks.filter(task => task.raridade === 'Muito Rara').length;
  const synced = tasks.filter(task => task.sincronizado).length;
  totalCount.textContent = total;
  comumCount.textContent = comum;
  raraCount.textContent = rara;
  muitoRaraCount.textContent = muitoRara;
  syncCount.textContent = total ? `${Math.round((synced / total) * 100)}%` : '0%';
}
function escapeHtml(value){
  if(!value) return '';
  return value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[char]);
}
function saveLocalTask(task){
  const tasks = normalizeTasks(getLocalTasks());
  tasks.unshift(task);
  setLocalTasks(tasks);
}
function updateLocalTask(id, patch){
  const tasks = normalizeTasks(getLocalTasks()).map(task => task.id === id ? {...task, ...patch} : task);
  setLocalTasks(tasks);
}
function removeLocalTask(id){
  const tasks = normalizeTasks(getLocalTasks()).filter(task => task.id !== id);
  setLocalTasks(tasks);
}
async function resizeImage(file){
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const maxSize = 1200;
        let width = img.width;
        let height = img.height;
        if(width > maxSize || height > maxSize){
          const ratio = maxSize / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
    };
    reader.readAsDataURL(file);
  });
}
async function preparePhotos(files){
  const chosen = Array.from(files || []).slice(0, MAX_PHOTOS);
  return Promise.all(chosen.map(file => resizeImage(file)));
}

function dataUrlToBlob(dataUrl){
  const parts = dataUrl.split(',');
  const meta = parts[0];
  const b64 = parts[1];
  const mimeMatch = meta.match(/data:(.+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for(let i=0;i<byteChars.length;i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

async function uploadDataUrlToStorage(dataUrl, userId){
  try{
    const blob = dataUrlToBlob(dataUrl);
    const mime = blob.type || 'image/jpeg';
    const ext = mime.split('/')[1].split('+')[0] || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {upsert:false});
    if(error){
      console.error('Erro upload:', error);
      const message = error.message || JSON.stringify(error);
      if(/row-level security|violates row-level security|policy/i.test(message)){
        showMessage('Upload bloqueado por políticas do Storage. Verifique as permissões do bucket no Supabase.', 'error', 8000);
        console.warn('Provável causa: Row Level Security no bucket. Use a seguinte policy no Supabase SQL Editor para permitir INSERT em storage.objects para o bucket "images" e usuários autenticados:\n\nCREATE POLICY allow_insert_images ON storage.objects\n  FOR INSERT\n  WITH CHECK (bucket_id = \'images\' AND auth.role() = \'authenticated\');\n');
      } else {
        showMessage('Erro no upload da foto: ' + message, 'error', 6000);
      }
      return null;
    }
    // getPublicUrl retorna o URL público (se o bucket for público)
    const publicRes = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    // log completo para depuração
    console.log('Upload success:', { path, data, publicRes });
    const publicData = publicRes?.data || {};
    return {
      publicUrl: publicData?.publicUrl || null,
      path: data?.path || path,
      size: blob.size,
      contentType: blob.type
    };
  }catch(err){
    console.error('uploadDataUrlToStorage error', err);
    showMessage('Erro inesperado no upload: ' + (err.message || err), 'error', 6000);
    return null;
  }
}

async function ensurePhotosStored(task){
  const userId = task.usuario_id;
  if(!userId) return task.fotos || [];
  const fotos = Array.isArray(task.fotos) ? task.fotos : [];
  const result = [];
  for(const foto of fotos){
    if(typeof foto === 'string' && foto.startsWith('data:')){
      const uploaded = await uploadDataUrlToStorage(foto, userId);
      if(uploaded) result.push(uploaded);
    }else if(typeof foto === 'string'){
      result.push({ publicUrl: foto });
    }
  }
  return result;
}
function updatePhotoPreview(files){
  photoPreview.innerHTML = '';
  Array.from(files || []).slice(0, MAX_PHOTOS).forEach(file => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
    photoPreview.appendChild(thumb);
  });
}
async function syncPending(){
  if(!navigator.onLine) return;
  const user = currentUser();
  if(!user) return;
  const tasks = normalizeTasks(getLocalTasks());
  const pending = tasks.filter(task => !task.sincronizado && task.usuario_id === user.id);
  for(const task of pending){
    // Garantir que fotos em dataURLs sejam enviadas ao Storage e substituídas por URLs públicas
    const uploadedInfos = await ensurePhotosStored(task);
    const fotosUrls = uploadedInfos.map(i => i.publicUrl).filter(Boolean);
    const payload = {
      usuario_id: task.usuario_id,
      titulo: task.titulo,
      descricao: task.descricao,
      categoria: task.categoria,
      raridade: task.raridade,
      favorito: task.favorito,
      fotos: fotosUrls,
      criado_em: task.criado_em
    };
    const { data: insertData, error } = await supabase.from('tarefas').insert([payload]).select();
    if(!error && insertData && insertData[0]){
      const remoteId = insertData[0].id;
      const fotosToInsert = uploadedInfos.map(info => ({
        usuario_id: task.usuario_id,
        tarefa_id: remoteId,
        storage_path: info.path || null,
        public_url: info.publicUrl || null,
        tamanho: info.size || null,
        content_type: info.contentType || null
      })).filter(f => f.public_url);
      if(fotosToInsert.length){
        const { error: fotosErr } = await supabase.from('fotos').insert(fotosToInsert);
        if(fotosErr) console.error('Erro inserindo metadados de fotos:', fotosErr);
      }
      updateLocalTask(task.id, {sincronizado:true, fotos: fotosUrls});
    }else{
      console.error('Erro inserindo tarefa remota:', error);
    }
  }
  await fetchRemoteTasks();
  render();
}
async function fetchRemoteTasks(){
  if(!navigator.onLine) return;
  const user = currentUser();
  if(!user) return;
  const {data,error} = await supabase.from('tarefas').select('*').eq('usuario_id', user.id).order('criado_em', {ascending:false});
  if(error) return;
  const local = normalizeTasks(getLocalTasks());
  const merged = [...local];
  data.forEach(remote => {
    const exists = local.some(item => item.criado_em === remote.criado_em && item.titulo === remote.titulo);
    if(!exists){
      merged.push({
        id: `remote-${remote.id}`,
        usuario_id: remote.usuario_id,
        titulo: remote.titulo,
        descricao: remote.descricao,
        categoria: remote.categoria,
        raridade: remote.raridade,
        favorito: Boolean(remote.favorito),
        fotos: Array.isArray(remote.fotos) ? remote.fotos : [],
        criado_em: remote.criado_em,
        sincronizado: true
      });
    }
  });
  setLocalTasks(merged);
}
function clearForm(){
  titleInput.value = '';
  descricaoInput.value = '';
  categoriaInput.value = '';
  raridadeSelect.value = 'Comum';
  photoInput.value = '';
  photoPreview.innerHTML = '';
  currentStep = 1;
  updateStep();
}
function updateStep(){
  stepPanes.forEach(pane => pane.classList.toggle('active', pane.dataset.step === String(currentStep)));
  stepPills.forEach((pill, index) => pill.classList.toggle('active', index + 1 === currentStep));
  prevStepBtn.hidden = currentStep === 1;
  nextStepBtn.hidden = currentStep === 2;
  saveBtn.hidden = currentStep === 1;
}
function validateStep1(){
  if(!titleInput.value.trim() || !descricaoInput.value.trim() || !categoriaInput.value.trim()){
    showMessage('Preencha título, descrição e categoria antes de prosseguir.', 'error');
    return false;
  }
  return true;
}
function applyFilterState(){
  const active = showFavorites.dataset.active === 'true';
  showFavorites.dataset.active = active ? 'false' : 'true';
  showFavorites.textContent = active ? 'Apenas favoritos' : 'Mostrar todos';
  render();
}
function setUserState(user){
  const visible = Boolean(user);
  authSection.hidden = visible;
  appSection.hidden = !visible;
  if(user){
    if (userEmail) userEmail.textContent = user.email;
    if (userInfoHeader) userInfoHeader.textContent = user.email;
    ensureUserProfile(user).then(() => fetchRemoteTasks()).then(syncPending).then(render);
  } else {
    if (userEmail) userEmail.textContent = '';
    if (userInfoHeader) userInfoHeader.textContent = '';
  }
}
signinForm.addEventListener('submit',async event => {
  event.preventDefault();
  if(authRequestInFlight) return;
  if(!validateAuthInputs()) return;
  authRequestInFlight = true;
  setAuthButtonsDisabled(true);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value
  });
  authRequestInFlight = false;
  setAuthButtonsDisabled(false);
  if(error){
    if(error.status === 429){
      showMessage('Muitas tentativas. Aguarde 10 segundos e tente novamente.', 'error');
      startAuthCooldown(10000);
      return;
    }
    const message = error.code === 'invalid_credentials'
      ? 'Email ou senha inválidos. Verifique suas credenciais e tente novamente.'
      : error.message;
    showMessage(message, 'error');
    return;
  }
  currentUserData = data?.user || null;
  if(currentUserData){
    setUserState(currentUserData);
    render();
  }
});
signupBtn.addEventListener('click',async () => {
  if(authRequestInFlight) return;
  if(!validateAuthInputs()) return;
  authRequestInFlight = true;
  setAuthButtonsDisabled(true);
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if(error){
    authRequestInFlight = false;
    setAuthButtonsDisabled(false);
    if(error.status === 429){
      showMessage('Muitas tentativas no cadastro. Aguarde 10 segundos e tente novamente.', 'error');
      startAuthCooldown(10000);
      return;
    }
    const message = error.status === 422
      ? 'Cadastro inválido. Verifique o email e a senha.'
      : error.message;
    showMessage(message, 'error');
    return;
  }
  currentUserData = data?.user || null;
  if(!data?.session){
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    authRequestInFlight = false;
    setAuthButtonsDisabled(false);
    if(signInError){
      showMessage('Conta criada, mas não foi possível entrar automaticamente. ' + signInError.message, 'error');
      return;
    }
    currentUserData = signInData?.user || currentUserData;
  }
  authRequestInFlight = false;
  setAuthButtonsDisabled(false);
  showMessage('Conta criada com sucesso e você foi autenticado.', 'success');
  if(currentUserData){
    setUserState(currentUserData);
    render();
  }
});
signoutHeaderBtn.addEventListener('click',async () => {
  await supabase.auth.signOut();
  refreshSession();
});
photoInput.addEventListener('change', () => updatePhotoPreview(photoInput.files));
nextStepBtn.addEventListener('click', () => {
  if(validateStep1()){
    currentStep = 2;
    updateStep();
  }
});
prevStepBtn.addEventListener('click', () => {
  currentStep = 1;
  updateStep();
});
updateStep();
noteForm.addEventListener('submit',async event => {
  event.preventDefault();
  const user = currentUser();
  if(!user){
    showMessage('Faça login para criar descobertas.', 'error');
    return;
  }
  const fotos = await preparePhotos(photoInput.files);
  let fotosToSave = fotos;
  if(navigator.onLine){
    const uploaded = await Promise.all(fotos.map(f => uploadDataUrlToStorage(f, user.id)));
    fotosToSave = uploaded.map(u => u?.publicUrl || '').filter(Boolean);
  }
  const task = {
    id: `local-${Date.now()}`,
    usuario_id: user.id,
    titulo: titleInput.value.trim(),
    descricao: descricaoInput.value.trim(),
    categoria: categoriaInput.value.trim() || 'Sem categoria',
    raridade: raridadeSelect.value,
    favorito: false,
    fotos: fotosToSave,
    criado_em: new Date().toISOString(),
    sincronizado: navigator.onLine
  };
  saveLocalTask(task);
  if(navigator.onLine) await syncPending();
  clearForm();
  render();
});
tabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
searchInput.addEventListener('input', render);
filterRaridade.addEventListener('change', render);
showFavorites.addEventListener('click', applyFilterState);
syncButton.addEventListener('click', async () => {
  await syncPending();
  render();
});
notesList.addEventListener('click', async event => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if(!action || !id) return;
  if(action === 'favorite'){
    const task = normalizeTasks(getLocalTasks()).find(item => item.id === id);
    if(task) updateLocalTask(id, {favorito: !task.favorito});
  }
  if(action === 'delete'){
    const task = normalizeTasks(getLocalTasks()).find(item => item.id === id);
    if(task && task.sincronizado && navigator.onLine){
      await supabase.from('tarefas').delete().eq('usuario_id', task.usuario_id).eq('criado_em', task.criado_em);
    }
    removeLocalTask(id);
  }
  render();
});
favoritesList.addEventListener('click', event => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if(action === 'favorite' && id){
    const task = normalizeTasks(getLocalTasks()).find(item => item.id === id);
    if(task) updateLocalTask(id, {favorito: !task.favorito});
    render();
  }
});
window.addEventListener('online', async () => { updateNetworkStatus(); await syncPending(); render(); });
window.addEventListener('offline', updateNetworkStatus);
supabase.auth.onAuthStateChange((event, session) => {
  currentUserData = session?.user || null;
  setUserState(currentUserData);
  if(currentUserData){
    fetchRemoteTasks().then(syncPending).then(render);
  } else {
    render();
  }
});
// Limpa caches, service workers e tokens antigos no carregamento para evitar erros de refresh
async function clearAppCacheOnLoad(){
  // Atualiza estado de rede visível imediatamente
  updateNetworkStatus();

  // Desregistrar service workers
  if('serviceWorker' in navigator){
    try{
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }catch(err){ console.warn('Falha ao desregistrar service workers:', err); }
  }

  // Limpar Cache Storage
  if('caches' in window){
    try{
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }catch(err){ console.warn('Falha ao limpar caches:', err); }
  }

  // Remover chaves locais relacionadas ao app e supabase
  try{
    const toRemove = [];
    for(let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      if(!key) continue;
      if(key === STORAGE_KEY || key.includes('supabase') || key.startsWith('sb-') || key.includes('sb:') || key.includes('supabase.auth')){
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }catch(err){ console.warn('Falha ao limpar localStorage:', err); }

  // Tentar limpar sessão no Supabase (ignora falhas offline)
  try{ await supabase.auth.signOut(); }catch(err){ console.warn('supabase.signOut falhou:', err); }

  // Recarregar estado da sessão após limpeza
  await refreshSession();
}

// Adiciona listener do botão manual para limpeza de cache/sessão
if (resetCacheBtn) {
  resetCacheBtn.addEventListener('click', async () => {
    showMessage('Limpando cache e sessão...', 'info', 3000);
    await clearAppCacheOnLoad();
    showMessage('Cache limpo e sessão reiniciada.', 'success', 3000);
  });
}

// Executa limpeza no carregamento para evitar tokens/caches inválidos
clearAppCacheOnLoad();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js');}
