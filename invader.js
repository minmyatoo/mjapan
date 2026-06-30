class TypingInvader {
  constructor() {
    this.canvas = document.getElementById("invaderCanvas");
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext("2d");
    this.input = document.getElementById("invaderInput");
    this.scoreEl = document.getElementById("invaderScore");
    this.livesEl = document.getElementById("invaderLives");
    this.startBtn = document.getElementById("startInvaderBtn");
    
    this.enemies = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.isRunning = false;
    this.animationFrameId = null;
    
    this.spawnRate = 2000;
    this.lastSpawn = 0;
    this.fallSpeed = 1.0;
    
    this.kanaPool = [];
    
    this.bindEvents();
  }
  
  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startGame());
    
    this.input.addEventListener("input", (e) => {
      if (!this.isRunning) return;
      
      const typed = e.target.value.toLowerCase().trim();
      if (!typed) return;
      
      // Find matching enemy
      const matchIndex = this.enemies.findIndex(enemy => 
        enemy.romaji.toLowerCase() === typed || enemy.burmese === typed
      );
      
      if (matchIndex !== -1) {
        const enemy = this.enemies[matchIndex];
        this.createExplosion(enemy.x, enemy.y);
        this.enemies.splice(matchIndex, 1);
        this.score += 10;
        this.scoreEl.textContent = this.score;
        this.input.value = "";
        
        // Increase difficulty slightly
        if (this.score % 50 === 0) {
          this.fallSpeed += 0.2;
          this.spawnRate = Math.max(800, this.spawnRate - 200);
        }
      }
    });
  }
  
  initPool() {
    // Collect all main kanas (hiragana + katakana)
    const script = window.currentScript || "hiragana";
    const data = window.kanaData[script];
    if (data) {
      this.kanaPool = data.main.filter(([s]) => s).map(([s, r, b]) => ({ symbol: s, romaji: r, burmese: b }));
    }
  }
  
  startGame() {
    this.initPool();
    if (this.kanaPool.length === 0) return;
    
    this.enemies = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.fallSpeed = 1.0;
    this.spawnRate = 2000;
    this.isRunning = true;
    this.lastSpawn = Date.now();
    
    this.scoreEl.textContent = this.score;
    this.updateLivesDisplay();
    
    this.startBtn.style.display = "none";
    this.input.style.display = "block";
    this.input.value = "";
    this.input.focus();
    
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = 400; // fixed height
    
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.gameLoop();
  }
  
  spawnEnemy() {
    const rKana = this.kanaPool[Math.floor(Math.random() * this.kanaPool.length)];
    const x = 40 + Math.random() * (this.canvas.width - 80);
    this.enemies.push({
      symbol: rKana.symbol,
      romaji: rKana.romaji,
      burmese: rKana.burmese,
      x: x,
      y: 0,
      radius: 20
    });
  }
  
  createExplosion(x, y) {
    for(let i=0; i<15; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: ['#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 3)]
      });
    }
  }
  
  updateLivesDisplay() {
    this.livesEl.innerHTML = Array(this.lives).fill('<i class="bi bi-heart-fill" style="color: #ef4444;"></i>').join(" ");
  }
  
  gameOver() {
    this.isRunning = false;
    this.startBtn.style.display = "inline-block";
    this.startBtn.textContent = "Play Again";
    this.input.style.display = "none";
    
    // Award Gamification XP based on score
    if (window.awardXP && this.score > 0) {
      window.awardXP(Math.floor(this.score / 5)); // 2 XP per kill
    }
    
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 30px 'Noto Sans JP'";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Game Over!", this.canvas.width / 2, this.canvas.height / 2 - 20);
    this.ctx.font = "20px 'Noto Sans JP'";
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
  }
  
  gameLoop() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    if (now - this.lastSpawn > this.spawnRate) {
      this.spawnEnemy();
      this.lastSpawn = now;
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and Draw Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let e = this.enemies[i];
      e.y += this.fallSpeed;
      
      this.ctx.fillStyle = window.getComputedStyle(document.body).getPropertyValue('--text').trim() || "#000";
      this.ctx.font = "bold 28px 'Noto Sans JP'";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(e.symbol, e.x, e.y);
      
      if (e.y > this.canvas.height) {
        this.enemies.splice(i, 1);
        this.lives--;
        this.updateLivesDisplay();
        
        // Visual flash for taking damage
        this.ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }
    
    // Update and Draw Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.life;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
      }
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.typingInvader = new TypingInvader();
});
