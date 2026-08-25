export type GameState = 'MENU' | 'PLAYING' | 'UPGRADE_SELECT' | 'PAUSED' | 'GAMEOVER';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: boolean;
  fireRate: number; // shots per sec
  lastFired: number;
  tripleShotTimer: number;
  rapidFireTimer: number;
  magnetRadius: number;
  pierceCount: number;
  bulletDamage: number;
  critChance: number;
  hasDrone: boolean;
  invulnerableTimer: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  pierce: number;
  isFever: boolean;
  isCrit: boolean;
  isEnemy?: boolean;
}

export type EnemyType = 'SCOUT' | 'DASHER' | 'TANK' | 'SHOOTER' | 'BOSS';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  scoreValue: number;
  shootCooldown?: number;
  dashCooldown?: number;
  isDashing?: boolean;
  dashTimer?: number;
  angle: number;
}

export type PowerupType = 'TRIPLE' | 'SHIELD' | 'NUKE' | 'SLOW' | 'HEALTH' | 'RAPID';

export interface Powerup {
  id: number;
  type: PowerupType;
  x: number;
  y: number;
  radius: number;
  duration: number; // lifetime on field
  color: string;
  icon: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  glow?: boolean;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  size: number;
  vy: number;
}

export interface Drone {
  angle: number;
  dist: number;
  lastFired: number;
}

export interface Perk {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
}

export interface GameStats {
  score: number;
  wave: number;
  kills: number;
  maxCombo: number;
  timeSurvived: number;
  feverCount: number;
}
