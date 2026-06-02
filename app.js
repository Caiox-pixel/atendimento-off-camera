import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_KEY = 'diario-exploradores-tarefas';
const MAX_PHOTOS = 3;
const authSection = document.getElementById('auth');
const appSection = document.getElementById('app');
const signinForm = document.getElementById('signin-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');
const signoutHeaderBtn = document.getElementById('signout-header');
const userInfoHeader = document.getElementById('user-email-header');
const userEmail = document.getElementById('user-email');
const networkStatus = document.getElementById('network-status');
const syncButton = document.getElementById('sync-button');
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
  const { data } = await supabase.auth.getSession();
  currentUserData = data?.session?.user || null;
  updateNetworkStatus();
  setUserState(currentUserData);
  localTasks = normalizeTasks(getLocalTasks());
  render();
}
function updateNetworkStatus(){
  const online = navigator.onLine;
  networkStatus.textContent = online ? 'Online' : 'Offline';
  networkStatus.className = online ? 'status online' : 'status offline';
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
    const payload = {
      usuario_id: task.usuario_id,
      titulo: task.titulo,
      descricao: task.descricao,
      categoria: task.categoria,
      raridade: task.raridade,
      favorito: task.favorito,
      fotos: task.fotos,
      criado_em: task.criado_em
    };
    const {error} = await supabase.from('tarefas').insert([payload]);
    if(!error){
      updateLocalTask(task.id, {sincronizado:true});
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
    userEmail.textContent = user.email;
    userEmailHeader.textContent = user.email;
    fetchRemoteTasks().then(syncPending).then(render);
  }
}
signinBtn.addEventListener('click',async event => {
  event.preventDefault();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  if(error){
    showMessage(error.message, 'error');
    return;
  }
  currentUserData = data?.user || null;
  refreshSession();
});
signupBtn.addEventListener('click',async () => {
  const { data, error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  if(error){
    showMessage(error.message, 'error');
    return;
  }
  showMessage('Conta criada com sucesso. Verifique seu email se necessário.', 'success');
  currentUserData = data?.user || null;
  await createWelcomeTask(currentUserData);
  refreshSession();
});
[signoutBtn, signoutHeaderBtn].forEach(button => button.addEventListener('click',async () => {
  await supabase.auth.signOut();
  refreshSession();
}));
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
  const task = {
    id: `local-${Date.now()}`,
    usuario_id: user.id,
    titulo: titleInput.value.trim(),
    descricao: descricaoInput.value.trim(),
    categoria: categoriaInput.value.trim() || 'Sem categoria',
    raridade: raridadeSelect.value,
    favorito: false,
    fotos,
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
supabase.auth.onAuthStateChange(() => refreshSession());
refreshSession();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js');}
