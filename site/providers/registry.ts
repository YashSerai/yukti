import type { PaymentProvider } from "./contracts";

export type ProviderMode = "development" | "seeded" | "sandbox" | "connected";
export type ProviderRegistry = { mode: ProviderMode; payment: PaymentProvider };

export function createRegistry(mode: ProviderMode, providers: { fixture: PaymentProvider; prava?: PaymentProvider }): ProviderRegistry {
  if ((mode === "sandbox" || mode === "connected") && !providers.prava) throw new Error(`Prava provider is required in ${mode} mode`);
  return { mode, payment: mode === "sandbox" || mode === "connected" ? providers.prava! : providers.fixture };
}
