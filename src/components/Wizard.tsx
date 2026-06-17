'use client';

import { useState } from 'react';
import { BREEDS, breedById } from '@/lib/breeds';
import { buildFeedingPlan } from '@/lib/feeding';
import { generateWeek } from '@/lib/routine';
import { defaultMealTimes, mondayOf, type PlannerState } from '@/lib/storage';
import type { Coat, DogProfile, Energy, Goal, Size } from '@/lib/types';

const EMOJIS = ['🐶', '🐕', '🐩', '🦮', '🐕‍🦺', '🐾'];

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

const GOALS: { id: Goal; icon: string; label: string; desc: string }[] = [
  { id: 'mas_paseos', icon: '🦮', label: 'Más paseos', desc: 'Paseo extra los fines de semana' },
  { id: 'controlar_peso', icon: '⚖️', label: 'Controlar peso', desc: 'Ajusta ración y suma ejercicio' },
  { id: 'rutina_salud', icon: '💊', label: 'Rutina de salud', desc: 'Seguimiento de controles y medicación' },
  { id: 'repartir_tareas', icon: '🤝', label: 'Repartir tareas', desc: 'Carga equilibrada en la casa' },
];

const TAGS = ['tag-0', 'tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5'];
const DOTS = ['dot-0', 'dot-1', 'dot-2', 'dot-3', 'dot-4', 'dot-5'];
const MAX_MEMBERS = 6;

interface Props {
  initial?: PlannerState;
  onDone: (state: PlannerState) => void;
}

