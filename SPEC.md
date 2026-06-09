# PlanPet — Especificación

> Fuente de verdad del proyecto. Cualquier cambio de alcance se decide aquí antes de codear.
> Última actualización: 2026-06-09.

**Contexto:** proyecto universitario de Alan Morales (U. Mayor) para feria académica (~2-4 semanas desde el 2026-06-09). **No** es un producto comercial y **no** es parte de Reva. Costo objetivo: $0 (free tiers).

**Origen:** maqueta visual `planificador_luna.html` (planificador semanal de cuidado de un perro). Se conserva su identidad visual; se reemplaza todo lo hardcodeado por datos reales del usuario.

---

## 1. Qué es

Web app donde una persona de la universidad se registra con su correo, configura el perfil de su perro y su casa, y obtiene un **planificador semanal de cuidado personalizado y funcional**: plan de alimentación calculado con fórmula veterinaria real y rutina semanal de tareas generada automáticamente según raza, edad e integrantes del hogar.

## 2. Flujo de usuario (feria)

1. La persona escanea un **QR** en el stand.
2. Landing simple: explica el proyecto y pide el **correo**.
3. Supabase Auth envía un **magic link** al correo (sin contraseñas).
4. Al entrar por primera vez: **wizard de configuración**.
5. Queda en su **planificador**, persistente y accesible desde cualquier dispositivo con el mismo link/correo.

## 3. Alcance

**Incluido (v1 feria):**
- Registro por magic link (Supabase Auth).
- Wizard: nombre del perro, raza (lista curada + "Mestizo / Quiltro" con tamaño manual), edad, peso, castrado sí/no, integrantes de la casa, objetivos, horarios de comida.
- **Plan de alimentación calculado** (ver §6) — feature estrella 1.
- **Rutina semanal auto-generada** (ver §7) — feature estrella 2. Editable después por el usuario.
- Separación **asignar ≠ completar**: el domingo se planifica, durante la semana se marcan tareas hechas. El progreso mide cumplimiento real.
- Pendientes editables (agregar/quitar, prioridad), notas persistentes, contactos de emergencia propios.
- Objetivos como métricas visibles (ej: paseos hechos vs meta semanal).
- Cierre de semana: archivar y partir semana nueva (historial simple).

**Fuera de alcance (decidido por Alan, 2026-06-09):**
- Sincronización realtime entre dispositivos.
- Modo demo del stand.
- Multi-mascota (v1 = 1 perro por cuenta), gatos u otras especies.
- Cualquier cosa orientada a venta: pagos, planes, landing comercial, SEO.

## 4. Stack

- **Next.js 16.2.8** (estable, App Router, TypeScript). Sin Tailwind: se hereda el CSS propio de la maqueta.
- **Supabase** free tier: Auth (magic links, envía los correos) + Postgres.
- **Vercel** free tier (deploy). **pnpm**.
- Cuentas **nuevas con el correo personal de Alan**, separadas de Reva.
- Regla: no se agregan dependencias sin registrarlo aquí y consultarlo antes.
- Convención: imports relativos dentro de `src/lib/` y `scripts/` llevan extensión `.ts` explícita (permite validar la lógica con `node` puro, sin frameworks de test). `tsconfig.json` tiene `allowImportingTsExtensions: true`.

## 5. Modelo de datos (Supabase)

| Tabla | Campos clave |
|---|---|
| `planners` | `id`, `owner` (auth.uid), `dog_name`, `breed_id`, `size`, `weight_kg`, `age_months`, `neutered`, `goals jsonb`, `meal_times jsonb`, `food_kcal_per_kg`, `vet_contacts jsonb`, `notes` |
| `members` | `id`, `planner_id`, `name`, `color_idx` |
| `assignments` | `planner_id`, `week_start date`, `member_id`, `day 0-6`, `task_type`, `completed bool` |
| `pending_items` | `planner_id`, `text`, `priority`, `done` |

