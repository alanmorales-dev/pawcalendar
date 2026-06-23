'use client';

import { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  per: string;
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    price: '$0',
    per: '',
    features: ['1 mascota', 'Funciones básicas'],
    featured: true,
  },
  {
    id: 'familiar',
    name: 'Familiar',
    price: '$2.990',
    per: '/mes',
    features: ['Hasta 4 mascotas', 'Colaboración familiar', 'Recordatorios completos'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$5.990',
    per: '/mes',
    features: ['Todo lo anterior', 'Descuentos en aliados', 'Funciones avanzadas'],
  },
];

interface Props {
  onStart: (email: string) => void;
}

export default function Pricing({ onStart }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  function start() {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Escribe un correo válido para recibir tu plan');
      return;
    }
    onStart(e);
  }

  return (
    <div className="wrapper">
      <div className="header" style={{ justifyContent: 'center' }}>
        <div className="logo-area">
          <div className="pet-avatar">🐾</div>
          <div className="logo-text">
            <h1>PawCalendar</h1>
            <p>Organiza el cuidado de tu perro en familia</p>
          </div>
        </div>
      </div>

      <div className="pricing-intro">
        <h2 className="pricing-title">Elige tu plan</h2>
        <p className="pricing-sub">Empieza gratis. Deja tu correo y recibe el plan de tu mascota al terminar.</p>
      </div>

      <div className="pricing-grid">
        {PLANS.map((p) => (
          <div key={p.id} className={`price-card ${p.featured ? 'featured' : ''}`}>
            {p.featured && <div className="price-tag-top">Recomendado</div>}
            <div className="price-name">{p.name}</div>
            <div className="price-amount">
              {p.price}
              {p.per && <span className="price-per">{p.per}</span>}
            </div>
            <ul className="price-features">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            {p.featured ? (
              <div className="price-cta">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && start()}
                  placeholder="tucorreo@ejemplo.cl"
                />
                <button className="btn-primary full" onClick={start}>
                  Probar gratis
                </button>
                {error && <div className="error-msg">{error}</div>}
              </div>
            ) : (
              <button
                className="btn-ghost full"
                onClick={() => setNote('En la feria solo el plan Gratuito está activo. ¡Pruébalo!')}
              >
                Elegir plan
              </button>
            )}
          </div>
        ))}
      </div>

      {note && <div className="pricing-note">{note}</div>}
      <p className="pricing-demo">Demo de feria · los pagos no están habilitados</p>
    </div>
  );
}
