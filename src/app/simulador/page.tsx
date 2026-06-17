'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BREEDS, breedById } from '@/lib/breeds';
import {
  DEFAULT_FOOD_PRICE_CLP_KG,
  estimateMonthlyCost,
  estimateWeeklyTime,
} from '@/lib/simulator';
import type { Coat, DogProfile, Energy, Size } from '@/lib/types';

const SIZES: { id: Size; label: string }[] = [
  { id: 'toy', label: 'Toy (1–5 kg)' },
  { id: 'pequeno', label: 'Pequeño (5–11 kg)' },
  { id: 'mediano', label: 'Mediano (11–27 kg)' },
  { id: 'grande', label: 'Grande (27–45 kg)' },
  { id: 'gigante', label: 'Gigante (45+ kg)' },
];
const COATS: { id: Coat; label: string }[] = [
  { id: 'corto', label: 'Corto' },
  { id: 'medio', label: 'Medio' },
  { id: 'largo', label: 'Largo' },
  { id: 'doble', label: 'Doble capa' },
];
const ENERGIES: { id: Energy; label: string }[] = [
  { id: 'baja', label: 'Tranquilo' },
  { id: 'media', label: 'Normal' },
  { id: 'alta', label: 'Muy activo' },
];

const clp = (n: number) => '$' + n.toLocaleString('es-CL');

export default function SimuladorPage() {
  const [breedId, setBreedId] = useState('labrador');
  const [mSize, setMSize] = useState<Size>('mediano');
  const [mCoat, setMCoat] = useState<Coat>('corto');
  const [mEnergy, setMEnergy] = useState<Energy>('media');
  const [years, setYears] = useState('2');
  const [months, setMonths] = useState('0');
  const [weight, setWeight] = useState('30');
  const [foodPrice, setFoodPrice] = useState(String(DEFAULT_FOOD_PRICE_CLP_KG));

  const breed = breedById(breedId);
  const isMestizo = breed.size === null;
  const ageMonths = (parseInt(years) || 0) * 12 + (parseInt(months) || 0);
  const weightKg = parseFloat(weight) || 0;
  const price = parseFloat(foodPrice) || DEFAULT_FOOD_PRICE_CLP_KG;

  const result = useMemo(() => {
    if (weightKg <= 0 || ageMonths < 1) return null;
    const profile: DogProfile = {
      name: 'tu perro',
      breedId,
      size: breed.size ?? mSize,
      weightKg,
      ageMonths,
      neutered: false,
      goals: [],
    };
    const eb = isMestizo ? { ...breed, size: mSize, coat: mCoat, energy: mEnergy } : breed;
    return {
      time: estimateWeeklyTime(profile, eb),
      cost: estimateMonthlyCost(profile, eb, price),
    };
  }, [breedId, breed, isMestizo, mSize, mCoat, mEnergy, ageMonths, weightKg, price]);

  return (
    <div className="wrapper">
      <div className="header">
        <div className="logo-area">
          <div className="pet-avatar">🔍</div>
          <div className="logo-text">
            <h1>Antes de adoptar</h1>
            <p>¿Cuánto tiempo y dinero necesita un perro al mes?</p>
          </div>
        </div>
        <div className="header-right">
          <Link className="btn-ghost" href="/">
            ← Volver
          </Link>
        </div>
      </div>

      <div className="sim-grid">
        {/* FORMULARIO */}
        <div className="panel">
          <div className="panel-header notes-h"><span className="panel-icon">🐶</span> El perro que piensas adoptar</div>
          <div className="panel-body" style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>Raza</label>
              <select
                value={breedId}
                onChange={(e) => {
                  setBreedId(e.target.value);
                  const b = breedById(e.target.value);
                  if (b.typicalWeightKg) setWeight(String(b.typicalWeightKg));
                }}
              >
                {BREEDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            {isMestizo && (
              <>
                <div className="field">
                  <label>Tamaño</label>
                  <select value={mSize} onChange={(e) => setMSize(e.target.value as Size)}>
                    {SIZES.map((x) => (
                      <option key={x.id} value={x.id}>{x.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Pelaje</label>
                  <select value={mCoat} onChange={(e) => setMCoat(e.target.value as Coat)}>
                    {COATS.map((x) => (
                      <option key={x.id} value={x.id}>{x.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Energía</label>
                  <select value={mEnergy} onChange={(e) => setMEnergy(e.target.value as Energy)}>
                    {ENERGIES.map((x) => (
                      <option key={x.id} value={x.id}>{x.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="meal-times-row">
              <div className="field" style={{ flex: 1 }}>
                <label>Edad — años</label>
                <input type="number" min={0} max={25} value={years} onChange={(e) => setYears(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>y meses</label>
                <input type="number" min={0} max={11} value={months} onChange={(e) => setMonths(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Peso aproximado (kg)</label>
              <input type="number" min={0.5} max={120} step={0.5} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="field">
              <label>Precio del alimento (CLP por kg)</label>
              <input type="number" min={1000} max={20000} step={500} value={foodPrice} onChange={(e) => setFoodPrice(e.target.value)} />
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="right-col">
          {!result ? (
            <div className="panel">
              <div className="panel-body" style={{ paddingTop: 18 }}>
                <p className="meal-detail">Completa la edad y el peso para ver la estimación.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="sim-headline">
                <div className="sim-big">
                  <span className="sim-big-num">{result.time.hoursPerWeek} h</span>
                  <span className="sim-big-label">de cuidado por semana</span>
                </div>
                <div className="sim-big">
                  <span className="sim-big-num">{clp(result.cost.totalCLP)}</span>
                  <span className="sim-big-label">de gasto al mes (aprox.)</span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header meal-h"><span className="panel-icon">⏱️</span> Tiempo semanal</div>
                <div className="panel-body" style={{ paddingTop: 8 }}>
                  {result.time.breakdown
                    .filter((b) => b.hours > 0)
                    .map((b) => (
                      <div className="hist-row" key={b.type}>
                        <span>{b.label}</span>
                        <span className="hist-pct">{b.hours} h</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header goal-h"><span className="panel-icon">💸</span> Gasto mensual</div>
                <div className="panel-body" style={{ paddingTop: 8 }}>
                  {result.cost.items.map((it) => (
                    <div className="hist-row" key={it.label}>
                      <span>{it.label}</span>
                      <span className="hist-pct">{clp(it.clp)}</span>
                    </div>
                  ))}
                  <p className="disclaimer">
                    Estimación referencial 2026 para Chile. No incluye gastos veterinarios mayores ni urgencias.
                  </p>
                </div>
              </div>

              <div className="sim-cta">
                <strong>¿Te hace sentido? 🐾</strong>
                <span>Adoptar es un compromiso de años. Si ya tienes a tu perro, organiza su cuidado con la familia:</span>
                <Link className="btn-primary" href="/">
                  Crear mi planificador →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
