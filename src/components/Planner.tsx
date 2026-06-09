'use client';

import { useEffect, useRef, useState } from 'react';
import { breedById } from '@/lib/breeds';
import { buildFeedingPlan } from '@/lib/feeding';
import { generateWeek } from '@/lib/routine';
import { mondayOf, saveState, uid, type PlannerState, type Priority } from '@/lib/storage';
import type { Goal, TaskType } from '@/lib/types';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MEAL_EMOJIS = ['🌅', '🌞', '🌇', '🌙'];
const TAGS = ['tag-0', 'tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5'];
const DOTS = ['dot-0', 'dot-1', 'dot-2', 'dot-3', 'dot-4', 'dot-5'];

const TYPE_DATA: Record<TaskType, { icon: string; label: string }> = {
  food: { icon: '🍚', label: 'Alimentación' },
  walk: { icon: '🦮', label: 'Paseo' },
  bath: { icon: '🛁', label: 'Higiene' },
  health: { icon: '💊', label: 'Salud' },
  shop: { icon: '🛒', label: 'Compras' },
};
const TYPES: TaskType[] = ['food', 'walk', 'bath', 'health', 'shop'];

function formatWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

interface Props {
  initial: PlannerState;
  onReconfigure: () => void;
}

export default function Planner({ initial, onReconfigure }: Props) {
  const [s, setS] = useState(initial);
  const [mode, setMode] = useState<'marcar' | 'editar'>('marcar');
  const [selType, setSelType] = useState<TaskType>('food');
  const [toast, setToast] = useState({ msg: '', on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendText, setPendText] = useState('');
  const [pendPrio, setPendPrio] = useState<Priority>('normal');

  const plan = buildFeedingPlan(s.profile, { foodKcalPerKg: s.foodKcalPerKg });
  const effectiveBreed = { ...breedById(s.profile.breedId), size: s.profile.size, coat: s.coat, energy: s.energy };

  const total = s.assignments.length;
  const done = s.assignments.filter((a) => a.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // persistir cada cambio confirmado por React
  useEffect(() => {
    saveState(s);
  }, [s]);

  // forma funcional siempre: varios taps en el mismo batch no deben pisarse
  function update(fn: (prev: PlannerState) => PlannerState) {
    setS(fn);
  }

  function showToast(msg: string) {
    setToast({ msg, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 2000);
  }

  // ── grilla ──
  function toggleDone(idx: number) {
    const a = s.assignments[idx];
    update((prev) => ({
      ...prev,
      assignments: prev.assignments.map((x, i) => (i === idx ? { ...x, completed: !x.completed } : x)),
    }));
    showToast(a.completed ? `${TYPE_DATA[a.type].label} pendiente otra vez` : `✓ ${TYPE_DATA[a.type].label} ¡hecha!`);
  }

  function removeTask(idx: number) {
    const a = s.assignments[idx];
    update((prev) => ({ ...prev, assignments: prev.assignments.filter((_, i) => i !== idx) }));
    showToast(`${TYPE_DATA[a.type].label} eliminada`);
  }

  function addTask(member: string, day: number) {
    update((prev) => ({ ...prev, assignments: [...prev.assignments, { member, day, type: selType, completed: false }] }));
    showToast(`✓ ${TYPE_DATA[selType].label} asignada a ${member}`);
  }

  function regenerate() {
    if (!confirm('Esto reemplaza todas las tareas de la semana por la rutina sugerida. ¿Continuar?')) return;
    update((prev) => ({
      ...prev,
      assignments: generateWeek(prev.profile, effectiveBreed, prev.members),
      weekStart: mondayOf(new Date()),
    }));
    showToast('🪄 Rutina regenerada');
  }

  function closeWeek() {
    if (!confirm(`¿Archivar esta semana (${pct}% completada) y partir una nueva?`)) return;
    update((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        { start: prev.weekStart, total: prev.assignments.length, completed: prev.assignments.filter((a) => a.completed).length },
      ],
      assignments: prev.assignments.map((a) => ({ ...a, completed: false })),
      weekStart: mondayOf(new Date()),
    }));
    showToast('📦 Semana archivada, ¡a por la nueva!');
  }

  // ── pendientes ──
  function addPending() {
    const text = pendText.trim();
    if (!text) return;
    update((prev) => ({ ...prev, pending: [...prev.pending, { id: uid(), text, prio: pendPrio, done: false }] }));
    setPendText('');
  }

  // ── métricas de objetivos ──
  function goalMetric(goal: Goal): { label: string; done: number; total: number; note: string } {
    const ofType = (t: TaskType) => ({
      done: s.assignments.filter((a) => a.type === t && a.completed).length,
      total: s.assignments.filter((a) => a.type === t).length,
    });
    switch (goal) {
      case 'mas_paseos': {
        const w = ofType('walk');
        return { label: '🦮 Más paseos', ...w, note: `${w.done} de ${w.total} paseos esta semana` };
      }
      case 'controlar_peso': {
        const w = ofType('walk');
        return { label: '⚖️ Controlar peso', ...w, note: `Meta: ${plan.kcalPerDay} kcal/día · paseos ${w.done}/${w.total}` };
      }
      case 'rutina_salud': {
        const h = ofType('health');
        return { label: '💊 Rutina de salud', ...h, note: `${h.done} de ${h.total} tareas de salud` };
      }
      case 'repartir_tareas': {
        const counts = s.members.map((m) => s.assignments.filter((a) => a.member === m).length);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        return {
          label: '🤝 Repartir tareas',
          done: min,
          total: max,
          note: s.members.map((m, i) => `${m}: ${counts[i]}`).join(' · '),
        };
      }
    }
  }

  return (
    <div className="wrapper">
      {/* HEADER */}
      <div className="header">
        <div className="logo-area">
          <div className="pet-avatar">{s.emoji}</div>
          <div className="logo-text">
            <h1>PlanPet</h1>
            <p>Semana del {formatWeek(s.weekStart)} · Cuidado de {s.profile.name}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="progress-card">
            <div className="progress-info">
              <div className="progress-label">Progreso semanal</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="progress-pct">{pct}%</div>
          </div>
          <div className="pet-badge">🐾 {s.profile.name}</div>
          <button className="icon-btn" title="Reconfigurar planificador" onClick={onReconfigure}>
            ⚙️
          </button>
        </div>
      </div>

      {/* MODO + TIPOS */}
      <div className="picker-section">
        <div className="mode-switch">
          <button className={`mode-btn ${mode === 'marcar' ? 'active' : ''}`} onClick={() => setMode('marcar')}>
            ✅ Marcar
          </button>
          <button className={`mode-btn ${mode === 'editar' ? 'active' : ''}`} onClick={() => setMode('editar')}>
            ✏️ Editar
          </button>
        </div>
        {mode === 'editar' && (
          <>
            {TYPES.map((t) => (
              <button key={t} className={`task-btn ${selType === t ? `sel-${t}` : ''}`} onClick={() => setSelType(t)}>
                <span className="btn-icon">{TYPE_DATA[t].icon}</span> {TYPE_DATA[t].label}
              </button>
            ))}
            <button className="small-btn" onClick={regenerate}>🪄 Regenerar rutina</button>
          </>
        )}
        <span className="picker-hint">
          {mode === 'marcar'
            ? 'Toca una tarea para marcarla como hecha'
            : 'Clic en una celda asigna · clic en una tarea la quita'}
        </span>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="table-card">
          <div className="table-header">
            <div className="section-title">📅 Distribución de tareas</div>
            <div className="stats-chips">
              <span className="chip chip-done">{done} hechas</span>
              <span className="chip chip-pend">{total - done} pendientes</span>
              <button className="small-btn" onClick={closeWeek}>📦 Nueva semana</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="member-th">Integrante</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className={`day-th day-${i}`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.members.map((m, mi) => (
                  <tr key={m}>
                    <td className="member-col">
                      <span className={`member-tag ${TAGS[mi % 6]}`}>
                        <span className={`tag-dot ${DOTS[mi % 6]}`} />
                        {m}
                      </span>
                    </td>
                    {DAYS.map((_, day) => {
                      const cellTasks = s.assignments
                        .map((a, idx) => ({ a, idx }))
                        .filter(({ a }) => a.member === m && a.day === day);
                      return (
                        <td key={day}>
                          <div
                            className={`cell ${mode === 'editar' ? 'editable' : ''}`}
                            onClick={mode === 'editar' ? () => addTask(m, day) : undefined}
                          >
                            {cellTasks.map(({ a, idx }) => (
                              <button
                                key={idx}
                                className={`task-chip t-${a.type} ${a.completed ? 'done' : ''}`}
                                title={`${TYPE_DATA[a.type].label}${a.completed ? ' · hecha' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (mode === 'marcar') toggleDone(idx);
                                  else removeTask(idx);
                                }}
                              >
                                {TYPE_DATA[a.type].icon}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend">
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--pink-light)' }}>🍚</span> Alimentación</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--green-light)' }}>🦮</span> Paseo</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--blue-light)' }}>🛁</span> Higiene</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--yellow-light)' }}>💊</span> Salud</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--purple-light)' }}>🛒</span> Compras</div>
          </div>
        </div>

        {/* PANELES */}
        <div className="right-col">
          {/* COMIDAS */}
          <div className="panel">
            <div className="panel-header meal-h"><span className="panel-icon">🍽️</span> Horarios de comida</div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              {s.mealTimes.map((t, i) => (
                <div className="meal-row" key={i}>
                  <span style={{ fontSize: 22 }}>{MEAL_EMOJIS[i % 4]}</span>
                  <div>
                    <span className={`meal-time-badge ${parseInt(t) >= 15 ? 'pm' : ''}`}>{t}</span>
                  </div>
                  <div className="meal-detail">
                    <strong>Comida {i + 1}</strong>
                    {plan.gramsPerMeal} g · Agua fresca
                  </div>
                </div>
              ))}
              <div className="weight-badge">
                🐾 {s.profile.weightKg} kg · {plan.gramsPerDay} g/día ({plan.cupsPerDay} tazas)
              </div>
              <details className="assumptions">
                <summary>¿Cómo se calculó?</summary>
                <ul>
                  {plan.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
              <p className="disclaimer">Orientativo: no reemplaza a tu veterinario/a.</p>
            </div>
          </div>

          {/* OBJETIVOS */}
          {s.profile.goals.length > 0 && (
            <div className="panel">
              <div className="panel-header goal-h"><span className="panel-icon">🎯</span> Objetivos</div>
              <div className="panel-body" style={{ paddingTop: 4 }}>
                {s.profile.goals.map((g) => {
                  const metric = goalMetric(g);
                  const goalPct = metric.total === 0 ? 0 : Math.round((metric.done / metric.total) * 100);
                  return (
                    <div className="goal-row" key={g}>
                      <div className="goal-name">
                        <span>{metric.label}</span>
                        <span>{goalPct}%</span>
                      </div>
                      <div className="goal-track">
                        <div className="goal-fill" style={{ width: `${goalPct}%` }} />
                      </div>
                      <div className="goal-note">{metric.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PENDIENTES */}
          <div className="panel">
            <div className="panel-header pend-h"><span className="panel-icon">📋</span> Pendientes</div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              {s.pending.map((p) => (
                <div className="pend-item" key={p.id}>
                  <button
                    className={`pcheck ${p.done ? 'on' : ''}`}
                    onClick={() =>
                      update((prev) => ({ ...prev, pending: prev.pending.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)) }))
                    }
                  >
                    ✓
                  </button>
                  <span
                    className={`pend-name ${p.done ? 'crossed' : ''}`}
                    onClick={() =>
                      update((prev) => ({ ...prev, pending: prev.pending.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)) }))
                    }
                  >
                    {p.text}
                  </span>
                  <div className={`prio prio-${p.prio}`} title={`Prioridad ${p.prio}`} />
                  <button className="pend-del" onClick={() => update((prev) => ({ ...prev, pending: prev.pending.filter((x) => x.id !== p.id) }))}>
                    ×
                  </button>
                </div>
              ))}
              <div className="pend-add">
                <input
                  value={pendText}
                  onChange={(e) => setPendText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPending()}
                  placeholder="Nuevo pendiente…"
                />
                <select value={pendPrio} onChange={(e) => setPendPrio(e.target.value as Priority)}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="normal">Normal</option>
                  <option value="baja">Baja</option>
                </select>
                <button className="small-btn" onClick={addPending}>＋</button>
              </div>
            </div>
          </div>

          {/* NOTAS */}
          <div className="panel">
            <div className="panel-header notes-h"><span className="panel-icon">✏️</span> Notas del equipo</div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              <textarea
                className="notes-input"
                rows={3}
                value={s.notes}
                placeholder="Notas para la casa…"
                onChange={(e) => update((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* EMERGENCIAS */}
          <div className="panel">
            <div className="panel-header emerg-h"><span className="panel-icon">🚨</span> Emergencias</div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              <div className="emerg-row">
                <div className="emerg-icon">🏥</div>
                <input
                  value={s.vetName}
                  placeholder="Nombre veterinario/a"
                  onChange={(e) => update((prev) => ({ ...prev, vetName: e.target.value }))}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
              <div className="emerg-row">
                <div className="emerg-icon">📞</div>
                <input
                  value={s.vetPhone}
                  placeholder="+56 9 …"
                  onChange={(e) => update((prev) => ({ ...prev, vetPhone: e.target.value }))}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </div>

          {/* HISTORIAL */}
          {s.history.length > 0 && (
            <div className="panel">
              <div className="panel-header notes-h"><span className="panel-icon">📈</span> Semanas anteriores</div>
              <div className="panel-body" style={{ paddingTop: 6 }}>
                {[...s.history].reverse().slice(0, 4).map((h, i) => (
                  <div className="hist-row" key={i}>
                    <span>Semana del {formatWeek(h.start)}</span>
                    <span className="hist-pct">
                      {h.total === 0 ? 0 : Math.round((h.completed / h.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast ${toast.on ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}
