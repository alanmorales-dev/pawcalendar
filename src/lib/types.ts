export type Size = 'toy' | 'pequeno' | 'mediano' | 'grande' | 'gigante';
export type Energy = 'baja' | 'media' | 'alta';
export type Coat = 'corto' | 'medio' | 'largo' | 'doble';
export type LifeStage = 'cachorro' | 'junior' | 'adulto' | 'senior';
export type TaskType = 'food' | 'walk' | 'bath' | 'health' | 'shop';
export type Goal = 'mas_paseos' | 'controlar_peso' | 'rutina_salud' | 'repartir_tareas';

export interface Breed {
  id: string;
  name: string;
  /** null = mestizo/quiltro: el usuario define tamaño y pelaje en el wizard */
  size: Size | null;
  energy: Energy;
  coat: Coat;
  typicalWeightKg: number | null;
}

export interface DogProfile {
  name: string;
  breedId: string;
  /** tamaño efectivo: el de la raza, o el elegido por el usuario si es mestizo */
  size: Size;
  weightKg: number;
  ageMonths: number;
  neutered: boolean;
  goals: Goal[];
}

export interface FeedingPlan {
  lifeStage: LifeStage;
  rerKcal: number;
  merFactor: number;
  kcalPerDay: number;
  gramsPerDay: number;
  cupsPerDay: number;
  mealsPerDay: number;
  gramsPerMeal: number;
  /** supuestos legibles para mostrar en UI y póster */
  assumptions: string[];
}

export interface FeedingOptions {
  /** densidad energética del pienso; default 3500 kcal/kg */
  foodKcalPerKg?: number;
  /** gramos por taza; default 100 g */
  gramsPerCup?: number;
}

export interface Assignment {
  member: string;
  /** 0 = lunes … 6 = domingo */
  day: number;
  type: TaskType;
  completed: boolean;
  /** miniatura (dataURL) si se verificó con foto; verificada = completed && !!photo */
  photo?: string;
  /** si ya sumó PawPoints esta semana (evita doble conteo al re-marcar) */
  awarded?: boolean;
}

export interface MedicalRecord {
  id: string;
  kind: 'vacuna' | 'control' | 'medicamento';
  name: string;
  /** yyyy-mm-dd */
  date: string;
}
