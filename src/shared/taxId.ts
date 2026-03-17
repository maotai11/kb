export function validateTaxId(id: string): boolean {
  if (!/^\d{8}$/.test(id)) {
    return false;
  }

  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;

  for (let index = 0; index < 8; index += 1) {
    const product = Number.parseInt(id[index], 10) * weights[index];
    sum += Math.floor(product / 10) + (product % 10);
  }

  if (Number.parseInt(id[6], 10) === 7) {
    return sum % 5 === 0 || (sum + 1) % 5 === 0;
  }

  return sum % 5 === 0;
}
