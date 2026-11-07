import type { ReactNode } from "react";

/* Manrope теперь грузится корневым layout — витрина его наследует. */
export default function AirLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
