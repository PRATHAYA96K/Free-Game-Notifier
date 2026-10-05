import re
import requests
from flask import Flask, render_template, jsonify, request
import threading
import time
import xml.etree.ElementTree as ET
from plyer import notification

app = Flask(__name__)

# ─── Global State ────────────────────────────────────────────────
NOTIFY_ENABLED = False
KNOWN_GAMES = set()
POLL_INTERVAL = 300
GP_API_BASE = "https://www.gamerpower.com/api"
FTG_API_BASE = "https://www.freetogame.com/api"

# ─── Genre Detection ────────────────────────────────────────────
GENRE_KEYWORDS = {
    "action": ["action", "shoot", "battle", "combat", "fight", "war", "fps", "shooter", "gun", "weapon", "slash"],
    "rpg": ["rpg", "role-playing", "role playing", "quest", "dungeon", "level up", "character class", "loot"],
    "strategy": ["strategy", "tactical", "tower defense", "rts", "turn-based", "command", "conquer", "civilization", "base build"],
    "horror": ["horror", "scary", "zombie", "undead", "survival horror", "fear", "dark", "creepy", "haunted", "nightmare"],
    "puzzle": ["puzzle", "match-3", "match 3", "brain", "logic", "riddle", "tetris", "sudoku"],
    "simulation": ["simulation", "simulator", "tycoon", "management", "farming", "build", "craft"],
    "racing": ["racing", "race", "driving", "car", "speed", "drift", "kart", "vehicle"],
    "adventure": ["adventure", "explore", "exploration", "journey", "open world", "story-driven", "narrative"],
    "sports": ["sport", "football", "soccer", "basketball", "baseball", "tennis", "golf", "athletic"],
    "mmo": ["mmo", "mmorpg", "massively multiplayer", "online multiplayer", "guild"],
    "3d": ["3d", "first-person", "third-person", "fps", "tps", "realistic", "vr", "virtual reality"],
    "2d": ["2d", "pixel", "platformer", "side-scroll", "top-down", "isometric", "retro", "arcade"],
    "1d": ["1d", "text-based", "text based", "interactive fiction", "mud", "cli"],
}

def detect_genres(text):
    text = (text or "").lower()
    matched = []
    for genre, keywords in GENRE_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                matched.append(genre)
                break
    return matched if matched else ["other"]

# ─── API Helpers ─────────────────────────────────────────────────

def fetch_gamerpower(platform="all", category="all"):
    try:
        plat = "pc" if platform == "all" else ("epic-games-store" if platform == "epic" else platform)
        url = f"{GP_API_BASE}/giveaways?sort-by=popularity" if platform == "all" and category in ["all", "f2p"] else f"{GP_API_BASE}/filter?platform={plat}&sort-by=popularity"
        if category not in ["all", "f2p"]:
            url += f"&type={category}"
        
        # If category is f2p, GamerPower doesn't really have a strict f2p category that matches the FreeToGame ones,
        # but we'll fetch anyway if it's "all" or specific DLC/Loot.
        if category == "f2p":
            return []

        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict) and data.get("status") == 0:
            return []

        games = []
        for g in (data if isinstance(data, list) else []):
            games.append({
                "source": "gp",
                "id": g.get("id"),
                "title": g.get("title", ""),
                "description": g.get("description", ""),
                "thumbnail": g.get("thumbnail", ""),
                "image": g.get("image", ""),
                "type": g.get("type", "GAME").upper(),
                "platforms": g.get("platforms", "PC"),
                "worth": g.get("worth", "N/A"),
                "end_date": g.get("end_date", "N/A"),
                "open_giveaway": g.get("open_giveaway_url", g.get("open_giveaway", "")),
                "genres": detect_genres(g.get("title", "") + " " + g.get("description", ""))
            })
        return games
    except Exception as e:
        print(f"[ERROR] Fetching GamerPower: {e}")
        return []

def fetch_freetogame(platform="all", category="all"):
    if category in ["dlc", "loot"]: 
        return [] # FreeToGame doesn't do DLCs/Loot usually

    try:
        url = f"{FTG_API_BASE}/games"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        games = []
        for g in (data if isinstance(data, list) else []):
            # Filter by platform string if needed (FreeToGame is PC mostly, but some might be browser)
            p_str = g.get("platform", "").lower()
            if platform == "steam" and "windows" not in p_str and "pc" not in p_str:
                continue
            if platform == "epic": # FreeToGame doesn't explicitly mark Epic, skip filtering or treat PC as all
                pass 

            games.append({
                "source": "f2p",
                "id": g.get("id"),
                "title": g.get("title", ""),
                "description": g.get("short_description", ""),
                "thumbnail": g.get("thumbnail", ""),
                "image": g.get("thumbnail", ""),
                "type": "F2P",
                "platforms": "PC, " + g.get("platform", ""),
                "worth": "FREE",
                "end_date": "N/A",
                "open_giveaway": g.get("game_url", ""),
                "genres": detect_genres(g.get("title", "") + " " + g.get("short_description", "") + " " + g.get("genre", ""))
            })
        return games
    except Exception as e:
        print(f"[ERROR] Fetching FreeToGame: {e}")
        return []