RLS: cada usuario solo ve/edita su propio planner. Mientras no existan las cuentas Supabase, la capa de persistencia se implementa contra `localStorage` detrás de una interfaz, y se cambia el adaptador después (misma forma de datos).

## 6. Algoritmo de alimentación (`src/lib/feeding.ts`)

Fórmulas estándar de nutrición veterinaria (citables en el póster):

- **RER** (Resting Energy Requirement) = `70 × peso_kg^0.75` kcal/día.
- **MER** (Maintenance Energy Requirement) = `RER × factor` según etapa de vida:

| Etapa | Definición | Factor |
|---|---|---|
| Cachorro | < 4 meses | 3.0 |
| Junior | 4–12 meses | 2.0 |
| Adulto castrado | — | 1.5 |
| Adulto entero | — | 1.7 |
| Senior | umbral según tamaño* | 1.3 |

\* Los perros grandes envejecen antes: gigante ≥ 6 años, grande ≥ 7, mediano ≥ 8, pequeño/toy ≥ 10.

- Objetivo "controlar peso": `factor = max(1.0, factor − 0.3)` (la pérdida de peso se prescribe cerca de 1.0×RER).
- Conversión a alimento: densidad energética **editable**, default 3500 kcal/kg de pienso seco; 1 taza ≈ 100 g.
- Comidas/día: cachorro 4, junior 3, adulto/senior 2.
- Fuentes: NRC *Nutrient Requirements of Dogs and Cats* (2006); WSAVA Global Nutrition Guidelines. Mostrar siempre el desglose (RER, factor, kcal, gramos) y la advertencia "orientativo, no reemplaza al veterinario".

## 7. Algoritmo de rutina semanal (`src/lib/routine.ts`)

Motor de reglas determinista (sin IA, sin aleatoriedad — misma entrada, misma semana):

1. **Paseos/día** según energía de la raza: alta → 2, media/baja → 1. Cachorro (< 4 meses, pre-vacunas) → 1 corto. Senior → máx 1. Objetivos "más paseos" o "controlar peso" → +1 paseo sábado y domingo.
2. **Alimentación**: 1 responsable por día (las comidas del día).
3. **Higiene/semana** según pelaje: corto 1, medio 2, largo/doble 3 (días espaciados).
4. **Salud/semana**: adulto/junior 1, cachorro/senior 2 (medicación, control, revisión).
5. **Compras**: 1 por semana (sábado).
6. **Distribución**: prioridad `alimentación > paseo > salud > higiene > compras`; se asigna al integrante con menos carga ese día y menos carga total (round-robin balanceado). Una celda (integrante × día) **puede tener varias tareas** — la grilla de la maqueta se adapta a multi-ícono (en hogares de 1-2 personas es inevitable y realista).

La raza define `tamaño, energía, pelaje` (`src/lib/breeds.ts`, ~33 razas comunes en Chile + Mestizo/Quiltro donde el usuario define tamaño y pelaje).

## 8. UI

- Mantener la identidad visual de la maqueta (paleta pastel, tarjetas, grilla, toasts).
- Wizard de ~4 pasos al primer ingreso; todo editable después desde ajustes.
- Planificador: grilla integrantes × días con celdas multi-tarea; tap sobre tarea asignada la marca completada; progreso = completadas / asignadas.
- Botón "regenerar rutina sugerida" (avisa que sobrescribe la semana actual).

## 9. Hitos

- **S1 (ahora):** scaffold ✔, lógica core (`feeding`, `breeds`, `routine`) con validación ✔, wizard + planificador con persistencia local.
- **S2:** cuentas Supabase/Vercel (Alan) → auth magic link, Postgres + RLS, landing registro.
- **S3:** deploy, QR, objetivos-métricas, cierre de semana, pulido y ensayo de la demo.

## 10. Pendientes de Alan

- [ ] Crear cuentas Supabase y Vercel con el correo personal nuevo.
- [ ] Definir textos del póster (las fórmulas y fuentes de §6 sirven directo).
- [ ] (Opcional) repo GitHub `alanmorales-dev/planpet`.
