// utils/date.ts

const pad = (n: number) => n.toString().padStart(2, '0');

/** Devuelve [inicioDeMes, finDeMes] en formato 'YYYY-MM-DD' */
export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const start = { year, month: month + 1, day: 1 };
  const endDate = new Date(year, month + 1, 0); // último día del mes
  const end = {
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1,
    day: endDate.getDate(),
  };

  const toStr = (d: { year: number; month: number; day: number }) =>
    `${d.year}-${pad(d.month)}-${pad(d.day)}`;

  return [toStr(start), toStr(end)] as const;
}

/** Devuelve algo tipo "Noviembre 2025" */
export function getCurrentMonthLabel(locale: string = 'es-AR') {
  const now = new Date();
  return now.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}
