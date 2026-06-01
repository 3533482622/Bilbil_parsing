/** 是否在 Capacitor 原生壳内运行 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function getPlatform(): "web" | "android" | "ios" | "unknown" {
  if (typeof window === "undefined") return "web";
  const cap = (
    window as Window & { Capacitor?: { getPlatform?: () => string } }
  ).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "android" || p === "ios") return p;
  if (isCapacitorNative()) return "android";
  return "web";
}
