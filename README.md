# 🎮 Gamehunt — Free Game Notifier & Tracker

> A modern, cyberpunk-inspired web application and notification system that aggregates 100% free games, giveaways, and loot across **Epic Games Store**, **Steam**, **GOG**, and more.

![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-brightgreen?style=for-the-badge&logo=github)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Modern_Design-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

🔗 **Live Website**: [https://prathaya96k.github.io/Free-Game-Notifier/](https://prathaya96k.github.io/Free-Game-Notifier/)

---

## ✨ Features

- 🎁 **Real-Time Freebies & Giveaways**: Automatically aggregates active game giveaways and 100% discount promotions using the GamerPower & FreeToGame APIs.
- 🎯 **Filter by Platform & Category**: Seamlessly filter between **All Platforms**, **PC**, **Steam**, **Epic Games Store**, and categories like **Full Games**, **DLCs**, and **Loot**.
- 🏷️ **Smart Genre Filtering**: Sort and filter by Action, RPG, Strategy, Horror, Puzzle, Simulation, Racing, Adventure, Sports, MMO, and more.
- 🔔 **Desktop Notifications**: Background scanning with optional desktop push notifications powered by `plyer` so you never miss a limited-time freebie.
- 📰 **Gaming News Feed**: Integrated gaming news aggregator keeping you informed on industry updates and newly announced giveaways.
- 💎 **Modern Dark UI**: Features interactive particle effects, glassmorphism cards, responsive navigation, and smooth micro-interactions.
- 🔍 **Detailed Modal Views**: Detailed inspect view with game descriptions, screenshots, claim instructions, and direct store links.

---

## 📁 Project Structure

```text
free game notifier/
├── static/
│   ├── script.js        # Dynamic frontend logic & API fetching
│   └── style.css        # Sleek dark cyberpunk UI styling
├── templates/
│   └── index.html       # Single-page web dashboard
├── .env.example         # Environment configuration template
├── .gitignore           # Git ignore rules for Python & web projects
├── app.py               # Flask backend & API aggregation service
├── README.md            # Project documentation
└── requirements.txt     # Python dependencies
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Python 3.8+** installed on your system.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/free-game-notifier.git
   cd free-game-notifier
   ```

2. **Create and activate a virtual environment (recommended)**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to:
   ```text
   http://127.0.0.1:5000
   ```

---

## 🌐 Deployment

### Deploying to Render / Railway / Heroku

This application can be deployed as a Python web service using `gunicorn`:

```bash
gunicorn app:app
```

> **Note on Desktop Notifications**: The desktop notification feature (`plyer`) runs when the app is operated locally on your desktop machine. In cloud-hosted server environments, web push notifications or browser-based notifications can be used instead.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, [Flask](https://flask.palletsprojects.com/)
- **Frontend**: Vanilla HTML5, Modern CSS3 (Glassmorphism & CSS Variables), JavaScript (Fetch API, Canvas animations)
- **Data APIs**: GamerPower API, FreeToGame API
- **Desktop Alerts**: Plyer

---

## 📜 License

This project is licensed under the MIT License - feel free to use and adapt it!
