/**
 * Genera los PNG de QR para la feria:
 *   node scripts/gen-qr.mjs <carpeta-destino>
 * Apuntan al sitio desplegado (SPEC §12-13). Nivel de corrección H (robusto al imprimir).
 */
import QRCode from 'qrcode';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://pawcalendar.vercel.app';
const out = process.argv[2] ?? '.';
await mkdir(out, { recursive: true });

const opts = { width: 1024, margin: 2, errorCorrectionLevel: 'H' };
await QRCode.toFile(`${out}/pawcalendar-planificador.png`, `${BASE}/`, opts);
await QRCode.toFile(`${out}/pawcalendar-simulador.png`, `${BASE}/simulador`, opts);

console.log('QR generados en:', out);
