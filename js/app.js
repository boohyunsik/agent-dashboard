// Agent Dashboard - Static Site Logic
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async function() {
  let agents, status, projects;
  try {
    [agents, status, projects] = await Promise.all([
      fetch('data/agents.json').then(r => { if (!r.ok) throw new Error(`agents.json: ${r.status}`); return r.json(); }),
      fetch('data/status.json').then(r => { if (!r.ok) throw new Error(`status.json: ${r.status}`); return r.json(); }),
      fetch('data/projects.json').then(r => { if (!r.ok) throw new Error(`projects.json: ${r.status}`); return r.json(); }),
    ]);
  } catch (err) {
    document.querySelector('.content').innerHTML = `<div class="empty-state" style="padding:2rem;color:#e74c3c;">⚠️ Failed to load dashboard data: ${esc(err.message)}</div>`;
    return;
  }

  const statusMap = Object.fromEntries(status.map(s => [s.id, s]));
  const builtAt = status[0]?.builtAt || 'unknown';

  // Simple markdown renderer
  function renderMd(text) {
    if (!text) return '<p class="empty-state">No content available</p>';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/((?:<li>.*?<\/li>(?:<br>)?)+)/g, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // Navigation
  const navLinks = document.querySelectorAll('.sidebar nav a');
  const sections = document.querySelectorAll('.section');

  function navigate(target) {
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === target));
    sections.forEach(s => s.classList.toggle('active', s.id === target));
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.section);
    });
  });

  // Render Agents
  const agentGrid = document.getElementById('agent-grid');
  const detailPanel = document.getElementById('agent-detail');

  agents.forEach(agent => {
    const s = statusMap[agent.id] || {};
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div class="card-emoji">${esc(agent.emoji)}</div>
        <div>
          <div class="card-title">${esc(agent.name)}</div>
          <div class="card-subtitle">${esc(agent.id)} · <span class="badge">${esc(agent.model)}</span></div>
        </div>
      </div>
      <div class="card-body">
        <div class="meta-grid">
          <span class="meta-label">Workspace</span>
          <span class="meta-value" style="font-size:11px;word-break:break-all">${esc(agent.workspace)}</span>
          <span class="meta-label">Subagents</span>
          <span class="meta-value">${esc(agent.subagents || 'none')}</span>
          <span class="meta-label">Memory</span>
          <span class="meta-value">${s.recentMemory?.length || 0} entries</span>
        </div>
      </div>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => showDetail(agent, s));
    agentGrid.appendChild(card);
  });

  function showDetail(agent, s) {
    detailPanel.classList.add('active');
    const tabs = detailPanel.querySelectorAll('.tab-bar button');
    const content = document.getElementById('detail-content');

    function showTab(tab) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      if (tab === 'agents-md') {
        content.innerHTML = `<div class="md-content">${renderMd(agent.agentsMd)}</div>`;
      } else if (tab === 'soul-md') {
        content.innerHTML = `<div class="md-content">${renderMd(agent.soulMd)}</div>`;
      } else if (tab === 'memory') {
        if (!s.recentMemory?.length) {
          content.innerHTML = '<p class="empty-state">No memory entries yet</p>';
        } else {
          content.innerHTML = s.recentMemory.map(m => `
            <div class="memory-item">
              <div class="memory-date">${esc(m.date)}</div>
              <div class="memory-content">${esc(m.content)}</div>
            </div>
          `).join('');
        }
      }
    }

    detailPanel.querySelector('h3').textContent = `${agent.emoji} ${agent.name}`; // textContent is safe
    tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
    showTab('agents-md');
    detailPanel.scrollIntoView({ behavior: 'smooth' });
  }

  // Render Projects
  const projectList = document.getElementById('project-list');
  if (!projects.length) {
    projectList.innerHTML = '<p class="empty-state">No projects found</p>';
  } else {
    projects.forEach(p => {
      const row = document.createElement('div');
      row.className = 'project-row';
      const agentInfo = agents.find(a => a.id === p.agent);
      row.innerHTML = `
        <span>${esc(agentInfo?.emoji || '📁')}</span>
        <span class="project-name">${esc(p.name)}</span>
        <span class="project-agent"><span class="badge badge-green">${esc(p.agent)}</span></span>
        <span class="project-files">${p.fileCount} files</span>
      `;
      projectList.appendChild(row);
    });
  }

  // Render Logs
  const logsContent = document.getElementById('logs-content');
  let allMemory = [];
  status.forEach(s => {
    (s.recentMemory || []).forEach(m => {
      allMemory.push({ ...m, agent: s.id, emoji: agents.find(a => a.id === s.id)?.emoji || '📁' });
    });
  });
  allMemory.sort((a, b) => b.date.localeCompare(a.date));

  if (!allMemory.length) {
    logsContent.innerHTML = '<p class="empty-state">No log entries yet. Agents will generate memory files as they work.</p>';
  } else {
    logsContent.innerHTML = allMemory.map(m => `
      <div class="memory-item">
        <div class="memory-date">${esc(m.emoji)} ${esc(m.agent)} · ${esc(m.date)}</div>
        <div class="memory-content">${esc(m.content)}</div>
      </div>
    `).join('');
  }

  // Footer
  document.getElementById('built-at').textContent = builtAt;

  // Default view
  navigate('agents');
})();
