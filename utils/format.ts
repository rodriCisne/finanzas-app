export function formatCurrency(amount: number, currency: string) {
  // Verificamos si es entero (sin decimales significativos).
  const isInteger = amount % 1 === 0;

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
