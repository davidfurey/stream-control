export function paState(): Promise<"on" | "off"> {
  return Promise.resolve("off")
}