def fetch_news():
    feeds = [
        "https://www.pcgamer.com/rss/",
        "https://kotaku.com/rss",
        "https://www.gamespot.com/feeds/mashup/",
    ]
    articles = []
    for feed_url in feeds:
        try:
            resp = requests.get(feed_url, timeout=10, headers={"User-Agent": "FreeGameHunter/2.0"})
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            for item in root.findall(".//item"):
                title = item.findtext("title", "")
                link = item.findtext("link", "")
                desc = item.findtext("description", "")
                pub_date = item.findtext("pubDate", "")
                source = feed_url.split("/")[2].replace("www.", "")
                image = ""
                enclosure = item.find("enclosure")
                if enclosure is not None and "image" in enclosure.get("type", ""):
                    image = enclosure.get("url", "")
                if not image:
                    for ns in ["http://search.yahoo.com/mrss/", "media"]:
                        mc = item.find(f"{{{ns}}}content")
                        if mc is not None: image = mc.get("url", ""); break
                        mc = item.find(f"{{{ns}}}thumbnail")
                        if mc is not None: image = mc.get("url", ""); break
                if title and link:
                    clean_desc = re.sub(r"<[^>]+>", "", desc)[:200]
                    articles.append({
                        "title": title.strip(), "link": link.strip(),
                        "description": clean_desc.strip(), "pubDate": pub_date.strip(),
                        "source": source, "image": image,
                    })
        except Exception:
            continue
    articles.sort(key=lambda x: x.get("pubDate", ""), reverse=True)
    return articles[:30]

# ─── Background Poller ───────────────────────────────────────────

def background_poller():
    global KNOWN_GAMES
    initial = fetch_gamerpower()
    for g in initial: KNOWN_GAMES.add(g.get("id"))
    while True:
        if NOTIFY_ENABLED:
            games = fetch_gamerpower()
            for g in games:
                gid = g.get("id")
                if gid and gid not in KNOWN_GAMES:
                    KNOWN_GAMES.add(gid)
                    try:
                        notification.notify(
                            title=f"🎮 {g.get('title')}",
                            message=f"{g.get('platforms')} — {g.get('description', '')[:80]}",
                            app_name="Free Game Hunter", timeout=10,
                        )
                    except: pass
                    time.sleep(2)
        time.sleep(POLL_INTERVAL)

threading.Thread(target=background_poller, daemon=True).start()

# ─── Routes ──────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/games")
def get_games():
    platform = request.args.get("platform", "all")
    category = request.args.get("category", "all")
    genre = request.args.get("genre", "all")
    sort_by = request.args.get("sort", "trending")
    
    gp_games = fetch_gamerpower(platform=platform, category=category)
    ftg_games = fetch_freetogame(platform=platform, category=category)
    
    # Combine and sort
    all_games = gp_games + ftg_games
    
    if genre != "all":
        all_games = [g for g in all_games if genre in g.get("genres", [])]
        
    if sort_by == "top":
        # Proxy Top Rated by highest monetary value / worth
        def get_val(g):
            w = str(g.get("worth", "FREE")).upper().replace("$", "").replace("€", "").replace("£", "")
            if w == "FREE" or w == "N/A": return 0.0
            try: return float(w)
            except: return 0.0
        all_games.sort(key=get_val, reverse=True)
    elif sort_by == "recent":
        # Proxy Newest by id descending
        all_games.sort(key=lambda g: g.get("id", 0) if isinstance(g.get("id"), int) else 0, reverse=True)

    return jsonify(all_games)

@app.route("/api/game/<source>/<int:game_id>")
def get_game_details(source, game_id):
    if source == "f2p":
        try:
            resp = requests.get(f"{FTG_API_BASE}/game?id={game_id}", timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return jsonify({
                "title": data.get("title"),
                "description": data.get("description", data.get("short_description")),
                "screenshots": [s.get("image") for s in data.get("screenshots", [])],
                "requirements": data.get("minimum_system_requirements", {}),
                "url": data.get("game_url"),
                "instructions": ""
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    elif source == "gp":
        try:
            resp = requests.get(f"{GP_API_BASE}/giveaway?id={game_id}", timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return jsonify({
                "title": data.get("title"),
                "description": data.get("description"),
                "screenshots": [data.get("image") or data.get("thumbnail")],
                "requirements": {},
                "url": data.get("open_giveaway_url") or data.get("open_giveaway"),
                "instructions": data.get("instructions", "")
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "Unknown source"}), 400

@app.route("/api/news")
def get_news():
    return jsonify(fetch_news())

@app.route("/api/toggle-notify", methods=["POST"])
def toggle_notify():
    global NOTIFY_ENABLED
    NOTIFY_ENABLED = request.json.get("enabled", False)
    return jsonify({"status": "ok", "notify_enabled": NOTIFY_ENABLED})

@app.route("/api/notify-status")
def notify_status():
    return jsonify({"notify_enabled": NOTIFY_ENABLED})

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)


