import type { DogProfile, FeedingOptions, FeedingPlan, LifeStage, Size } from './types.ts';

/**
 * Cálculo de plan de alimentación según fórmulas estándar de nutrición veterinaria.
 * RER = 70 × kg^0.75 (NRC 2006); MER = RER × factor por etapa de vida
 * (WSAVA Global Nutrition Guidelines). Ver SPEC.md §6.
 * Resultado orientativo: no reemplaza la indicación del veterinario.
 */

/** Umbral senior en meses; los perros grandes envejecen antes */
const SENIOR_MONTHS: Record<Size, number> = {
  toy: 120,
  pequeno: 120,
  mediano: 96,
  grande: 84,
  gigante: 72,
};

const MER_FACTORS: Record<LifeStage, { neutered: number; intact: number }> = {
  cachorro: { neutered: 3.0, intact: 3.0 },
  junior: { neutered: 2.0, intact: 2.0 },
  adulto: { neutered: 1.5, intact: 1.7 },
  senior: { neutered: 1.3, intact: 1.3 },
};

const MEALS_PER_DAY: Record<LifeStage, number> = {
  cachorro: 4,
  junior: 3,
  adulto: 2,
  senior: 2,
};

export function lifeStageOf(ageMonths: number, size: Size): LifeStage {
  if (ageMonths < 4) return 'cachorro';
  if (ageMonths < 12) return 'junior';
  if (ageMonths >= SENIOR_MONTHS[size]) return 'senior';
  return 'adulto';
}

export function buildFeedingPlan(profile: DogProfile, options: FeedingOptions = {}): FeedingPlan {
  const foodKcalPerKg = options.foodKcalPerKg ?? 3500;
  const gramsPerCup = options.gramsPerCup ?? 100;

  if (profile.weightKg <= 0) throw new Error('El peso debe ser mayor que 0');
  if (profile.ageMonths < 0) throw new Error('La edad no puede ser negativa');

  const lifeStage = lifeStageOf(profile.ageMonths, profile.size);
  const rerKcal = 70 * Math.pow(profile.weightKg, 0.75);

  const factors = MER_FACTORS[lifeStage];
  let merFactor = profile.neutered ? factors.neutered : factors.intact;

  const assumptions: string[] = [
    `RER = 70 × ${profile.weightKg} kg^0.75 = ${Math.round(rerKcal)} kcal/día (NRC 2006)`,
    `Etapa de vida: ${lifeStage} → factor MER ${merFactor} (WSAVA)`,
    `Densidad energética del alimento: ${foodKcalPerKg} kcal/kg (editable)`,
    `1 taza ≈ ${gramsPerCup} g de pienso seco`,
  ];

  // Pérdida de peso se prescribe cerca de 1.0×RER; nunca bajar de ahí
  if (profile.goals.includes('controlar_peso') && lifeStage !== 'cachorro' && lifeStage !== 'junior') {
    merFactor = Math.max(1.0, merFactor - 0.3);
    assumptions.push(`Objetivo "controlar peso": factor reducido a ${merFactor}`);
  }

  const kcalPerDay = rerKcal * merFactor;
  const gramsPerDay = (kcalPerDay / foodKcalPerKg) * 1000;
  const mealsPerDay = MEALS_PER_DAY[lifeStage];

  return {
    lifeStage,
    rerKcal: round1(rerKcal),
    merFactor,
    kcalPerDay: Math.round(kcalPerDay),
    gramsPerDay: roundTo(gramsPerDay, 5),
    cupsPerDay: roundTo(gramsPerDay / gramsPerCup, 0.25),
    mealsPerDay,
    gramsPerMeal: roundTo(gramsPerDay / mealsPerDay, 5),
    assumptions,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
