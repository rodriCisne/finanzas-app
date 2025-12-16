// utils/date.ts


export function formatLocalDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

// Rango de un mes (mes: 1-12). Devuelve [start, end] como 'YYYY-MM-DD'
export function getMonthRange(year: number, month: number): [string, string] {
  const start = new Date(year, month - 1, 1); // día 1 del mes
  const end = new Date(year, month, 0); // día 0 del mes siguiente = último día del mes

  return [formatLocalDate(start), formatLocalDate(end)];
}

// Etiqueta amigable para el mes: 'diciembre de 2025'
export function getMonthLabel(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

export function getTodayLocalDateString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1); // 0-11
  const day = pad(now.getDate());

  // Formato 'YYYY-MM-DD' usando la fecha local
  return `${year}-${month}-${day}`;
}

// Helper por si lo necesitás en otros lados
export function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-12
  };
}