/**
 * 一致ビット数に対応する演出レベル
 */
export type HitLevel = "dim" | "normal" | "good" | "great" | "amazing" | "legendary";

export const LEVEL_COLORS: Record<HitLevel, string> = {
  dim: "#333",
  normal: "#00ff41",
  good: "#00ffff",
  great: "#ffff00",
  amazing: "#ff8800",
  legendary: "#ff0040",
};

export function getHitLevel(matchedBits: number): HitLevel {
  if (matchedBits >= 30) return "legendary";
  if (matchedBits >= 25) return "amazing";
  if (matchedBits >= 20) return "great";
  if (matchedBits >= 14) return "good";
  if (matchedBits >= 10) return "normal";
  return "dim";
}

/**
 * 2つのバイト配列(Uint8Array)の先頭一致ビット数を計算
 */
export function countMatchingBits(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const xor = a[i] ^ b[i];
    if (xor === 0) {
      bits += 8;
    } else {
      // Count leading zeros of XOR byte
      bits += Math.clz32(xor) - 24; // clz32 counts for 32-bit, adjust for 8-bit
      break;
    }
  }
  return bits;
}
