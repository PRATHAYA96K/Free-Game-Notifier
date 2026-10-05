/* ═══════════════════════════════════════════════════════════════
   GAMEHUNT — Client-Side Architecture (GitHub Pages & Web)
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

    // ═══ API & Constants ═══
    const GP_API_BASE = "https://www.gamerpower.com/api";
    const FTG_API_BASE = "https://www.freetogame.com/api";

    const GENRE_KEYWORDS = {
        action: ["action", "shoot", "battle", "combat", "fight", "war", "fps", "shooter", "gun", "weapon", "slash"],
        rpg: ["rpg", "role-playing", "role playing", "quest", "dungeon", "level up", "character class", "loot"],
        strategy: ["strategy", "tactical", "tower defense", "rts", "turn-based", "command", "conquer", "civilization", "base build"],
        horror: ["horror", "scary", "zombie", "undead", "survival horror", "fear", "dark", "creepy", "haunted", "nightmare"],
        puzzle: ["puzzle", "match-3", "match 3", "brain", "logic", "riddle", "tetris", "sudoku"],
        simulation: ["simulation", "simulator", "tycoon", "management", "farming", "build", "craft"],
        racing: ["racing", "race", "driving", "car", "speed", "drift", "kart", "vehicle"],
        adventure: ["adventure", "explore", "exploration", "journey", "open world", "story-driven", "narrative"],
        sports: ["sport", "football", "soccer", "basketball", "baseball", "tennis", "golf", "athletic"],
        mmo: ["mmo", "mmorpg", "massively multiplayer", "online multiplayer", "guild"],
        "3d": ["3d", "first-person", "third-person", "fps", "tps", "realistic", "vr", "virtual reality"],
        "2d": ["2d", "pixel", "platformer", "side-scroll", "top-down", "isometric", "retro", "arcade"],
        "1d": ["1d", "text-based", "text based", "interactive fiction", "mud", "cli"]
    };

    function detectGenres(text) {
        text = (text || "").toLowerCase();
        const matched = [];
        for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
            for (const kw of keywords) {
                if (text.includes(kw)) {
                    matched.push(genre);
                    break;
                }
            }
        }
        return matched.length ? matched : ["other"];
    }

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
    
    const searchInput     = document.getElementById('searchInput');
    const scanCountdown   = document.getElementById('scanCountdown');
    const modalOverlay    = document.getElementById('gameModal');
    const modalClose      = document.getElementById('modalClose');

    let currentPlatform = 'all';
    let currentCategory = 'all';
    let currentGenre    = 'all';
    let currentSort     = 'trending';
    let newsLoaded      = false;
    let allGames        = []; // Cache for searching & filtering

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

    // ═══ Dropdowns ═══
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

    bindChips(platformChips, v => { currentPlatform = v; filterAndRenderGames(); }, 'platformVal');
    bindChips(categoryChips, v => { currentCategory = v; filterAndRenderGames(); }, 'categoryVal');
    bindChips(genreChips,    v => { currentGenre    = v; filterAndRenderGames(); }, 'genreVal');
    bindChips(sortChips,     v => { currentSort     = v; filterAndRenderGames(); }, 'sortVal');

    // ═══ Search ═══
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) {
                filterAndRenderGames();
                return;
            }
            const filtered = getFilteredGames().filter(g => g.title.toLowerCase().includes(term));
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
                fetchGamesData(true);
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

    // ═══ Browser Notifications ═══
    let isNotifyEnabled = localStorage.getItem('gh_notify_enabled') === 'true';
    if (notifyToggle) {
        notifyToggle.checked = isNotifyEnabled && ('Notification' in window && Notification.permission === 'granted');
        notifyToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if (!('Notification' in window)) {
                    alert('Your browser does not support desktop notifications.');
                    e.target.checked = false;
                    return;
                }
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                    isNotifyEnabled = true;
                    localStorage.setItem('gh_notify_enabled', 'true');
                    new Notification("🎮 Gamehunt Alerts Enabled", {
                        body: "You will be alerted when new free games or giveaways drop!",
                        icon: "https://www.gamerpower.com/favicon.ico"
                    });
                } else {
                    isNotifyEnabled = false;
                    localStorage.setItem('gh_notify_enabled', 'false');
                    e.target.checked = false;
                    alert('Please allow notifications in browser permissions to enable game alerts.');
                }
            } else {
                isNotifyEnabled = false;
                localStorage.setItem('gh_notify_enabled', 'false');
            }
        });
    }

    function checkNewGameAlerts(games) {
        if (!isNotifyEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
        let known = [];
        try {
            known = JSON.parse(localStorage.getItem('gh_known_ids') || '[]');
        } catch { known = []; }

        const currentIds = games.map(g => String(g.source) + '_' + String(g.id));
        if (known.length === 0) {
            localStorage.setItem('gh_known_ids', JSON.stringify(currentIds));
            return;
        }

        const newGames = games.filter(g => !known.includes(String(g.source) + '_' + String(g.id)));
        if (newGames.length > 0) {
            const first = newGames[0];
            new Notification(`🎮 New Freebie: ${first.title}`, {
                body: `${first.platforms} — ${first.description.slice(0, 80)}`,
                icon: first.thumbnail || first.image
            });
            localStorage.setItem('gh_known_ids', JSON.stringify(currentIds));
        }
    }

    // ═══ Direct Client-Side Game Fetching ═══
    async function fetchGamerPower() {
        try {
            const res = await fetch(`${GP_API_BASE}/giveaways?sort-by=popularity`);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            return data.map(g => ({
                source: "gp",
                id: g.id,
                title: g.title || "",
                description: g.description || "",
                thumbnail: g.thumbnail || "",
                image: g.image || g.thumbnail || "",
                type: (g.type || "GAME").toUpperCase(),
                platforms: g.platforms || "PC",
                worth: g.worth || "N/A",
                end_date: g.end_date || "N/A",
                open_giveaway: g.open_giveaway_url || g.open_giveaway || "",
                instructions: g.instructions || "",
                genres: detectGenres((g.title || "") + " " + (g.description || ""))
            }));
        } catch (e) {
            console.warn("GamerPower direct fetch fallback:", e);
            return [];
        }
    }

    async function fetchFreeToGame() {
        try {
            const res = await fetch(`${FTG_API_BASE}/games`);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            return data.map(g => ({
                source: "f2p",
                id: g.id,
                title: g.title || "",
                description: g.short_description || "",
                thumbnail: g.thumbnail || "",
                image: g.thumbnail || "",
                type: "F2P",
                platforms: "PC, " + (g.platform || ""),
                worth: "FREE",
                end_date: "N/A",
                open_giveaway: g.game_url || "",
                instructions: "Sign up and play for free on the official platform.",
                genres: detectGenres((g.title || "") + " " + (g.short_description || "") + " " + (g.genre || ""))
            }));
        } catch (e) {
            console.warn("FreeToGame direct fetch fallback:", e);
            return [];
        }
    }

    async function fetchGamesData(isAutoRefresh = false) {
        resetCountdown();
        if (!isAutoRefresh) {
            if (gamesLoader) gamesLoader.style.display = 'flex';
            if (gamesContainer) gamesContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        }

        try {
            const [gp, ftg] = await Promise.all([fetchGamerPower(), fetchFreeToGame()]);
            allGames = [...gp, ...ftg];
            
            if (lastUpdateEl) {
                const now = new Date();
                lastUpdateEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            checkNewGameAlerts(gp);
            filterAndRenderGames();
        } catch (err) {
            console.error("Error fetching games:", err);
            if (gamesLoader) {
                gamesLoader.innerHTML = `<p style="color:#ff6b6b;font-family:var(--f-mono);">Failed to load games. Check connection.</p>`;
            }
        }
    }

    function getFilteredGames() {
        let list = [...allGames];

        // Platform Filter
        if (currentPlatform !== 'all') {
            list = list.filter(g => {
                const p = (g.platforms || '').toLowerCase();
                if (currentPlatform === 'steam') return p.includes('steam');
                if (currentPlatform === 'epic') return p.includes('epic');
                if (currentPlatform === 'pc') return p.includes('pc') || p.includes('steam') || p.includes('epic');
                return true;
            });
        }

        // Category / Type Filter
        if (currentCategory !== 'all') {
            list = list.filter(g => {
                const t = (g.type || '').toLowerCase();
                if (currentCategory === 'game') return t.includes('game') && t !== 'f2p';
                if (currentCategory === 'loot') return t.includes('loot') || t.includes('dlc');
                if (currentCategory === 'f2p') return t === 'f2p';
                return true;
            });
        }

        // Genre Filter
        if (currentGenre !== 'all') {
            list = list.filter(g => (g.genres || []).includes(currentGenre));
        }

        // Sort Filter
        if (currentSort === 'top') {
            list.sort((a, b) => {
                const getVal = (g) => {
                    const w = String(g.worth || '').replace(/[^0-9.]/g, '');
                    return parseFloat(w) || 0.0;
                };
                return getVal(b) - getVal(a);
            });
        } else if (currentSort === 'recent') {
            list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
        } else if (currentSort === 'views') {
            list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }

        return list;
    }

    function filterAndRenderGames() {
        if (searchInput) searchInput.value = '';
        const filtered = getFilteredGames();
        renderGames(filtered);
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
            if (card) card.style.animationDelay = `${Math.min(i * 0.03, 0.5)}s`;

            const img = clone.querySelector('.gcard-img');
            if (img) {
                img.src = g.image || g.thumbnail;
                img.alt = g.title;
                img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'; };
            }

            const titleEl = clone.querySelector('.gcard-title');
            if (titleEl) titleEl.textContent = g.title;

            const worthEl = clone.querySelector('.gcard-worth');
            const w = g.worth && g.worth !== 'N/A' ? g.worth : 'FREE';
            if (worthEl) worthEl.textContent = (w === 'FREE' || w === '$0.00') ? '✦ FREE' : `Was ${w}`;

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
                (g.genres || []).slice(0, 3).forEach(genre => {
                    const tag = document.createElement('span');
                    tag.className = 'genre-tag'; tag.textContent = genre;
                    tagsWrap.appendChild(tag);
                });
            }

            const btn = clone.querySelector('.btn-details');
            if (btn) {
                btn.addEventListener('click', () => openModal(g));
            }

            if (gamesContainer) gamesContainer.appendChild(clone);
        });
    }

    // ═══ Modal Logic ═══
    async function openModal(game) {
        if (!modalOverlay) return;
        modalOverlay.classList.add('active');
        const loader = document.getElementById('modalLoader');
        const body = document.getElementById('modalBody');
        loader.style.display = 'flex';
        body.style.display = 'none';

        let details = {
            title: game.title,
            description: game.description,
            screenshots: [game.image || game.thumbnail],
            requirements: {},
            url: game.open_giveaway,
            instructions: game.instructions || ""
        };

        try {
            if (game.source === 'gp') {
                const res = await fetch(`${GP_API_BASE}/giveaway?id=${game.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.title) {
                        details.title = data.title;
                        details.description = data.description || details.description;
                        details.screenshots = [data.image || data.thumbnail || details.screenshots[0]];
                        details.url = data.open_giveaway_url || data.open_giveaway || details.url;
                        details.instructions = data.instructions || details.instructions;
                    }
                }
            } else if (game.source === 'f2p') {
                const res = await fetch(`${FTG_API_BASE}/game?id=${game.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.title) {
                        details.title = data.title;
                        details.description = data.description || data.short_description || details.description;
                        details.screenshots = (data.screenshots && data.screenshots.length)
                            ? data.screenshots.map(s => s.image)
                            : details.screenshots;
                        details.requirements = data.minimum_system_requirements || {};
                        details.url = data.game_url || details.url;
                    }
                }
            }
        } catch (e) {
            console.warn("Detail fetch failed, using fallback data:", e);
        }

        loader.style.display = 'none';
        body.style.display = 'grid';

        document.getElementById('modalTitle').textContent = details.title;
        document.getElementById('modalDesc').innerHTML = (details.description || '').replace(/\n/g, '<br>');

        const mainImg = document.getElementById('modalMainImg');
        const thumbsWrap = document.getElementById('modalThumbnails');
        thumbsWrap.innerHTML = '';
        
        if (details.screenshots && details.screenshots.length > 0) {
            mainImg.src = details.screenshots[0];
            if (details.screenshots.length > 1) {
                details.screenshots.forEach((url, i) => {
                    const t = document.createElement('img');
                    t.src = url;
                    if (i === 0) t.classList.add('active');
                    t.addEventListener('click', () => {
                        mainImg.src = url;
                        thumbsWrap.querySelectorAll('img').forEach(x => x.classList.remove('active'));
                        t.classList.add('active');
                    });
                    thumbsWrap.appendChild(t);
                });
            }
        }

        const reqBox = document.getElementById('modalSysreq');
        const reqGrid = document.getElementById('modalSysreqGrid');
        if (details.requirements && Object.keys(details.requirements).length > 0) {
            reqBox.style.display = 'block';
            reqGrid.innerHTML = '';
            for (const [k, v] of Object.entries(details.requirements)) {
                reqGrid.innerHTML += `<div><strong>${k.toUpperCase()}</strong> ${v}</div>`;
            }
        } else {
            reqBox.style.display = 'none';
        }

        const instrBox = document.getElementById('modalInstructions');
        const instrText = document.getElementById('modalInstructionsText');
        if (details.instructions) {
            instrBox.style.display = 'block';
            instrText.innerHTML = details.instructions.replace(/\n/g, '<br>');
        } else {
            instrBox.style.display = 'none';
        }

        document.getElementById('modalClaimBtn').href = details.url || '#';
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('active');
        });
    }

    // ═══ News Feed (RSS via rss2json) ═══
    async function loadNews() {
        if (!newsLoader || !newsContainer) return;
        newsLoader.style.display = 'flex';
        newsContainer.style.display = 'none';

        const feeds = [
            { url: "https://www.pcgamer.com/rss/", source: "PC Gamer" },
            { url: "https://kotaku.com/rss", source: "Kotaku" }
        ];

        let articles = [];

        try {
            const feedPromises = feeds.map(f =>
                fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(f.url)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (!data || !data.items) return [];
                        return data.items.map(item => ({
                            title: item.title,
                            link: item.link,
                            description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 180) + '...',
                            pubDate: item.pubDate,
                            source: f.source,
                            image: item.thumbnail || (item.enclosure ? item.enclosure.link : '')
                        }));
                    })
                    .catch(() => [])
            );

            const results = await Promise.all(feedPromises);
            articles = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        } catch (e) {
            console.warn("News feed fetch issue:", e);
        }

        newsLoader.style.display = 'none';

        if (!articles.length) {
            newsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📡</div><h3>Feed temporarily unavailable</h3><p>Please check back shortly.</p></div>`;
            newsContainer.style.display = 'grid';
            return;
        }

        newsContainer.style.display = 'grid';
        newsContainer.innerHTML = '';
        const tpl = document.getElementById('newsCardTpl');

        articles.slice(0, 24).forEach((a, i) => {
            const clone = tpl.content.cloneNode(true);
            const card = clone.querySelector('.ncard');
            card.style.animationDelay = `${i * 0.03}s`;
            clone.querySelector('.ncard-title').textContent = a.title;
            clone.querySelector('.ncard-desc').textContent = a.description;
            clone.querySelector('.ncard-source').textContent = a.source;
            clone.querySelector('.ncard-read').href = a.link;
            
            const img = clone.querySelector('.ncard-img');
            if (a.image) {
                img.src = a.image;
                img.alt = a.title;
            } else {
                img.style.display = 'none';
                clone.querySelector('.ncard-img-wrap').style.cssText = 'height:60px;background:linear-gradient(135deg,var(--bg-surface),var(--bg-elevated));';
            }
            if (a.pubDate) {
                try {
                    clone.querySelector('.ncard-date').textContent = new Date(a.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch {
                    clone.querySelector('.ncard-date').textContent = a.pubDate;
                }
            }
            newsContainer.appendChild(clone);
        });
    }

    // ═══ Boot ═══
    fetchGamesData();
});
