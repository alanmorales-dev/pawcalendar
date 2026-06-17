import { buildFeedingPlan } from './feeding.ts';
import { generateWeek } from './routine.ts';
import type { Breed, Coat, DogProfile, Size, TaskType } from './types.ts';

/**
 * Modo pre-adopción (SPEC §11.3): estima tiempo semanal y costo mensual de
 * tener un perro, reutilizando los motores de alimentación y rutina.
 * Valores CLP referenciales 2026, editables en la UI. Orientativo.
 */

/** minutos por tarea, según tipo (paseo depende de la energía de la raza) */
const WALK_MINUTES = { baja: 20, media: 30, alta: 40 } as const;
const TASK_MINUTES: Record<Exclude<TaskType, 'walk' | 'food'>, number> = {
  bath: 30,
  health: 15,
  shop: 30,
};
const MINUTES_PER_MEAL = 10;

/** CLP/mes referenciales */
const HEALTH_CLP_BY_SIZE: Record<Size, number> = {
  toy: 6000,
  pequeno: 7000,
  mediano: 8000,
  grande: 10000,
  gigante: 12000,
};
const HYGIENE_CLP_BY_COAT: Record<Coat, number> = {
  corto: 5000,
  medio: 8000,
  largo: 12000,
  doble: 12000,
};
export const DEFAULT_FOOD_PRICE_CLP_KG = 4500;
const CONTINGENCY_RATE = 0.1;
const DAYS_PER_MONTH = 30.4;

export interface TimeEstimate {
  hoursPerWeek: number;
  breakdown: { type: TaskType; label: string; hours: number }[];
}

export interface CostEstimate {
  totalCLP: number;
  items: { label: string; clp: number }[];
}

const TYPE_LABEL: Record<TaskType, string> = {
  food: 'Alimentación',
  walk: 'Paseos',
  bath: 'Higiene',
  health: 'Salud',
  shop: 'Compras',
};

export function estimateWeeklyTime(profile: DogProfile, breed: Breed): TimeEstimate {
  const plan = buildFeedingPlan(profile);
  const week = generateWeek(profile, breed, ['hogar']);

  const minutesOf = (t: TaskType) =>
    t === 'walk' ? WALK_MINUTES[breed.energy] : t === 'food' ? plan.mealsPerDay * MINUTES_PER_MEAL : TASK_MINUTES[t];

  const types: TaskType[] = ['food', 'walk', 'bath', 'health', 'shop'];
  const breakdown = types.map((type) => {
    const count = week.filter((a) => a.type === type).length;
    return { type, label: TYPE_LABEL[type], hours: round1((count * minutesOf(type)) / 60) };
  });

  return {
    hoursPerWeek: round1(breakdown.reduce((acc, b) => acc + b.hours, 0)),
    breakdown,
  };
}

export function estimateMonthlyCost(
  profile: DogProfile,
  breed: Breed,
  foodPriceCLPKg: number = DEFAULT_FOOD_PRICE_CLP_KG,
): CostEstimate {
  const plan = buildFeedingPlan(profile);

  const food = (plan.gramsPerDay * DAYS_PER_MONTH * foodPriceCLPKg) / 1000;
  const health = HEALTH_CLP_BY_SIZE[profile.size];
  const hygiene = HYGIENE_CLP_BY_COAT[breed.coat];
  const contingency = (food + health + hygiene) * CONTINGENCY_RATE;

  const items = [
    { label: `Alimento (${plan.gramsPerDay} g/día)`, clp: roundCLP(food) },
    { label: 'Salud preventiva (vacunas y desparasitación prorrateadas)', clp: health },
    { label: 'Higiene e insumos', clp: hygiene },
    { label: 'Imprevistos (10%)', clp: roundCLP(contingency) },
  ];

  return { totalCLP: items.reduce((acc, i) => acc + i.clp, 0), items };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundCLP(n: number): number {
  return Math.round(n / 500) * 500;
}
