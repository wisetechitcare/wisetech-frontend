import { useState, useCallback } from "react";
import { fetchAllStates, fetchAllCities } from "@services/options";
import { AddressCascadeState } from "../types/formEngine.types";

/**
 * useAddressCascade
 *
 * Global reusable hook for the address cascade pattern:
 *   Country → State → City
 *
 * Supports FieldArray contexts where each address row (index) has its own
 * independent states/cities list. Reusable across Lead, Project, Employee,
 * Vendor, Client, and any module with address fields.
 *
 * @param countries  Full country list (fetched by parent)
 */
export function useAddressCascade(countries: any[]): AddressCascadeState {
  const [statesByIndex, setStatesByIndex] = useState<Record<number, any[]>>({});
  const [citiesByIndex, setCitiesByIndex] = useState<Record<number, any[]>>({});

  // Country selected → load states for that country, clear cities
  const handleCountryChange = useCallback(
    async (index: number, countryId: string) => {
      if (!countryId) {
        setStatesByIndex((prev) => ({ ...prev, [index]: [] }));
        setCitiesByIndex((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      const country = countries.find((c) => c.id === countryId);
      if (!country) return;
      try {
        const stateData = await fetchAllStates(country.iso2);
        setStatesByIndex((prev) => ({ ...prev, [index]: stateData }));
        setCitiesByIndex((prev) => ({ ...prev, [index]: [] }));
      } catch {
        setStatesByIndex((prev) => ({ ...prev, [index]: [] }));
      }
    },
    [countries]
  );

  // State selected → load cities for that state
  const handleStateChange = useCallback(
    async (index: number, stateId: string, countryId: string) => {
      if (!stateId || !countryId) return;
      const country = countries.find((c) => c.id === countryId);
      const states = statesByIndex[index] || [];
      const state = states.find((s) => s.id === stateId);
      if (!country || !state) return;
      try {
        const cityData = await fetchAllCities(country.iso2, state.iso2);
        setCitiesByIndex((prev) => ({ ...prev, [index]: cityData }));
      } catch {
        setCitiesByIndex((prev) => ({ ...prev, [index]: [] }));
      }
    },
    [countries, statesByIndex]
  );

  return { statesByIndex, citiesByIndex, handleCountryChange, handleStateChange };
}
