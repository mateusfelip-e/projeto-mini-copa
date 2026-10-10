
import { supabase } from '../lib/supabase'
import type { TournamentState } from '../types/tournament'

const ROW_ID = 1

export async function loadTournamentFromCloud(): Promise<TournamentState | null> {
  const { data, error } = await supabase
    .from('tournament_state')
    .select('state')
    .eq('id', ROW_ID)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.state) {
    return null
  }

  const saved = data.state as TournamentState

  if (
    !Array.isArray(saved.teams) ||
    !Array.isArray(saved.matches)
  ) {
    throw new Error('Os dados salvos no Supabase são inválidos.')
  }

  const initial = {
    ...saved,
    history: Array.isArray(saved.history) ? saved.history : [],
  }

  return {
    ...initial,
    editionId: saved.editionId ?? crypto.randomUUID(),
    editionNumber:
      Number.isInteger(saved.editionNumber) &&
      (saved.editionNumber ?? 0) > 0
        ? saved.editionNumber
        : initial.history.length + 1,
  }
}

export async function saveTournamentToCloud(
  tournament: TournamentState,
): Promise<void> {
  const { error } = await supabase
    .from('tournament_state')
    .upsert(
      {
        id: ROW_ID,
        state: tournament,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) {
    throw error
  }
}
