// Decorative sampling only; never use this function for security or credentials.
export function visualNoise(index: number, salt: number) {
  const sample = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return sample - Math.floor(sample)
}
