import { createContext, useContext } from 'react';

interface TeamFilterContextValue {
  /** null = no filter (all employees). Non-null = restrict to these IDs. */
  filterIds: string[] | null;
}

const TeamFilterContext = createContext<TeamFilterContextValue>({ filterIds: null });

export const useTeamFilter = () => useContext(TeamFilterContext);
export const TeamFilterProvider = TeamFilterContext.Provider;
