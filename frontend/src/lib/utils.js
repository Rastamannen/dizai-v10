// src/lib/utils.js
// Kombinerar klassnamn baserat på villkor
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
