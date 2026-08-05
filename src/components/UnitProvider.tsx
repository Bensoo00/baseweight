"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { gramsToDisplay, type WeightUnit } from "@/lib/units";

type UnitContextValue = {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  toggleUnit: () => void;
  format: (grams: number) => string;
};

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>("oz");

  useEffect(() => {
    const saved = window.localStorage.getItem("bw-unit");
    if (saved === "oz" || saved === "g") setUnitState(saved);
  }, []);

  function setUnit(next: WeightUnit) {
    setUnitState(next);
    window.localStorage.setItem("bw-unit", next);
  }

  function toggleUnit() {
    setUnit(unit === "oz" ? "g" : "oz");
  }

  return (
    <UnitContext.Provider
      value={{
        unit,
        setUnit,
        toggleUnit,
        format: (grams) => gramsToDisplay(grams, unit),
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    return {
      unit: "oz" as WeightUnit,
      setUnit: () => {},
      toggleUnit: () => {},
      format: (grams: number) => gramsToDisplay(grams, "oz"),
    };
  }
  return ctx;
}

export function Weight({ grams }: { grams: number }) {
  const { format } = useUnit();
  return <>{format(grams)}</>;
}

export function UnitToggle({ dark = false }: { dark?: boolean }) {
  const { unit, setUnit } = useUnit();
  return (
    <div
      className={`inline-flex rounded-md border border-[var(--line)] p-0.5 text-xs font-semibold ${
        dark ? "border-white/20 bg-white/10" : "bg-white"
      }`}
      role="group"
      aria-label="Weight units"
    >
      {(["oz", "g"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setUnit(option)}
          className={`rounded px-2.5 py-1 transition ${
            unit === option
              ? dark
                ? "bg-[var(--accent)] text-white"
                : "bg-ink text-white"
              : dark
                ? "text-white/70"
                : "text-ink-soft"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
