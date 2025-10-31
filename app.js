// -----------------------------
// Simple client-side auth (demo)
// -----------------------------
const auth = {
  keyUsers: 'shiny_users_v1',
  keySession: 'shiny_session_v1',
  get users(){ return JSON.parse(localStorage.getItem(this.keyUsers) || '{}'); },
  set users(obj){ localStorage.setItem(this.keyUsers, JSON.stringify(obj)); },
  get current(){ return localStorage.getItem(this.keySession); },
  set current(u){ if(u) localStorage.setItem(this.keySession, u); else localStorage.removeItem(this.keySession); },
  signup(username, password){
    const users = this.users; if(users[username]) throw new Error('Username already exists');
    users[username] = { password }; this.users = users; this.current = username; return username;
  },
  signin(username, password){
    const users = this.users; if(!users[username] || users[username].password !== password) throw new Error('Invalid credentials');
    this.current = username; return username;
  },
  signout(){ this.current = null; }
};

// -----------------------------
// Per-user todo storage
// -----------------------------
function todoKey(user){ return `todos_${user}`; }
function loadTodos(user){ return JSON.parse(localStorage.getItem(todoKey(user)) || '[]'); }
function saveTodos(user, list){ localStorage.setItem(todoKey(user), JSON.stringify(list)); }

// -----------------------------
// DOM refs & state
// -----------------------------
const authArea   = document.getElementById('authArea');
const authView   = document.getElementById('authView');
const appView    = document.getElementById('appView');
const todoListEl = document.getElementById('todoList');
const countLabel = document.getElementById('countLabel');

const newTaskInput = document.getElementById('newTaskInput');
const nameInput    = document.getElementById('nameInput');
const dueInput     = document.getElementById('dueInput');

let state = { user:null, filter:'all', todos:[] };

// -----------------------------
// Render helpers
// -----------------------------
function renderHeader(){
  authArea.innerHTML = '';
  if(state.user){
    const welcome = document.createElement('span');
    welcome.className = 'muted';
    welcome.textContent = `Signed in as @${state.user}`;
    const outBtn = document.createElement('button');
    outBtn.className = 'btn secondary';
    outBtn.textContent = 'Sign Out';
    outBtn.onclick = () => { auth.signout(); init(); };
    authArea.appendChild(welcome);
    authArea.appendChild(outBtn);
  }
}

function show(view){
  authView.style.display = (view === 'auth') ? '' : 'none';
  appView.style.display  = (view === 'app')  ? '' : 'none';
}

function applyFilter(list){
  if(state.filter === 'active') return list.filter(t => !t.done);
  if(state.filter === 'done')   return list.filter(t =>  t.done);
  return list;
}

function renderTodos(){
  const items = applyFilter(state.todos);
  todoListEl.innerHTML = '';
  if(items.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No tasks yet — add one above!';
    todoListEl.appendChild(empty);
  } else {
    items.forEach(task => todoListEl.appendChild(renderTodoItem(task)));
  }
  const left = state.todos.filter(t => !t.done).length;
  countLabel.textContent = `${state.todos.length} items • ${left} left`;
}

function renderTodoItem(task){
  const wrap = document.createElement('div');
  wrap.className = 'todo-item' + (task.done ? ' done' : '');

  const check = document.createElement('div');
  check.className = 'check';
  check.setAttribute('data-checked', task.done ? 'true' : 'false');
  check.onclick = () => { task.done = !task.done; check.setAttribute('data-checked', task.done); persist(); };

  const info = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'todo-title';
  title.textContent = task.title;
  title.ondblclick = () => startEditTitle(title, task);

  const meta = document.createElement('div');
  meta.className = 'todo-meta';
  const dueText = task.due ? ` • Due ${new Date(task.due).toLocaleString()}` : '';
  const whoText = task.name ? ` • By ${task.name}` : '';
  meta.textContent = `Created ${new Date(task.created).toLocaleString()}${dueText}${whoText}`;

  info.appendChild(title);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'stack';
  const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Edit';
  editBtn.onclick = () => editTask(task);
  const delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Delete';
  delBtn.onclick = () => { state.todos = state.todos.filter(t => t.id !== task.id); persist(); };
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  wrap.appendChild(check);
  wrap.appendChild(info);
  wrap.appendChild(actions);
  return wrap;
}

