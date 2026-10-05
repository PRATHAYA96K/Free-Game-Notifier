/* ═══════════════════════════════════════════════════════════════
   FREE GAME HUNTER v4 — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ═══ Particle Background ═══
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 60;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.8 + 0.3;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.color = Math.random() > 0.5 ? `rgba(108, 92, 231, ${this.opacity})` : `rgba(0, 206, 255, ${this.opacity})`;
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                if (Math.abs(dx) > 120 || Math.abs(dy) > 120) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(108, 92, 231, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ═══ DOM Refs ═══
    const navBtns         = document.querySelectorAll('.sb-link');
    const pages           = document.querySelectorAll('.page');
    const gamesLoader     = document.getElementById('gamesLoader');
    const gamesContainer  = document.getElementById('gamesContainer');
    const emptyState      = document.getElementById('emptyState');
    const gameCountEl     = document.getElementById('gameCount');
    const lastUpdateEl    = document.getElementById('lastUpdate');
    const newsLoader      = document.getElementById('newsLoader');
    const newsContainer   = document.getElementById('newsContainer');
    const notifyToggle    = document.getElementById('notifyToggle');
    const platformChips   = document.querySelectorAll('#platformFilter .pill');
    const categoryChips   = document.querySelectorAll('#categoryFilter .pill');
    const genreChips      = document.querySelectorAll('#genreFilter .pill');
    const sortChips       = document.querySelectorAll('#sortFilter .pill');
    
    // New Elements
    const searchInput     = document.getElementById('searchInput');
    const scanCountdown   = document.getElementById('scanCountdown');
    const modalOverlay    = document.getElementById('gameModal');
    const modalClose      = document.getElementById('modalClose');

    let currentPlatform = 'all';
    let currentCategory = 'all';
    let currentGenre    = 'all';
    let currentSort     = 'trending';
    let newsLoaded      = false;
    let allGames        = []; // Cache for searching

    // ═══ Navigation ═══
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.page;
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pages.forEach(p => {
                p.classList.remove('active');
                if (p.id === `page${cap(target)}`) p.classList.add('active');
            });
            if (target === 'news' && !newsLoaded) { loadNews(); newsLoaded = true; }
        });
    });
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

        // --- Dropdowns ---
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    dropdowns.forEach(dd => {
        const toggle = dd.querySelector('.dropdown-toggle');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dd.classList.contains('open');
            dropdowns.forEach(d => d.classList.remove('open'));
            if (!isOpen) dd.classList.add('open');
        });
    });
    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('open'));
    });

    function bindChips(chips, cb, labelId) {
        if (!chips || !chips.length) return;
        const parent = chips[0].parentElement;
        const slider = parent.querySelector('.pill-slider');
        const label = document.getElementById(labelId);
        
        function updateSlider(activePill) {
            if (!slider || !activePill) return;
            slider.style.height = activePill.offsetHeight + 'px';
            slider.style.top = activePill.offsetTop + 'px';
            slider.classList.add('active');
        }

        const initActive = Array.from(chips).find(c => c.classList.contains('active')) || chips[0];
        setTimeout(() => updateSlider(initActive), 50);

        chips.forEach(c => {
            c.addEventListener('click', (e) => {
                e.stopPropagation();
                chips.forEach(x => x.classList.remove('active'));
                c.classList.add('active');
                updateSlider(c);
                if (label) label.textContent = c.textContent;
                cb(c.dataset.value);
                parent.parentElement.classList.remove('open');
            });
        });
    }
    bindChips(platformChips, v => { currentPlatform = v; loadGames(); }, 'platformVal');
    bindChips(categoryChips, v => { currentCategory = v; loadGames(); }, 'categoryVal');
    bindChips(genreChips,    v => { currentGenre    = v; loadGames(); }, 'genreVal');
    bindChips(sortChips,     v => { currentSort     = v; loadGames(); }, 'sortVal');

    // ═══ Search & Refresh ═══
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) {
                renderGames(allGames);
                return;
            }
            const filtered = allGames.filter(g => g.title.toLowerCase().includes(term));
            renderGames(filtered);
        });
    }

    // ═══ Auto-Scan Countdown ═══
    let countdownTimer;
    let timeUntilNextScan = 10 * 60; // 10 minutes

    function resetCountdown() {
        clearInterval(countdownTimer);
        timeUntilNextScan = 10 * 60;
        updateCountdownUI();
        countdownTimer = setInterval(() => {
            timeUntilNextScan--;
            if (timeUntilNextScan <= 0) {
                loadGames();
            } else {
                updateCountdownUI();
            }
        }, 1000);
    }

    function updateCountdownUI() {
        if (!scanCountdown) return;
        const m = Math.floor(timeUntilNextScan / 60).toString().padStart(2, '0');
        const s = (timeUntilNextScan % 60).toString().padStart(2, '0');
        scanCountdown.textContent = `${m}:${s}`;
    }

    // ═══ Notify Toggle ═══
    if (notifyToggle) {
        fetch('/api/notify-status').then(r => r.json()).then(d => { notifyToggle.checked = d.notify_enabled; }).catch(() => {});
        notifyToggle.addEventListener('change', e => {
            const on = e.target.checked;
            fetch('/api/toggle-notify', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: on })
            }).catch(() => { notifyToggle.checked = !on; });
        });
    }

    // ═══ Load Games ═══
    function loadGames() {
        resetCountdown();
        if (gamesLoader) gamesLoader.style.display = 'flex';
        if (gamesContainer) gamesContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (searchInput) searchInput.value = '';

        const url = `/api/games?platform=${currentPlatform}&category=${currentCategory}&genre=${currentGenre}&sort=${currentSort}`;

        return fetch(url)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(games => {
                allGames = games || [];
                renderGames(allGames);
                if (lastUpdateEl) {
                    const now = new Date();
                    lastUpdateEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            })
            .catch(() => {
                if (gamesLoader) {
                    gamesLoader.innerHTML = `<p style="color:#ff6b6b;font-family:var(--f-mono);letter-spacing:1px;">Connection failed. Retrying...</p>`;
                }
            });
    }

    function renderGames(games) {
        if (gamesLoader) gamesLoader.style.display = 'none';
        if (!games.length) {
            if (emptyState) emptyState.style.display = 'flex';
            if (gamesContainer) gamesContainer.style.display = 'none';
            if (gameCountEl) gameCountEl.textContent = '00';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        if (gamesContainer) {
            gamesContainer.style.display = 'grid';
            gamesContainer.innerHTML = '';
        }
        if (gameCountEl) gameCountEl.textContent = String(games.length).padStart(2, '0');
        
        const now = new Date();
        const tpl = document.getElementById('gameCardTpl');

        if (!tpl) return;

        games.forEach((g, i) => {
            const clone = tpl.content.cloneNode(true);
            const card = clone.querySelector('.gcard');
            if (card) card.style.animationDelay = `${i * 0.05}s`;

            const img = clone.querySelector('.gcard-img');
            if (img) { img.src = g.image || g.thumbnail; img.alt = g.title; }

            const titleEl = clone.querySelector('.gcard-title');
            if (titleEl) titleEl.textContent = g.title;

            const worthEl = clone.querySelector('.gcard-worth');
            const w = g.worth && g.worth !== 'N/A' ? g.worth : 'FREE';
            if (worthEl) worthEl.textContent = w === 'FREE' ? '✦ FREE' : `Was ${w}`;

            const timerEl = clone.querySelector('.gcard-timer');
            if (timerEl) {
                if (g.end_date && g.end_date !== 'N/A') {
                    const diff = Math.ceil((new Date(g.end_date) - now) / 86400000);
                    timerEl.textContent = diff > 0 ? `${diff}d left` : 'Ending soon';
                } else {
                    timerEl.textContent = '∞ ongoing';
                }
            }

            let pt = 'PC';
            const pf = (g.platforms || '').toLowerCase();
            if (pf.includes('steam') && pf.includes('epic')) pt = 'MULTI';
            else if (pf.includes('steam')) pt = 'STEAM';
            else if (pf.includes('epic')) pt = 'EPIC';
            
            const pBadge = clone.querySelector('.b-platform');
            if (pBadge) pBadge.textContent = pt;
            
            const tBadge = clone.querySelector('.b-type');
            if (tBadge) tBadge.textContent = (g.type || 'GAME').toUpperCase();

            const tagsWrap = clone.querySelector('.gcard-genre-tags');
            if (tagsWrap) {
                (g.genres || []).forEach(genre => {
                    const tag = document.createElement('span');
                    tag.className = 'genre-tag'; tag.textContent = genre;
                    tagsWrap.appendChild(tag);
                });
            }

            // Set Details Button Data
            const btn = clone.querySelector('.btn-details');
            if (btn) {
                btn.dataset.source = g.source;
                btn.dataset.id = g.id;
                btn.addEventListener('click', () => openModal(g.source, g.id));
            }

            if (gamesContainer) gamesContainer.appendChild(clone);
        });
    }

    // ═══ Modal Logic ═══
    function openModal(source, id) {
        if (!modalOverlay) return;
        modalOverlay.classList.add('active');
        document.getElementById('modalLoader').style.display = 'flex';
        document.getElementById('modalBody').style.display = 'none';
        
        fetch(`/api/game/${source}/${id}`)
            .then(r => r.json())
            .then(data => {
                document.getElementById('modalLoader').style.display = 'none';
                document.getElementById('modalBody').style.display = 'grid';
                
                document.getElementById('modalTitle').textContent = data.title;
                document.getElementById('modalDesc').innerHTML = (data.description || '').replace(/\n/g, '<br>');
                
                // Screenshots
                const mainImg = document.getElementById('modalMainImg');
                const thumbsWrap = document.getElementById('modalThumbnails');
                thumbsWrap.innerHTML = '';
                
                if (data.screenshots && data.screenshots.length > 0) {
                    mainImg.src = data.screenshots[0];
                    if (data.screenshots.length > 1) {
                        data.screenshots.forEach((url, i) => {
                            const t = document.createElement('img');
                            t.src = url;
                            if (i===0) t.classList.add('active');
                            t.addEventListener('click', () => {
                                mainImg.src = url;
                                thumbsWrap.querySelectorAll('img').forEach(x => x.classList.remove('active'));
                                t.classList.add('active');
                            });
                            thumbsWrap.appendChild(t);
                        });
                    }
                }
                
                // Sys Req
                const reqBox = document.getElementById('modalSysreq');
                const reqGrid = document.getElementById('modalSysreqGrid');
                if (data.requirements && Object.keys(data.requirements).length > 0) {
                    reqBox.style.display = 'block';
                    reqGrid.innerHTML = '';
                    for (const [k, v] of Object.entries(data.requirements)) {
                        reqGrid.innerHTML += `<div><strong>${k.toUpperCase()}</strong> ${v}</div>`;
                    }
                } else {
                    reqBox.style.display = 'none';
                }
                
                // Instructions
                const instrBox = document.getElementById('modalInstructions');
                const instrText = document.getElementById('modalInstructionsText');
                if (data.instructions) {
                    instrBox.style.display = 'block';
                    instrText.innerHTML = data.instructions.replace(/\n/g, '<br>');
                } else {
                    instrBox.style.display = 'none';
                }
                
                // Claim Btn
                document.getElementById('modalClaimBtn').href = data.url || '#';
            })
            .catch(() => {
                document.getElementById('modalLoader').innerHTML = '<p>Error loading details.</p>';
            });
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('active');
        });
    }

    // ═══ Load News ═══
    function loadNews() {
        if (!newsLoader || !newsContainer) return;
        newsLoader.style.display = 'flex';
        newsContainer.style.display = 'none';
        fetch('/api/news')
            .then(r => r.json())
            .then(articles => {
                newsLoader.style.display = 'none';
                if (!articles || !articles.length) {
                    newsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📡</div><h3>No news available</h3><p>Check back shortly.</p></div>`;
                    newsContainer.style.display = 'grid'; return;
                }
                newsContainer.style.display = 'grid'; newsContainer.innerHTML = '';
                const tpl = document.getElementById('newsCardTpl');
                articles.forEach((a, i) => {
                    const clone = tpl.content.cloneNode(true);
                    const card = clone.querySelector('.ncard');
                    card.style.animationDelay = `${i * 0.04}s`;
                    clone.querySelector('.ncard-title').textContent = a.title;
                    clone.querySelector('.ncard-desc').textContent = a.description || '';
                    clone.querySelector('.ncard-source').textContent = a.source || 'WEB';
                    clone.querySelector('.ncard-read').href = a.link;
                    const img = clone.querySelector('.ncard-img');
                    if (a.image) { img.src = a.image; img.alt = a.title; }
                    else { img.style.display = 'none'; clone.querySelector('.ncard-img-wrap').style.cssText = 'height:60px;background:linear-gradient(135deg,var(--bg-surface),var(--bg-elevated));'; }
                    if (a.pubDate) {
                        try { clone.querySelector('.ncard-date').textContent = new Date(a.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
                        catch { clone.querySelector('.ncard-date').textContent = a.pubDate; }
                    }
                    newsContainer.appendChild(clone);
                });
            })
            .catch(() => { newsLoader.innerHTML = `<p style="color:#ff6b6b;font-family:var(--f-mono);">Feed unavailable</p>`; });
    }

    // ═══ Boot ═══
    loadGames();
});