export default function Wizard({ initial, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  // paso 1: perro
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🐶');
  const [name, setName] = useState(initial?.profile.name ?? '');
  const [breedId, setBreedId] = useState(initial?.profile.breedId ?? 'mestizo');
  const [mestizoSize, setMestizoSize] = useState<Size>(initial?.profile.size ?? 'mediano');
  const [mestizoCoat, setMestizoCoat] = useState<Coat>(initial?.coat ?? 'corto');
  const [mestizoEnergy, setMestizoEnergy] = useState<Energy>(initial?.energy ?? 'media');
  const [years, setYears] = useState(initial ? String(Math.floor(initial.profile.ageMonths / 12)) : '');
  const [months, setMonths] = useState(initial ? String(initial.profile.ageMonths % 12) : '0');
  const [weight, setWeight] = useState(initial ? String(initial.profile.weightKg) : '');
  const [neutered, setNeutered] = useState(initial?.profile.neutered ?? false);
  const [registered, setRegistered] = useState(initial?.registered ?? false);

  // paso 2: casa
  const [members, setMembers] = useState<string[]>(initial?.members ?? []);
  const [memberInput, setMemberInput] = useState('');

  // paso 3: objetivos
  const [goals, setGoals] = useState<Goal[]>(initial?.profile.goals ?? []);

  // paso 4: comidas y contactos
  const [mealTimes, setMealTimes] = useState<string[] | null>(initial?.mealTimes ?? null);
  const [foodKcal, setFoodKcal] = useState(String(initial?.foodKcalPerKg ?? 3500));
  const [vetName, setVetName] = useState(initial?.vetName ?? '');
  const [vetPhone, setVetPhone] = useState(initial?.vetPhone ?? '');

  const breed = breedById(breedId);
  const isMestizo = breed.size === null;
  const ageMonths = (parseInt(years) || 0) * 12 + (parseInt(months) || 0);

  function buildProfile(): DogProfile {
    return {
      name: name.trim(),
      breedId,
      size: breed.size ?? mestizoSize,
      weightKg: parseFloat(weight) || 0,
      ageMonths,
      neutered,
      goals,
    };
  }

  function effectiveBreed() {
    return isMestizo
      ? { ...breed, size: mestizoSize, coat: mestizoCoat, energy: mestizoEnergy }
      : breed;
  }

  function validate(current: number): string {
    if (current === 0) {
      if (!name.trim()) return 'Ponle nombre a tu perro 🐶';
      if (ageMonths < 1 || ageMonths > 300) return 'Revisa la edad (mínimo 1 mes)';
      const w = parseFloat(weight);
      if (!w || w <= 0 || w > 120) return 'Revisa el peso (en kilos)';
    }
    if (current === 1 && members.length === 0) return 'Agrega al menos un integrante';
    if (current === 3) {
      if (!mealTimes || mealTimes.some((t) => !t)) return 'Completa los horarios de comida';
      if (!(parseFloat(foodKcal) > 0)) return 'Revisa las kcal del alimento';
    }
    return '';
  }

  function next() {
    const msg = validate(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    if (step === 2 && mealTimes === null) {
      const plan = buildFeedingPlan(buildProfile(), { foodKcalPerKg: parseFloat(foodKcal) });
      setMealTimes(defaultMealTimes(plan.mealsPerDay));
    }
    setStep(step + 1);
  }

  function back() {
    setError('');
    setStep(step - 1);
  }

  function addMember() {
    const m = memberInput.trim();
    if (!m || members.length >= MAX_MEMBERS) return;
    if (members.some((x) => x.toLowerCase() === m.toLowerCase())) return;
    setMembers([...members, m]);
    setMemberInput('');
  }

  function toggleGoal(g: Goal) {
    setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g]);
  }

  function finish() {
    const msg = validate(3);
    if (msg) {
      setError(msg);
      return;
    }
    const profile = buildProfile();
    const eb = effectiveBreed();
    const assignments = generateWeek(profile, eb, members);
    onDone({
      version: 1,
      emoji,
      profile,
      coat: eb.coat,
      energy: eb.energy,
      members,
      mealTimes: mealTimes!,
      foodKcalPerKg: parseFloat(foodKcal),
      vetName: vetName.trim(),
      vetPhone: vetPhone.trim(),
      registered,
      notes: initial?.notes ?? '',
      pending: initial?.pending ?? [],
      weekStart: mondayOf(new Date()),
      assignments,
      history: initial?.history ?? [],
    });
  }

  const plan =
    step === 3
      ? buildFeedingPlan(buildProfile(), { foodKcalPerKg: parseFloat(foodKcal) || 3500 })
      : null;

  return (
    <div className="wrapper">
      <div className="header" style={{ justifyContent: 'center' }}>
        <div className="logo-area">
          <div className="pet-avatar">{emoji}</div>
          <div className="logo-text">
            <h1>PlanPet</h1>
            <p>Arma el planificador de cuidado de tu perro</p>
          </div>
        </div>
      </div>

      <div className="wizard-card">
        <div className="wizard-steps">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`wstep ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="wizard-title">Tu perro 🐶</div>
            <div className="wizard-sub">Con esto calculamos su alimentación y su rutina ideal.</div>
            <div className="wizard-grid">
              <div className="field full">
                <label>Avatar</label>
                <div className="emoji-row">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`emoji-opt ${emoji === e ? 'sel' : ''}`}
                      onClick={() => setEmoji(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Luna" />
              </div>
              <div className="field">
                <label>Raza</label>
                <select
                  value={breedId}
                  onChange={(e) => {
                    setBreedId(e.target.value);
                    const b = breedById(e.target.value);
                    if (b.typicalWeightKg && !weight) setWeight(String(b.typicalWeightKg));
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
                    <select value={mestizoSize} onChange={(e) => setMestizoSize(e.target.value as Size)}>
                      {SIZES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Pelaje</label>
                    <select value={mestizoCoat} onChange={(e) => setMestizoCoat(e.target.value as Coat)}>
                      {COATS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Energía</label>
                    <select value={mestizoEnergy} onChange={(e) => setMestizoEnergy(e.target.value as Energy)}>
                      {ENERGIES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="field">
                <label>Edad — años</label>
                <input type="number" min={0} max={25} value={years} onChange={(e) => setYears(e.target.value)} placeholder="2" />
              </div>
              <div className="field">
                <label>y meses</label>
                <input type="number" min={0} max={11} value={months} onChange={(e) => setMonths(e.target.value)} />
              </div>
              <div className="field">
                <label>Peso (kg)</label>
                <input type="number" min={0.5} max={120} step={0.5} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="12" />
              </div>
              <label className="check-row full">
                <input type="checkbox" checked={neutered} onChange={(e) => setNeutered(e.target.checked)} />
                Está castrado/esterilizado
              </label>
              <label className="check-row full">
                <input type="checkbox" checked={registered} onChange={(e) => setRegistered(e.target.checked)} />
                Está inscrito en el Registro Nacional de Mascotas
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="wizard-title">Tu casa 🏠</div>
            <div className="wizard-sub">¿Quiénes van a cuidar a {name.trim() || 'tu perro'}? Las tareas se reparten entre todos.</div>
            <div className="pend-add">
              <input
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMember()}
                placeholder="Nombre del integrante"
                className="input"
              />
              <button type="button" className="btn-primary" onClick={addMember} disabled={members.length >= MAX_MEMBERS}>
                Agregar
              </button>
            </div>
            <div className="member-chips">
              {members.map((m, i) => (
                <span key={m} className={`member-tag ${TAGS[i % 6]}`}>
                  <span className={`tag-dot ${DOTS[i % 6]}`} />
                  {m}
                  <button type="button" className="member-chip-x" onClick={() => setMembers(members.filter((x) => x !== m))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wizard-title">Objetivos 🎯</div>
            <div className="wizard-sub">Opcional — ajustan la rutina y se vuelven metas visibles en tu planificador.</div>
            <div className="goal-cards">
              {GOALS.map((g) => (
                <button key={g.id} type="button" className={`goal-card ${goals.includes(g.id) ? 'sel' : ''}`} onClick={() => toggleGoal(g.id)}>
                  <span className="g-icon">{g.icon}</span>
                  {g.label}
                  <span className="g-desc">{g.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && plan && mealTimes && (
          <>
            <div className="wizard-title">Plan de {name.trim()} 🍽️</div>
            <div className="wizard-sub">Calculado con fórmulas de nutrición veterinaria (NRC/WSAVA). Puedes ajustar horarios y alimento.</div>
            <div className="summary-box">
              <strong>{plan.kcalPerDay} kcal/día</strong> → <strong>{plan.gramsPerDay} g</strong> de pienso ({plan.cupsPerDay} tazas)
              en <strong>{plan.mealsPerDay} comidas</strong> de {plan.gramsPerMeal} g.
              <br />
              Etapa: {plan.lifeStage} · RER {plan.rerKcal} kcal × factor {plan.merFactor}
            </div>
            <div className="wizard-grid" style={{ marginTop: 14 }}>
              <div className="field full">
                <label>Horarios de comida</label>
                <div className="meal-times-row">
                  {mealTimes.map((t, i) => (
                    <input
                      key={i}
                      type="time"
                      value={t}
                      onChange={(e) => setMealTimes(mealTimes.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Energía del alimento (kcal/kg)</label>
                <input type="number" min={2000} max={5500} step={50} value={foodKcal} onChange={(e) => setFoodKcal(e.target.value)} />
              </div>
              <div className="field">
                <label>Veterinario/a (opcional)</label>
                <input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Dra. Rodríguez" />
              </div>
              <div className="field full">
                <label>Teléfono del veterinario (opcional)</label>
                <input value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} placeholder="+56 9 1234 5678" />
              </div>
            </div>
            <p className="disclaimer">Plan orientativo: no reemplaza la indicación de tu veterinario/a.</p>
          </>
        )}

        {error && <div className="error-msg">{error}</div>}

        <div className="wizard-nav">
          {step > 0 ? (
            <button type="button" className="btn-ghost" onClick={back}>
              ← Atrás
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={next}>
              Siguiente →
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={finish}>
              {initial ? 'Guardar y regenerar semana 🪄' : 'Crear mi planificador 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
