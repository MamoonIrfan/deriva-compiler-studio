/**
 * WCAG 2.1 Contrast Ratio and Accessibility Utilities
 * Guarantees visual contrast across all custom themes and color variations.
 */

export interface ContrastResult {
  ratio: number;
  scoreAA: boolean;
  scoreAAA: boolean;
  scoreAALarge: boolean;
  textColor: string;
}

/**
 * Converts a 3 or 6-digit hex string to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return { r: 15, g: 23, b: 42 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates relative luminance according to WCAG 2.1
 */
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two hex colors (1:1 to 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Determines whether black or white text provides better contrast for a background
 */
export function getAccessibleTextColor(bgHex: string): string {
  const whiteRatio = getContrastRatio(bgHex, '#ffffff');
  const blackRatio = getContrastRatio(bgHex, '#0f172a');
  return whiteRatio >= blackRatio ? '#ffffff' : '#0f172a';
}

/**
 * Evaluates contrast against WCAG AA standards and returns status
 */
export function evaluateContrast(bgHex: string, textHex: string): ContrastResult {
  const ratio = getContrastRatio(bgHex, textHex);
  const scoreAA = ratio >= 4.5;
  const scoreAAA = ratio >= 7.0;
  const scoreAALarge = ratio >= 3.0;

  return {
    ratio,
    scoreAA,
    scoreAAA,
    scoreAALarge,
    textColor: scoreAA ? textHex : getAccessibleTextColor(bgHex),
  };
}
