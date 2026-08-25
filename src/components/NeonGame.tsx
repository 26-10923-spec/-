import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Bullet, Enemy, EnemyType, Powerup, Particle, FloatingText, GameState, Perk } from '../types';
import { sound } from '../sound';
import { getRandomPerks } from '../perks';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Zap,
  Flame,
  Wind,
  Heart,
  Crosshair,
  Sparkles,
  Bot,
  Radio,
  Trophy,
  Shield,
  Clock,
  Swords,
  Pause,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onScoreUpdate?: (score: number) => void;
}

const PERK_ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-yellow-400" />,
  Flame: <Flame className="w-6 h-6 text-orange-400" />,
  Wind: <Wind className="w-6 h-6 text-cyan-400" />,
  Heart: <Heart className="w-6 h-6 text-rose-400" />,
  Crosshair: <Crosshair className="w-6 h-6 text-emerald-400" />,
  Sparkles: <Sparkles className="w-6 h-6 text-purple-400" />,
  Bot: <Bot className="w-6 h-6 text-sky-400" />,
  Radio: <Radio className="w-6 h-6 text-amber-400" />
};

export const NeonGame: React.FC<Props> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_high_score') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [wave, setWave] = useState<number>(1);
  const [hp, setHp] = useState<number>(3);
  const [maxHp, setMaxHp] = useState<number>(3);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [feverMeter, setFeverMeter] = useState<number>(0);
  const [isFever, setIsFever] = useState<boolean>(false);
  const [feverTimeLeft, setFeverTimeLeft] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoFire, setAutoFire] = useState<boolean>(true);

  // Upgrade selection modal
  const [offeredPerks, setOfferedPerks] = useState<Perk[]>([]);
  const [acquiredPerks, setAcquiredPerks] = useState<string[]>([]);

  // End game stats
  const [kills, setKills] = useState<number>(0);
  const [maxComboAchieved, setMaxComboAchieved] = useState<number>(0);
  const [survivedSeconds, setSurvivedSeconds] = useState<number>(0);

  // Boss state
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);

  // Game loop internal refs
  const gameRef = useRef<{
    player: Player;
    bullets: Bullet[];
    enemies: Enemy[];
    powerups: Powerup[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    stars: { x: number; y: number; size: number; speed: number; alpha: number }[];
    keys: Record<string, boolean>;
    mouse: { x: number; y: number; isDown: boolean };
    touchJoy: { active: boolean; startX: number; startY: number; currX: number; currY: number; vx: number; vy: number };
    screenShake: number;
    wave: number;
    score: number;
    kills: number;
    combo: number;
    comboTimer: number;
    maxCombo: number;
    feverMeter: number;
    isFever: boolean;
    feverTimer: number;
    feverCount: number;
    lastWaveSpawn: number;
    enemiesToSpawn: number;
    waveCleared: boolean;
    droneAngle: number;
    lastDroneShot: number;
    startTime: number;
    elapsedSec: number;
    acquiredPerks: string[];
    slowMotionTimer: number;
  }>({
    player: {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 16,
      speed: 5.2,
      angle: 0,
      hp: 3,
      maxHp: 3,
      shield: false,
      fireRate: 4.5,
      lastFired: 0,
      tripleShotTimer: 0,
      rapidFireTimer: 0,
      magnetRadius: 100,
      pierceCount: 0,
      bulletDamage: 1,
      critChance: 0.1,
      hasDrone: false,
      invulnerableTimer: 0,
    },
    bullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    floatingTexts: [],
    stars: [],
    keys: {},
    mouse: { x: 400, y: 300, isDown: false },
    touchJoy: { active: false, startX: 0, startY: 0, currX: 0, currY: 0, vx: 0, vy: 0 },
    screenShake: 0,
    wave: 1,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    feverMeter: 0,
    isFever: false,
    feverTimer: 0,
    feverCount: 0,
    lastWaveSpawn: 0,
    enemiesToSpawn: 10,
    waveCleared: false,
    droneAngle: 0,
    lastDroneShot: 0,
    startTime: 0,
    elapsedSec: 0,
    acquiredPerks: [],
    slowMotionTimer: 0,
  });

  const nextBulletId = useRef(1);
  const nextEnemyId = useRef(1);
  const nextPowerupId = useRef(1);
  const nextTextId = useRef(1);
  const animFrameId = useRef<number | null>(null);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  // Add floating text
  const addFloatingText = (x: number, y: number, text: string, color: string, size = 16) => {
    gameRef.current.floatingTexts.push({
      id: nextTextId.current++,
      x,
      y,
      text,
      color,
      alpha: 1,
      size,
      vy: -1.2,
    });
  };

  // Particle explosion
  const createExplosion = (x: number, y: number, color: string, count = 18, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedMult;
      gameRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 20,
        glow: true,
      });
    }
  };

  // Initialize game stars
  const initStars = (width: number, height: number) => {
    const stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    gameRef.current.stars = stars;
  };

  // Start / Restart Game
  const startGame = () => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 600;

    gameRef.current = {
      player: {
        x: w / 2,
        y: h / 2,
        vx: 0,
        vy: 0,
        radius: 16,
        speed: 5.2,
        angle: -Math.PI / 2,
        hp: 3,
        maxHp: 3,
        shield: false,
        fireRate: 4.5,
        lastFired: 0,
        tripleShotTimer: 0,
        rapidFireTimer: 0,
        magnetRadius: 100,
        pierceCount: 0,
        bulletDamage: 1,
        critChance: 0.1,
        hasDrone: false,
        invulnerableTimer: 60, // spawn protection
      },
      bullets: [],
      enemies: [],
      powerups: [],
      particles: [],
      floatingTexts: [],
      stars: gameRef.current.stars.length ? gameRef.current.stars : [],
      keys: {},
      mouse: { x: w / 2, y: h / 2 - 100, isDown: false },
      touchJoy: { active: false, startX: 0, startY: 0, currX: 0, currY: 0, vx: 0, vy: 0 },
      screenShake: 0,
      wave: 1,
      score: 0,
      kills: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      feverMeter: 0,
      isFever: false,
      feverTimer: 0,
      feverCount: 0,
      lastWaveSpawn: Date.now(),
      enemiesToSpawn: 8,
      waveCleared: false,
      droneAngle: 0,
      lastDroneShot: 0,
      startTime: Date.now(),
      elapsedSec: 0,
      acquiredPerks: [],
      slowMotionTimer: 0,
    };

    if (!gameRef.current.stars.length) {
      initStars(w, h);
    }

    setScore(0);
    setWave(1);
    setHp(3);
    setMaxHp(3);
    setHasShield(false);
    setCombo(0);
    setFeverMeter(0);
    setIsFever(false);
    setKills(0);
    setBossHp(null);
    setBossMaxHp(null);
    setAcquiredPerks([]);

    setGameState('PLAYING');
    addFloatingText(w / 2, h / 2 - 40, 'WAVE 1 START!', '#38bdf8', 22);
  };

  // Trigger Wave Cleared & Upgrade
  const triggerWaveCleared = () => {
    const nextWave = gameRef.current.wave + 1;
    gameRef.current.wave = nextWave;
    gameRef.current.enemiesToSpawn = 8 + nextWave * 4;
    setWave(nextWave);

    // Pick 3 random perks
    const perks = getRandomPerks(3, gameRef.current.acquiredPerks);
    setOfferedPerks(perks);
    setGameState('UPGRADE_SELECT');
    sound.playPowerup();
  };

  // Apply Perk Upgrade
  const selectPerk = (perk: Perk) => {
    const p = gameRef.current.player;
    gameRef.current.acquiredPerks.push(perk.id);
    setAcquiredPerks([...gameRef.current.acquiredPerks]);

    switch (perk.id) {
      case 'FIRE_RATE':
        p.fireRate *= 1.35;
        break;
      case 'DAMAGE_UP':
        p.bulletDamage += 0.5;
        break;
      case 'SPEED_UP':
        p.speed *= 1.25;
        break;
      case 'MAX_HP':
        p.maxHp += 1;
        p.hp = p.maxHp;
        setMaxHp(p.maxHp);
        setHp(p.hp);
        break;
      case 'PIERCE':
        p.pierceCount += 1;
        break;
      case 'CRIT_CHANCE':
        p.critChance += 0.25;
        break;
      case 'DRONE':
        p.hasDrone = true;
        break;
      case 'MAGNET':
        p.magnetRadius *= 3;
        break;
    }

    // Resume playing
    setGameState('PLAYING');
    const canvas = canvasRef.current;
    if (canvas) {
      addFloatingText(canvas.width / 2, canvas.height / 2, `WAVE ${gameRef.current.wave} START!`, '#4ade80', 24);
    }
  };

  // Trigger Game Over
  const triggerGameOver = () => {
    setGameState('GAMEOVER');
    sound.playGameOver();
    const finalScore = gameRef.current.score;
    setKills(gameRef.current.kills);
    setMaxComboAchieved(gameRef.current.maxCombo);
    setSurvivedSeconds(Math.floor((Date.now() - gameRef.current.startTime) / 1000));

    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        localStorage.setItem('neon_high_score', finalScore.toString());
      } catch {}
    }
  };

  // Spawn Enemy
  const spawnEnemy = (width: number, height: number) => {
    const curWave = gameRef.current.wave;
    const isBossWave = curWave % 5 === 0;

    // Check if boss already spawned
    const hasBoss = gameRef.current.enemies.some((e) => e.type === 'BOSS');
    if (isBossWave && !hasBoss && gameRef.current.enemiesToSpawn <= 1) {
      // Spawn Boss
      const bossHp = 120 + curWave * 40;
      gameRef.current.enemies.push({
        id: nextEnemyId.current++,
        type: 'BOSS',
        x: width / 2,
        y: -50,
        vx: 0,
        vy: 0,
        radius: 36,
        hp: bossHp,
        maxHp: bossHp,
        speed: 1.2,
        color: '#f43f5e',
        scoreValue: 2000,
        shootCooldown: 0,
        angle: 0,
      });
      setBossHp(bossHp);
      setBossMaxHp(bossHp);
      addFloatingText(width / 2, 80, '⚠️ WARNING: BOSS APPROACHING! ⚠️', '#f43f5e', 24);
      gameRef.current.screenShake = 15;
      return;
    }

    // Regular Enemy Spawn from edge
    let x = 0;
    let y = 0;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      x = Math.random() * width;
      y = -20;
    } else if (edge === 1) {
      x = width + 20;
      y = Math.random() * height;
    } else if (edge === 2) {
      x = Math.random() * width;
      y = height + 20;
    } else {
      x = -20;
      y = Math.random() * height;
    }

    // Determine type
    const roll = Math.random();
    let type: EnemyType = 'SCOUT';
    let radius = 13;
    let hp = 1;
    let speed = 2.4 + Math.min(curWave * 0.1, 1.8);
    let color = '#ef4444';
    let scoreVal = 100;

    if (curWave >= 2 && roll > 0.65) {
      type = 'DASHER';
      radius = 12;
      hp = 1;
      speed = 1.6;
      color = '#c084fc';
      scoreVal = 150;
    } else if (curWave >= 3 && roll > 0.45 && roll <= 0.65) {
      type = 'SHOOTER';
      radius = 15;
      hp = 2 + Math.floor(curWave / 3);
      speed = 1.4;
      color = '#38bdf8';
      scoreVal = 250;
    } else if (curWave >= 4 && roll > 0.3 && roll <= 0.45) {
      type = 'TANK';
      radius = 22;
      hp = 5 + Math.floor(curWave * 1.2);
      speed = 1.1;
      color = '#22c55e';
      scoreVal = 350;
    }

    gameRef.current.enemies.push({
      id: nextEnemyId.current++,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      color,
      scoreValue: scoreVal,
      shootCooldown: 0,
      dashCooldown: Math.random() * 60 + 60,
      isDashing: false,
      dashTimer: 0,
      angle: 0,
    });
  };

  // Spawn Powerup Drop
  const maybeDropPowerup = (x: number, y: number) => {
    if (Math.random() > 0.22) return; // 22% drop rate

    const types: { type: Powerup['type']; color: string; icon: string }[] = [
      { type: 'TRIPLE', color: '#facc15', icon: '⚡' },
      { type: 'SHIELD', color: '#38bdf8', icon: '🛡️' },
      { type: 'NUKE', color: '#f97316', icon: '💣' },
      { type: 'SLOW', color: '#a855f7', icon: '⏱️' },
      { type: 'HEALTH', color: '#ec4899', icon: '❤️' },
      { type: 'RAPID', color: '#4ade80', icon: '🚀' },
    ];

    const chosen = types[Math.floor(Math.random() * types.length)];
    gameRef.current.powerups.push({
      id: nextPowerupId.current++,
      type: chosen.type,
      x,
      y,
      radius: 14,
      duration: 600, // 10 seconds before blinking out
      color: chosen.color,
      icon: chosen.icon,
    });
  };

  // Spawn Player Bullets
  const firePlayerBullet = (isDrone = false, droneX = 0, droneY = 0) => {
    const p = gameRef.current.player;
    const isFeverActive = gameRef.current.isFever;
    const isTriple = p.tripleShotTimer > 0 || isFeverActive;

    const startX = isDrone ? droneX : p.x;
    const startY = isDrone ? droneY : p.y;
    const baseAngle = isDrone
      ? Math.atan2(gameRef.current.mouse.y - startY, gameRef.current.mouse.x - startX)
      : p.angle;

    const angles = isTriple ? [baseAngle - 0.22, baseAngle, baseAngle + 0.22] : [baseAngle];
    if (isFeverActive) {
      angles.push(baseAngle - 0.44, baseAngle + 0.44);
    }

    const speed = 14;
    angles.forEach((ang) => {
      const isCrit = Math.random() < p.critChance;
      const dmg = (p.bulletDamage * (isCrit ? 2.5 : 1)) * (isFeverActive ? 1.5 : 1);
      const bulletColor = isFeverActive
        ? `hsl(${Math.floor(Math.random() * 360)}, 100%, 65%)`
        : isCrit
        ? '#fbbf24'
        : '#38bdf8';

      gameRef.current.bullets.push({
        id: nextBulletId.current++,
        x: startX + Math.cos(ang) * 16,
        y: startY + Math.sin(ang) * 16,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: isCrit ? 5 : isFeverActive ? 6 : 4,
        color: bulletColor,
        damage: dmg,
        pierce: p.pierceCount,
        isFever: isFeverActive,
        isCrit,
      });
    });

    sound.playShoot(isFeverActive ? 'fever' : 'normal');
  };

  // Setup input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        gameRef.current.keys['space'] = true;
      }
      if (e.key === 'Escape') {
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = false;
      if (e.key === ' ' || e.key === 'Spacebar') {
        gameRef.current.keys['space'] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      gameRef.current.mouse.x = e.clientX - rect.left;
      gameRef.current.mouse.y = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        gameRef.current.mouse.isDown = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        gameRef.current.mouse.isDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Responsive Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      if (gameRef.current.stars.length === 0) {
        initStars(canvas.width, canvas.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Game Loop
  const updateAndRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const state = gameRef.current;
    const p = state.player;

    // Clear with semi-transparent dark cyber background for motion trail
    ctx.save();
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
      state.screenShake *= 0.9;
      if (state.screenShake < 0.2) state.screenShake = 0;
    }

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw Subtle Cyber Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    const gridSize = 48;
    const timeOffset = (Date.now() * 0.02) % gridSize;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = timeOffset; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Stars
    state.stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > height) star.y = 0;
      ctx.fillStyle = `rgba(148, 163, 184, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // GAME PLAYING LOGIC
    if (gameState === 'PLAYING') {
      const isSlow = state.slowMotionTimer > 0;
      if (isSlow) state.slowMotionTimer--;

      // 1. Handle Player Movement (Keyboard / Joystick)
      let moveX = 0;
      let moveY = 0;
      if (state.keys['w'] || state.keys['arrowup']) moveY -= 1;
      if (state.keys['s'] || state.keys['arrowdown']) moveY += 1;
      if (state.keys['a'] || state.keys['arrowleft']) moveX -= 1;
      if (state.keys['d'] || state.keys['arrowright']) moveX += 1;

      if (state.touchJoy.active) {
        moveX += state.touchJoy.vx;
        moveY += state.touchJoy.vy;
      }

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        const normX = moveX / len;
        const normY = moveY / len;
        p.vx = normX * p.speed;
        p.vy = normY * p.speed;
      } else {
        p.vx *= 0.82;
        p.vy *= 0.82;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Bound to screen
      p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(height - p.radius, p.y));

      // Player Aim Angle (points to mouse or nearest enemy or move direction)
      const dx = state.mouse.x - p.x;
      const dy = state.mouse.y - p.y;
      if (Math.hypot(dx, dy) > 10) {
        p.angle = Math.atan2(dy, dx);
      } else if (Math.hypot(p.vx, p.vy) > 0.5) {
        p.angle = Math.atan2(p.vy, p.vx);
      }

      // Thruster particle trail
      if (Math.hypot(p.vx, p.vy) > 0.5 || Math.random() < 0.3) {
        const backAngle = p.angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const exhaustSpeed = Math.random() * 2 + 1;
        state.particles.push({
          x: p.x - Math.cos(p.angle) * 12,
          y: p.y - Math.sin(p.angle) * 12,
          vx: Math.cos(backAngle) * exhaustSpeed,
          vy: Math.sin(backAngle) * exhaustSpeed,
          radius: Math.random() * 2.5 + 1.5,
          color: state.isFever ? '#f43f5e' : '#38bdf8',
          alpha: 0.8,
          life: 0,
          maxLife: 15,
        });
      }

      // 2. Firing Logic
      const now = Date.now();
      const fireInterval = 1000 / (p.fireRate * (p.rapidFireTimer > 0 ? 2.2 : 1) * (state.isFever ? 2.5 : 1));
      const shouldFire = autoFire || state.mouse.isDown || state.keys['space'];

      if (shouldFire && now - p.lastFired >= fireInterval) {
        p.lastFired = now;
        firePlayerBullet();
      }

      // Drone Logic
      if (p.hasDrone) {
        state.droneAngle += 0.05;
        const droneDist = 38;
        const droneX = p.x + Math.cos(state.droneAngle) * droneDist;
        const droneY = p.y + Math.sin(state.droneAngle) * droneDist;

        if (now - state.lastDroneShot > 400) {
          state.lastDroneShot = now;
          // Target nearest enemy
          let nearest: Enemy | null = null;
          let minDist = 350;
          state.enemies.forEach((e) => {
            const d = Math.hypot(e.x - droneX, e.y - droneY);
            if (d < minDist) {
              minDist = d;
              nearest = e;
            }
          });
          if (nearest) {
            const droneFireAngle = Math.atan2((nearest as Enemy).y - droneY, (nearest as Enemy).x - droneX);
            state.bullets.push({
              id: nextBulletId.current++,
              x: droneX,
              y: droneY,
              vx: Math.cos(droneFireAngle) * 12,
              vy: Math.sin(droneFireAngle) * 12,
              radius: 3,
              color: '#38bdf8',
              damage: p.bulletDamage * 0.8,
              pierce: 0,
              isFever: false,
              isCrit: false,
            });
            sound.playShoot('normal');
          }
        }
      }

      // Timers decrement
      if (p.tripleShotTimer > 0) p.tripleShotTimer--;
      if (p.rapidFireTimer > 0) p.rapidFireTimer--;
      if (p.invulnerableTimer > 0) p.invulnerableTimer--;

      // Fever Mode Countdown
      if (state.isFever) {
        state.feverTimer--;
        setFeverTimeLeft(Math.ceil(state.feverTimer / 60));
        if (state.feverTimer <= 0) {
          state.isFever = false;
          state.feverMeter = 0;
          setIsFever(false);
          setFeverMeter(0);
        }
      } else {
        // Combo decay
        if (state.combo > 0) {
          state.comboTimer--;
          if (state.comboTimer <= 0) {
            state.combo = 0;
            setCombo(0);
          }
        }
      }

      // 3. Enemy Spawning & Wave Progression
      if (state.enemiesToSpawn > 0 && now - state.lastWaveSpawn > 800) {
        state.lastWaveSpawn = now;
        spawnEnemy(width, height);
        state.enemiesToSpawn--;
      }

      // Check Wave Completion
      if (state.enemiesToSpawn <= 0 && state.enemies.length === 0) {
        triggerWaveCleared();
      }

      // 4. Update Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // Remove offscreen
        if (b.x < -20 || b.x > width + 20 || b.y < -20 || b.y > height + 20) {
          state.bullets.splice(i, 1);
          continue;
        }

        // Enemy bullets hitting player
        if (b.isEnemy) {
          const distToPlayer = Math.hypot(b.x - p.x, b.y - p.y);
          if (distToPlayer < p.radius + b.radius && p.invulnerableTimer <= 0) {
            state.bullets.splice(i, 1);
            if (p.shield) {
              p.shield = false;
              setHasShield(false);
              p.invulnerableTimer = 40;
              createExplosion(p.x, p.y, '#38bdf8', 12);
              sound.playHit();
            } else {
              p.hp -= 1;
              setHp(p.hp);
              p.invulnerableTimer = 60;
              state.screenShake = 12;
              createExplosion(p.x, p.y, '#ef4444', 20);
              sound.playExplosion(false);

              if (p.hp <= 0) {
                triggerGameOver();
                break;
              }
            }
            continue;
          }
        }
      }

      // 5. Update Enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const spdMult = isSlow ? 0.45 : 1;

        // Movement AI
        const edx = p.x - e.x;
        const edy = p.y - e.y;
        const eDist = Math.hypot(edx, edy);
        e.angle = Math.atan2(edy, edx);

        if (e.type === 'DASHER') {
          if (e.isDashing) {
            e.dashTimer = (e.dashTimer || 0) - 1;
            e.x += e.vx * spdMult;
            e.y += e.vy * spdMult;
            if ((e.dashTimer || 0) <= 0) {
              e.isDashing = false;
              e.dashCooldown = 90;
            }
          } else {
            e.dashCooldown = (e.dashCooldown || 90) - 1;
            if ((e.dashCooldown || 0) <= 0 && eDist < 260) {
              e.isDashing = true;
              e.dashTimer = 22;
              e.vx = Math.cos(e.angle) * 9;
              e.vy = Math.sin(e.angle) * 9;
            } else {
              e.x += (Math.cos(e.angle) * e.speed * 0.8) * spdMult;
              e.y += (Math.sin(e.angle) * e.speed * 0.8) * spdMult;
            }
          }
        } else if (e.type === 'SHOOTER') {
          if (eDist > 180) {
            e.x += Math.cos(e.angle) * e.speed * spdMult;
            e.y += Math.sin(e.angle) * e.speed * spdMult;
          } else {
            // Orbit
            e.x += Math.cos(e.angle + Math.PI / 2) * e.speed * spdMult;
            e.y += Math.sin(e.angle + Math.PI / 2) * e.speed * spdMult;
          }

          e.shootCooldown = (e.shootCooldown || 0) + 1;
          if (e.shootCooldown > 120) {
            e.shootCooldown = 0;
            state.bullets.push({
              id: nextBulletId.current++,
              x: e.x,
              y: e.y,
              vx: Math.cos(e.angle) * 4.5,
              vy: Math.sin(e.angle) * 4.5,
              radius: 5,
              color: '#f87171',
              damage: 1,
              pierce: 0,
              isFever: false,
              isCrit: false,
              isEnemy: true,
            });
          }
        } else if (e.type === 'BOSS') {
          // Boss moves towards screen center/upper area
          const targetY = 140;
          e.y += ((targetY - e.y) * 0.02 + Math.sin(Date.now() * 0.002) * 1.5) * spdMult;
          e.x += (Math.cos(Date.now() * 0.0015) * 2) * spdMult;

          e.shootCooldown = (e.shootCooldown || 0) + 1;
          if (e.shootCooldown > 75) {
            e.shootCooldown = 0;
            // 8-way bullet ring
            for (let k = 0; k < 8; k++) {
              const ang = (k * Math.PI) / 4 + (Date.now() * 0.001);
              state.bullets.push({
                id: nextBulletId.current++,
                x: e.x,
                y: e.y,
                vx: Math.cos(ang) * 4,
                vy: Math.sin(ang) * 4,
                radius: 6,
                color: '#fb7185',
                damage: 1,
                pierce: 0,
                isFever: false,
                isCrit: false,
                isEnemy: true,
              });
            }
          }
        } else {
          // Basic Scout or Tank
          e.x += (Math.cos(e.angle) * e.speed) * spdMult;
          e.y += (Math.sin(e.angle) * e.speed) * spdMult;
        }

        // Check collision with player
        if (eDist < p.radius + e.radius && p.invulnerableTimer <= 0) {
          if (p.shield) {
            p.shield = false;
            setHasShield(false);
            p.invulnerableTimer = 40;
            createExplosion(p.x, p.y, '#38bdf8', 12);
            sound.playHit();
          } else {
            p.hp -= 1;
            setHp(p.hp);
            p.invulnerableTimer = 60;
            state.screenShake = 12;
            createExplosion(p.x, p.y, '#ef4444', 20);
            sound.playExplosion(false);

            if (p.hp <= 0) {
              triggerGameOver();
              break;
            }
          }
        }

        // Bullet vs Enemy Collision
        for (let j = state.bullets.length - 1; j >= 0; j--) {
          const b = state.bullets[j];
          if (b.isEnemy) continue;

          const distEB = Math.hypot(b.x - e.x, b.y - e.y);
          if (distEB < e.radius + b.radius) {
            e.hp -= b.damage;
            sound.playHit();

            // Hit spark
            createExplosion(b.x, b.y, b.color, 4, 0.5);

            // Floating damage
            addFloatingText(e.x + (Math.random() - 0.5) * 14, e.y - 12, `${b.damage.toFixed(0)}`, b.isCrit ? '#fbbf24' : '#ffffff', b.isCrit ? 18 : 13);

            if (b.pierce > 0) {
              b.pierce--;
            } else {
              state.bullets.splice(j, 1);
            }

            // If Boss, update boss HP bar
            if (e.type === 'BOSS') {
              setBossHp(Math.max(0, e.hp));
            }

            // Enemy Killed
            if (e.hp <= 0) {
              const isBoss = e.type === 'BOSS';
              createExplosion(e.x, e.y, e.color, isBoss ? 45 : 18, isBoss ? 2 : 1);
              sound.playExplosion(isBoss);
              state.screenShake = isBoss ? 20 : 4;

              // Combo update
              state.combo += 1;
              state.comboTimer = 180; // 3 seconds
              if (state.combo > state.maxCombo) {
                state.maxCombo = state.combo;
              }
              setCombo(state.combo);

              // Calculate score with combo multiplier
              const comboBonus = 1 + Math.min(state.combo * 0.1, 4.0);
              const earnedScore = Math.floor(e.scoreValue * comboBonus * (state.isFever ? 2 : 1));
              state.score += earnedScore;
              setScore(state.score);
              state.kills += 1;

              addFloatingText(e.x, e.y - 20, `+${earnedScore}`, '#facc15', isBoss ? 24 : 16);

              // Fever meter boost
              if (!state.isFever) {
                state.feverMeter = Math.min(100, state.feverMeter + (isBoss ? 40 : 8));
                setFeverMeter(state.feverMeter);
                if (state.feverMeter >= 100) {
                  state.isFever = true;
                  state.feverTimer = 360; // 6 seconds
                  state.feverCount++;
                  setIsFever(true);
                  sound.playFever();
                  addFloatingText(width / 2, height / 2 - 60, '🔥 FEVER MODE ACTIVATED! 🔥', '#f43f5e', 28);
                }
              }

              // Tank splits into micro scouts
              if (e.type === 'TANK') {
                for (let k = 0; k < 2; k++) {
                  state.enemies.push({
                    id: nextEnemyId.current++,
                    type: 'SCOUT',
                    x: e.x + (k === 0 ? -12 : 12),
                    y: e.y,
                    vx: 0,
                    vy: 0,
                    radius: 10,
                    hp: 1,
                    maxHp: 1,
                    speed: 3.2,
                    color: '#ef4444',
                    scoreValue: 70,
                    angle: 0,
                  });
                }
              }

              if (isBoss) {
                setBossHp(null);
                setBossMaxHp(null);
                addFloatingText(width / 2, height / 2 - 20, '★ BOSS DEFEATED! ★', '#38bdf8', 30);
              }

              maybeDropPowerup(e.x, e.y);
              state.enemies.splice(i, 1);
              break;
            }
          }
        }
      }

      // 6. Update Powerups & Magnetism
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const item = state.powerups[i];
        item.duration--;
        if (item.duration <= 0) {
          state.powerups.splice(i, 1);
          continue;
        }

        // Magnet attraction to player
        const distP = Math.hypot(p.x - item.x, p.y - item.y);
        if (distP < p.magnetRadius) {
          const mAngle = Math.atan2(p.y - item.y, p.x - item.x);
          item.x += Math.cos(mAngle) * 7.5;
          item.y += Math.sin(mAngle) * 7.5;
        }

        // Pickup
        if (distP < p.radius + item.radius) {
          sound.playPowerup();
          createExplosion(item.x, item.y, item.color, 12);

          switch (item.type) {
            case 'TRIPLE':
              p.tripleShotTimer = 480; // 8 sec
              addFloatingText(p.x, p.y - 25, 'TRIPLE LASER!', item.color, 18);
              break;
            case 'SHIELD':
              p.shield = true;
              setHasShield(true);
              addFloatingText(p.x, p.y - 25, 'ENERGY SHIELD!', item.color, 18);
              break;
            case 'RAPID':
              p.rapidFireTimer = 480;
              addFloatingText(p.x, p.y - 25, 'RAPID FIRE!', item.color, 18);
              break;
            case 'SLOW':
              state.slowMotionTimer = 360;
              addFloatingText(p.x, p.y - 25, 'CHRONO FREEZE!', item.color, 18);
              break;
            case 'HEALTH':
              p.hp = Math.min(p.maxHp, p.hp + 1);
              setHp(p.hp);
              addFloatingText(p.x, p.y - 25, '+1 HP REPAIR!', item.color, 18);
              break;
            case 'NUKE':
              state.enemies.forEach((en) => {
                createExplosion(en.x, en.y, en.color, 14);
                state.score += en.scoreValue;
              });
              state.enemies = [];
              state.screenShake = 22;
              sound.playExplosion(true);
              addFloatingText(width / 2, height / 2, '💥 EMP NUKE BLAST!', item.color, 28);
              break;
          }

          state.powerups.splice(i, 1);
        }
      }
    }

    // 7. Render Powerups
    state.powerups.forEach((item) => {
      ctx.save();
      const blink = item.duration < 120 && Math.floor(item.duration / 8) % 2 === 0;
      if (!blink) {
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, item.x, item.y);
      }
      ctx.restore();
    });

    // 8. Render Bullets
    state.bullets.forEach((b) => {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.isCrit || b.isFever ? 16 : 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. Render Enemies
    state.enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;

      if (e.type === 'SCOUT') {
        // Red triangle
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.3, 0);
        ctx.lineTo(-e.radius, -e.radius * 0.8);
        ctx.lineTo(-e.radius * 0.5, 0);
        ctx.lineTo(-e.radius, e.radius * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'DASHER') {
        // Diamond shape with charge glow
        ctx.fillStyle = e.isDashing ? '#ffffff' : e.color;
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.5, 0);
        ctx.lineTo(0, -e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.lineTo(0, e.radius);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'SHOOTER') {
        // Circular core with ring
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'TANK') {
        // Heavy hexagon
        ctx.fillStyle = e.color;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const px = Math.cos(a) * e.radius;
          const py = Math.sin(a) * e.radius;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'BOSS') {
        // Giant Boss Titan
        ctx.fillStyle = e.color;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const px = Math.cos(a) * e.radius;
          const py = Math.sin(a) * e.radius;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Pulsing boss eye
        const eyeSize = 12 + Math.sin(Date.now() * 0.01) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Enemy HP Bar for multi-hp non-boss enemies
      if (e.maxHp > 1 && e.type !== 'BOSS') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(e.x - 16, e.y - e.radius - 8, 32, 4);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - 16, e.y - e.radius - 8, (32 * Math.max(0, e.hp)) / e.maxHp, 4);
      }
    });

    // 10. Render Player Ship
    if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'UPGRADE_SELECT') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Invulnerability blink
      const isInvul = p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 4) % 2 === 0;

      if (!isInvul) {
        // Energy Shield bubble
        if (p.shield) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Ship Body
        ctx.shadowColor = state.isFever ? '#f43f5e' : '#38bdf8';
        ctx.shadowBlur = state.isFever ? 24 : 14;
        ctx.fillStyle = state.isFever ? '#f43f5e' : '#0284c7';

        ctx.beginPath();
        ctx.moveTo(p.radius * 1.4, 0); // nose
        ctx.lineTo(-p.radius, -p.radius * 0.9); // left wing
        ctx.lineTo(-p.radius * 0.4, 0); // center notch
        ctx.lineTo(-p.radius, p.radius * 0.9); // right wing
        ctx.closePath();
        ctx.fill();

        // Cockpit canopy
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(p.radius * 0.2, 0, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Render Guardian Drone
      if (p.hasDrone) {
        const droneDist = 38;
        const dx = p.x + Math.cos(state.droneAngle) * droneDist;
        const dy = p.y + Math.sin(state.droneAngle) * droneDist;

        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 11. Render Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life++;
      pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

      if (pt.life >= pt.maxLife) {
        state.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      if (pt.glow) {
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 12. Render Floating Texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;

      if (ft.alpha <= 0) {
        state.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = `bold ${ft.size}px monospace, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Render Virtual Joystick if active on touch
    if (state.touchJoy.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.touchJoy.startX, state.touchJoy.startY, 45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.beginPath();
      ctx.arc(state.touchJoy.currX, state.touchJoy.currY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    animFrameId.current = requestAnimationFrame(updateAndRender);
  }, [gameState, autoFire]);

  // Launch / loop effect
  useEffect(() => {
    animFrameId.current = requestAnimationFrame(updateAndRender);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [updateAndRender]);

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    gameRef.current.touchJoy = {
      active: true,
      startX: tx,
      startY: ty,
      currX: tx,
      currY: ty,
      vx: 0,
      vy: 0,
    };
    gameRef.current.mouse.x = tx;
    gameRef.current.mouse.y = ty;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    const joy = gameRef.current.touchJoy;
    if (joy.active) {
      const dx = tx - joy.startX;
      const dy = ty - joy.startY;
      const dist = Math.hypot(dx, dy);
      const maxRadius = 45;
      if (dist > maxRadius) {
        joy.currX = joy.startX + (dx / dist) * maxRadius;
        joy.currY = joy.startY + (dy / dist) * maxRadius;
      } else {
        joy.currX = tx;
        joy.currY = ty;
      }
      joy.vx = (joy.currX - joy.startX) / maxRadius;
      joy.vy = (joy.currY - joy.startY) / maxRadius;
    }
  };

  const handleTouchEnd = () => {
    gameRef.current.touchJoy = {
      active: false,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
      vx: 0,
      vy: 0,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-slate-950 overflow-hidden select-none font-sans text-slate-100 flex flex-col"
    >
      {/* Top HUD Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        {/* Left: Health & Shield */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxHp }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-6 h-6 transition-all duration-300 ${
                  idx < hp ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-700 scale-90'
                }`}
              />
            ))}
          </div>
          {hasShield && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>SHIELD</span>
            </div>
          )}
        </div>

        {/* Center: Score & Combo & Fever Gauge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 font-mono">
              {score.toLocaleString()}
            </span>
            {combo > 1 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/60 text-amber-400 text-xs font-bold animate-pulse">
                {combo}x COMBO
              </span>
            )}
          </div>

          {/* Fever Bar */}
          <div className="w-44 sm:w-60 h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isFever
                  ? 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-400 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 to-sky-400'
              }`}
              style={{ width: `${isFever ? (feverTimeLeft / 6) * 100 : feverMeter}%` }}
            />
          </div>
        </div>

        {/* Right: Wave & Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            <Swords className="w-3.5 h-3.5 text-cyan-400" />
            <span>WAVE {wave}</span>
          </div>

          <button
            id="btn-toggle-autofire"
            onClick={() => setAutoFire(!autoFire)}
            title="자동 사격 토글"
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              autoFire
                ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {autoFire ? 'AUTO ON' : 'AUTO OFF'}
          </button>

          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={soundEnabled ? '음소거' : '소리 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {gameState === 'PLAYING' && (
            <button
              id="btn-pause-game"
              onClick={() => setGameState('PAUSED')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="일시 정지"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Boss Health Bar (if active) */}
      {bossHp !== null && bossMaxHp !== null && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-80 sm:w-96 flex flex-col items-center">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            BOSS TITAN GOLIATH
          </div>
          <div className="w-full h-3.5 bg-slate-900/90 rounded-full border border-rose-500/50 p-0.5 overflow-hidden shadow-lg shadow-rose-950/50">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 rounded-full transition-all duration-100"
              style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Active Perks Chip Tray (Bottom-Left) */}
      {acquiredPerks.length > 0 && gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">PERKS:</span>
          {acquiredPerks.map((pId, idx) => (
            <div
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 font-mono"
            >
              {pId}
            </div>
          ))}
        </div>
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full flex-1 touch-none cursor-crosshair"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* OVERLAY MODALS */}

      {/* 1. Main Menu Start Modal */}
      <AnimatePresence>
        {gameState === 'MENU' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center mb-5 text-cyan-400 shadow-lg shadow-cyan-500/20">
                <Zap className="w-8 h-8 animate-pulse" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400 font-mono tracking-tight mb-2">
                NEON SURVIVOR
              </h1>
              <p className="text-sm text-slate-400 mb-6">
                끊임없이 몰려오는 사이버 적들을 격파하고 콤보와 파워업을 모아 생존하세요!
              </p>

              {highScore > 0 && (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-6 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400 text-sm font-semibold">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>최고 기록: {highScore.toLocaleString()}점</span>
                </div>
              )}

              <div className="w-full text-xs text-slate-400 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-6 text-left space-y-1.5">
                <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <span>🎮 조작 방법:</span>
                </p>
                <p>• <span className="text-cyan-400 font-mono">WASD / 방향키</span> : 이동</p>
                <p>• <span className="text-cyan-400 font-mono">마우스 조준 & 자동 사격</span></p>
                <p>• <span className="text-cyan-400 font-mono">모바일</span> : 화면 터치 드래그로 조종</p>
              </div>

              <button
                id="btn-start-game"
                onClick={startGame}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-base shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>게임 시작 (PLAY NOW)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Wave Perk Upgrade Select Modal */}
      <AnimatePresence>
        {gameState === 'UPGRADE_SELECT' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <div className="w-full max-w-xl p-6 sm:p-8 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <ArrowUp className="w-3.5 h-3.5" />
                <span>WAVE {wave - 1} CLEARED!</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                강화 퍽 선택 (SELECT PERK)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6">
                전투 능력을 강화할 업그레이드를 선택하세요.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {offeredPerks.map((perk) => (
                  <button
                    key={perk.id}
                    onClick={() => selectPerk(perk)}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/80 transition-all duration-200 transform hover:-translate-y-1 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 group-hover:border-cyan-500/50 flex items-center justify-center mb-3">
                      {PERK_ICONS[perk.icon] || <Zap className="w-6 h-6 text-cyan-400" />}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 mb-1.5">
                      {perk.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {perk.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Pause Modal */}
      <AnimatePresence>
        {gameState === 'PAUSED' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center">
              <h2 className="text-2xl font-black text-white mb-4">일시 정지 (PAUSED)</h2>
              <button
                onClick={() => setGameState('PLAYING')}
                className="w-full py-3 mb-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                계속하기 (RESUME)
              </button>
              <button
                onClick={startGame}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                다시 시작 (RESTART)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Game Over Modal */}
      <AnimatePresence>
        {gameState === 'GAMEOVER' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/95 border border-rose-500/30 shadow-2xl shadow-rose-950/40 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-500">
                <RotateCcw className="w-7 h-7" />
              </div>

              <h2 className="text-3xl font-black text-white font-mono tracking-tight mb-1">
                GAME OVER
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                함선이 파괴되었습니다! 다음엔 더 높은 기록에 도전해보세요.
              </p>

              {/* Stats Grid */}
              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>최종 점수</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {score.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Swords className="w-3.5 h-3.5 text-emerald-400" />
                    <span>처치한 적</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {kills} 마리
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>최대 콤보</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {maxComboAchieved}x
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>생존 시간</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-purple-400">
                    {survivedSeconds}초 (WAVE {wave})
                  </div>
                </div>
              </div>

              {score >= highScore && score > 0 && (
                <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-bold mb-6 animate-pulse">
                  🎉 신기록 달성! (NEW RECORD!)
                </div>
              )}

              <button
                id="btn-retry-game"
                onClick={startGame}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-base shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>다시 도전 (PLAY AGAIN)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
