// Money is handled as integer paise in the app so totals never suffer
// floating-point drift (0.1 + 0.2). The database value is converted once.

const MAX_PAISE = 100_000_000_00 // ₹10 crore per expense

// Parses user input like "120", "120.5", "120.50". Returns null if invalid.
export function parseAmountToPaise(input: string): number | null {
  const s = input.trim()
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) return null
  const [rupees, frac = ''] = s.split('.')
  const paise = Number(rupees) * 100 + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > MAX_PAISE) return null
  return paise
}

export function dbAmountToPaise(amount: number | string | null | undefined): number {
  const n = Number(amount)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

// Value sent to the database (2 decimal places).
export function paiseToDbAmount(paise: number): string {
  return (paise / 100).toFixed(2)
}

export function formatINR(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const abs = Math.abs(paise)
  const rupees = Math.floor(abs / 100).toLocaleString('en-IN')
  return `${sign}₹${rupees}.${String(abs % 100).padStart(2, '0')}`
}