// Inline title editor (double-click)
function startEditTitle(titleEl, task){
  const input = document.createElement('input');
  input.className = 'input';
  input.value = task.title;
  input.style.marginTop = '6px';
  titleEl.replaceWith(input);
  input.focus(); input.select();
  function commit(){ task.title = input.value.trim() || task.title; persist(); }
  function cancel(){ input.replaceWith(titleEl); renderTodos(); }
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); });
  input.addEventListener('blur', commit);
}

// Prompt-based quick editor for title + name + due
function editTask(task){
  const newTitle = prompt('Edit title:', task.title);
  if(newTitle === null) return;
  const newName = prompt('Edit name (who):', task.name || '');
  if(newName === null) return;

  const current = task.due ? new Date(task.due) : null;
  const pad = n=> String(n).padStart(2,'0');
  const toLocalInput = d=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dueDefault = current ? toLocalInput(current) : '';
  const newDueStr = prompt('Edit due (YYYY-MM-DDTHH:MM):', dueDefault);
  if(newDueStr === null) return;

  task.title = (newTitle||'').trim() || task.title;
  task.name  = (newName||'').trim()  || '';
  task.due   = newDueStr ? new Date(newDueStr).getTime() : null;
  persist();
}

function addTask(title){
  const t = (title||'').trim(); if(!t) return;
  state.todos.unshift({
    id: crypto.randomUUID(),
    title: t,
    done: false,
    created: Date.now(),
    name: (nameInput.value||'').trim() || '',
    due:  (dueInput.value ? new Date(dueInput.value).getTime() : null)
  });
  newTaskInput.value = '';
  nameInput.value = '';
  dueInput.value = '';
  persist();
}

function persist(){
  saveTodos(state.user, state.todos);
  renderTodos();
}

// -----------------------------
// Events & init
// -----------------------------
function bindEvents(){
  document.getElementById('addTaskBtn').onclick = () => addTask(newTaskInput.value);

  const addOnEnter = (el)=> el && el.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ addTask(newTaskInput.value); }
  });
  addOnEnter(newTaskInput);
  addOnEnter(nameInput);
  addOnEnter(dueInput);

  document.getElementById('clearDoneBtn').onclick = () => {
    state.todos = state.todos.filter(t => !t.done);
    persist();
  };

  document.querySelectorAll('.chip').forEach(chip=>{
    chip.onclick = ()=>{
      document.querySelectorAll('.chip').forEach(c=>c.dataset.active = 'false');
      chip.dataset.active = 'true';
      state.filter = chip.dataset.filter;
      renderTodos();
    };
  });

  // Auth forms
  document.getElementById('signInForm').addEventListener('submit', (e)=>{
    e.preventDefault(); const f = e.target;
    try{ auth.signin(f.username.value.trim(), f.password.value); init(); }
    catch(err){ alert(err.message); }
  });
  document.getElementById('signUpForm').addEventListener('submit', (e)=>{
    e.preventDefault(); const f = e.target;
    try{ auth.signup(f.username.value.trim(), f.password.value); init(); }
    catch(err){ alert(err.message); }
  });
}

function init(){
  state.user = auth.current;
  renderHeader();
  if(!state.user){ show('auth'); return; }
  show('app');
  state.todos = loadTodos(state.user);
  renderTodos();
}

bindEvents();
init();

// -----------------------------
// Sparkle ("jikimiki") cursor
// -----------------------------
const canvas = document.getElementById('sparkleCanvas');
const ctx = canvas.getContext('2d');
let W, H, DPR;
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.width  = Math.floor(innerWidth  * DPR);
  H = canvas.height = Math.floor(innerHeight * DPR);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
}
window.addEventListener('resize', resize); resize();

let particles = [];
function spawn(x, y){
  for(let i=0;i<8;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 0.8 + Math.random()*1.8;
    particles.push({
      x, y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      life: 28 + Math.random()*14,
      size: 1 + Math.random()*2,
      hue: 200 + Math.random()*160
    });
  }
}

window.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * DPR;
  const y = (e.clientY - rect.top)  * DPR;
  spawn(x, y);
});

function tick(){
  ctx.clearRect(0,0,W,H);
  for(let i=particles.length-1; i>=0; i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.03;
    p.life -= 1;
    const alpha = Math.max(0, p.life/40);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${alpha})`;
    ctx.fill();
    if(p.life <= 0) particles.splice(i,1);
  }
  requestAnimationFrame(tick);
}
tick();
