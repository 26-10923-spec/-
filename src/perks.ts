import { Perk } from './types';

export const ALL_PERKS: Perk[] = [
  {
    id: 'FIRE_RATE',
    title: '광자 오버클럭 (Fire Rate)',
    description: '기본 발사 속도가 30% 빨라집니다.',
    icon: 'Zap',
    rarity: 'COMMON'
  },
  {
    id: 'DAMAGE_UP',
    title: '고밀도 플라즈마 (Damage+)',
    description: '총알 공격력이 40% 증가합니다.',
    icon: 'Flame',
    rarity: 'COMMON'
  },
  {
    id: 'SPEED_UP',
    title: '네온 부스터 (Speed+)',
    description: '이동 속도가 25% 빨라집니다.',
    icon: 'Wind',
    rarity: 'COMMON'
  },
  {
    id: 'MAX_HP',
    title: '나노 캡슐 강화 (Max HP)',
    description: '최대 체력이 1칸 증가하고 전체 체력을 즉시 회복합니다.',
    icon: 'Heart',
    rarity: 'RARE'
  },
  {
    id: 'PIERCE',
    title: '관통 레이저 (Piercing)',
    description: '총알이 적을 1회 추가 관통합니다.',
    icon: 'Crosshair',
    rarity: 'RARE'
  },
  {
    id: 'CRIT_CHANCE',
    title: '정밀 조준경 (Crit Strike)',
    description: '치명타 확률이 25% 증가하며 치명타 시 2.5배 피해를 입힙니다.',
    icon: 'Sparkles',
    rarity: 'RARE'
  },
  {
    id: 'DRONE',
    title: '호위 드론 배치 (Guardian Drone)',
    description: '주위를 회전하며 자동으로 가까운 적을 사격하는 호위 드론을 소환합니다.',
    icon: 'Bot',
    rarity: 'LEGENDARY'
  },
  {
    id: 'MAGNET',
    title: '자기장 발생기 (Magnet Range)',
    description: '아이템 및 파워업 흡수 반경이 3배로 증가합니다.',
    icon: 'Radio',
    rarity: 'COMMON'
  }
];

export function getRandomPerks(count: number = 3, existingPerks: string[] = []): Perk[] {
  // filter drone if already has drone
  const available = ALL_PERKS.filter(p => !(p.id === 'DRONE' && existingPerks.includes('DRONE')));
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
