import type { Breed } from './types.ts';

/**
 * Catálogo curado de razas comunes en Chile.
 * size/coat de 'mestizo' son null: el usuario los define en el wizard.
 * typicalWeightKg solo pre-llena el campo peso; el cálculo usa el peso real ingresado.
 */
export const BREEDS: Breed[] = [
  { id: 'mestizo',            name: 'Mestizo / Quiltro',    size: null,      energy: 'media', coat: 'corto', typicalWeightKg: null },
  { id: 'chihuahua',          name: 'Chihuahua',            size: 'toy',     energy: 'media', coat: 'corto', typicalWeightKg: 2.5 },
  { id: 'yorkshire',          name: 'Yorkshire Terrier',    size: 'toy',     energy: 'media', coat: 'largo', typicalWeightKg: 3 },
  { id: 'pomerania',          name: 'Pomerania',            size: 'toy',     energy: 'media', coat: 'doble', typicalWeightKg: 3 },
  { id: 'maltes',             name: 'Maltés',               size: 'toy',     energy: 'baja',  coat: 'largo', typicalWeightKg: 4 },
  { id: 'poodle_toy',         name: 'Poodle Toy',           size: 'toy',     energy: 'media', coat: 'largo', typicalWeightKg: 4 },
  { id: 'poodle_mini',        name: 'Poodle Miniatura',     size: 'pequeno', energy: 'media', coat: 'largo', typicalWeightKg: 7 },
  { id: 'shih_tzu',           name: 'Shih Tzu',             size: 'pequeno', energy: 'baja',  coat: 'largo', typicalWeightKg: 6 },
  { id: 'pug',                name: 'Pug',                  size: 'pequeno', energy: 'baja',  coat: 'corto', typicalWeightKg: 8 },
  { id: 'bulldog_frances',    name: 'Bulldog Francés',      size: 'pequeno', energy: 'baja',  coat: 'corto', typicalWeightKg: 11 },
  { id: 'dachshund',          name: 'Dachshund (Teckel)',   size: 'pequeno', energy: 'media', coat: 'corto', typicalWeightKg: 9 },
  { id: 'jack_russell',       name: 'Jack Russell Terrier', size: 'pequeno', energy: 'alta',  coat: 'corto', typicalWeightKg: 7 },
  { id: 'fox_terrier',        name: 'Fox Terrier',          size: 'pequeno', energy: 'alta',  coat: 'corto', typicalWeightKg: 8 },
  { id: 'schnauzer_mini',     name: 'Schnauzer Miniatura',  size: 'pequeno', energy: 'media', coat: 'medio', typicalWeightKg: 7 },
  { id: 'beagle',             name: 'Beagle',               size: 'mediano', energy: 'alta',  coat: 'corto', typicalWeightKg: 12 },
  { id: 'cocker_spaniel',     name: 'Cocker Spaniel',       size: 'mediano', energy: 'media', coat: 'largo', typicalWeightKg: 13 },
  { id: 'corgi',              name: 'Welsh Corgi',          size: 'mediano', energy: 'media', coat: 'doble', typicalWeightKg: 12 },
  { id: 'bulldog_ingles',     name: 'Bulldog Inglés',       size: 'mediano', energy: 'baja',  coat: 'corto', typicalWeightKg: 23 },
  { id: 'border_collie',      name: 'Border Collie',        size: 'mediano', energy: 'alta',  coat: 'doble', typicalWeightKg: 18 },
  { id: 'pastor_australiano', name: 'Pastor Australiano',   size: 'mediano', energy: 'alta',  coat: 'doble', typicalWeightKg: 22 },
  { id: 'chow_chow',          name: 'Chow Chow',            size: 'mediano', energy: 'baja',  coat: 'doble', typicalWeightKg: 25 },
  { id: 'dalmata',            name: 'Dálmata',              size: 'mediano', energy: 'alta',  coat: 'corto', typicalWeightKg: 27 },
  { id: 'husky',              name: 'Husky Siberiano',      size: 'mediano', energy: 'alta',  coat: 'doble', typicalWeightKg: 23 },
  { id: 'boxer',              name: 'Bóxer',                size: 'grande',  energy: 'alta',  coat: 'corto', typicalWeightKg: 30 },
  { id: 'labrador',           name: 'Labrador Retriever',   size: 'grande',  energy: 'alta',  coat: 'corto', typicalWeightKg: 30 },
  { id: 'golden',             name: 'Golden Retriever',     size: 'grande',  energy: 'alta',  coat: 'largo', typicalWeightKg: 32 },
  { id: 'pastor_aleman',      name: 'Pastor Alemán',        size: 'grande',  energy: 'alta',  coat: 'doble', typicalWeightKg: 35 },
  { id: 'rottweiler',         name: 'Rottweiler',           size: 'grande',  energy: 'media', coat: 'corto', typicalWeightKg: 45 },
  { id: 'doberman',           name: 'Dóberman',             size: 'grande',  energy: 'alta',  coat: 'corto', typicalWeightKg: 40 },
  { id: 'akita',              name: 'Akita',                size: 'grande',  energy: 'media', coat: 'doble', typicalWeightKg: 45 },
  { id: 'galgo',              name: 'Galgo',                size: 'grande',  energy: 'baja',  coat: 'corto', typicalWeightKg: 30 },
  { id: 'san_bernardo',       name: 'San Bernardo',         size: 'gigante', energy: 'baja',  coat: 'doble', typicalWeightKg: 70 },
  { id: 'gran_danes',         name: 'Gran Danés',           size: 'gigante', energy: 'media', coat: 'corto', typicalWeightKg: 60 },
];

export function breedById(id: string): Breed {
  const breed = BREEDS.find((b) => b.id === id);
  if (!breed) throw new Error(`Raza desconocida: ${id}`);
  return breed;
}
