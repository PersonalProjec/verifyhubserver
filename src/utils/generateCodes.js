export function sixDigit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
export function minutesFromNow(mins) {
  return new Date(Date.now() + mins * 60 * 1000);
}
