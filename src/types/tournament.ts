export type Owner = 'Mateus' | 'Lucas'

export type Team = {
  id: string
  name: string
  flag: string
  owner: Owner
  color: string
}

export type MatchStatus = 'pending' | 'completed'

export type PlayerPerformance = {
  playerName: string
  teamId: string
  goals: number
  rating: number | null
  competitor?: Owner
}

export type Match = {
  id: string
  round: 'quarterfinal' | 'semifinal' | 'final'
  home: Team | null
  away: Team | null
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  status: MatchStatus
  playerStats?: PlayerPerformance[]
}

export type TournamentAward = {
  playerName: string
  teamName: string
  goals: number
  averageRating: number
  score: number
}

export type TournamentEdition = {
  id: string
  editionNumber?: number
  date: string
  status?: 'completed' | 'in-progress'
  champion: string
  championFlag: string
  bestPlayer: string
  topScorer: string

  // Cópia dos dados da edição arquivada.
  // São opcionais para manter compatibilidade com históricos antigos.
  teams?: Team[]
  matches?: Match[]
}

export type TournamentState = {
  teams: Team[]
  matches: Match[]
  history?: TournamentEdition[]
  editionId?: string
  editionNumber?: number
}