
import type {
  Match,
  Team,
  TournamentAward,
  TournamentEdition,
  TournamentState,
} from '../types/tournament'

type TeamPerformanceScore = {
  team: Team
  score: number
  averageRating: number
  goalDifference: number
  goalsScored: number
  wonQuarterfinal: boolean
}

type MatchPerformance = {
  score: number
  averageRating: number
  goalDifference: number
  goalsScored: number
}

function createInitialState(
  history: TournamentEdition[] = [],
  editionNumber = history.length + 1,
): TournamentState {
  const teams: Team[] = [
    {
      id: 'mateus-italia',
      name: 'Itália',
      flag: '🇮🇹',
      owner: 'Mateus',
      color: '#168A62',
    },
    {
      id: 'mateus-portugal',
      name: 'Portugal',
      flag: '🇵🇹',
      owner: 'Mateus',
      color: '#C72C41',
    },
    {
      id: 'mateus-franca',
      name: 'França',
      flag: '🇫🇷',
      owner: 'Mateus',
      color: '#3155A6',
    },
    {
      id: 'mateus-inglaterra',
      name: 'Inglaterra',
      flag: '🏴',
      owner: 'Mateus',
      color: '#D64045',
    },
    {
      id: 'lucas-italia',
      name: 'Itália',
      flag: '🇮🇹',
      owner: 'Lucas',
      color: '#168A62',
    },
    {
      id: 'lucas-espanha',
      name: 'Espanha',
      flag: '🇪🇸',
      owner: 'Lucas',
      color: '#DDAA22',
    },
    {
      id: 'lucas-alemanha',
      name: 'Alemanha',
      flag: '🇩🇪',
      owner: 'Lucas',
      color: '#555555',
    },
    {
      id: 'lucas-argentina',
      name: 'Argentina',
      flag: '🇦🇷',
      owner: 'Lucas',
      color: '#6CAED9',
    },
  ]

  const findTeam = (id: string) =>
    teams.find((team) => team.id === id)!

  function createMatch(
    id: string,
    round: Match['round'],
    home: Team | null = null,
    away: Team | null = null,
  ): Match {
    return {
      id,
      round,
      home,
      away,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      status: 'pending',
      playerStats: [],
    }
  }

  return {
    editionId: crypto.randomUUID(),
    editionNumber,
    history,
    teams,
    matches: [
      createMatch(
        'QF1',
        'quarterfinal',
        findTeam('mateus-italia'),
        findTeam('lucas-espanha'),
      ),
      createMatch(
        'QF2',
        'quarterfinal',
        findTeam('mateus-portugal'),
        findTeam('lucas-italia'),
      ),
      createMatch(
        'QF3',
        'quarterfinal',
        findTeam('mateus-franca'),
        findTeam('lucas-argentina'),
      ),
      createMatch(
        'QF4',
        'quarterfinal',
        findTeam('mateus-inglaterra'),
        findTeam('lucas-alemanha'),
      ),
      createMatch('SF1', 'semifinal'),
      createMatch('SF2', 'semifinal'),
      createMatch('FINAL', 'final'),
    ],
  }
}

function emptyMatch(match: Match): Match {
  return {
    ...match,
    homeScore: null,
    awayScore: null,
    winnerId: null,
    status: 'pending',
    playerStats: [],
  }
}

function getQuarterfinals(state: TournamentState): Match[] {
  return state.matches.filter(
    (match) => match.round === 'quarterfinal',
  )
}

function calculateMatchPerformance(
  match: Match,
  team: Team,
): MatchPerformance {
  const isHome = match.home?.id === team.id

  const goalsScored = isHome
    ? match.homeScore ?? 0
    : match.awayScore ?? 0

  const goalsConceded = isHome
    ? match.awayScore ?? 0
    : match.homeScore ?? 0

  const goalDifference = goalsScored - goalsConceded

  const ratings = (match.playerStats ?? [])
    .filter(
      (player) =>
        player.teamId === team.id &&
        player.rating !== null &&
        Number.isFinite(player.rating),
    )
    .map((player) => player.rating as number)

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) /
        ratings.length
      : 5

  const goalDifferencePoints =
    Math.max(0, Math.min(10, goalDifference + 5)) * 10

  const goalsPoints = Math.min(goalsScored, 10) * 10
  const ratingPoints = averageRating * 10

  const score =
    goalDifferencePoints * 0.4 +
    goalsPoints * 0.2 +
    ratingPoints * 0.4

  return {
    score,
    averageRating,
    goalDifference,
    goalsScored,
  }
}

function getTeamPerformance(
  state: TournamentState,
  team: Team,
): TeamPerformanceScore {
  const quarterfinal = getQuarterfinals(state).find(
    (match) =>
      match.home?.id === team.id ||
      match.away?.id === team.id,
  )

  if (!quarterfinal) {
    return {
      team,
      score: 0,
      averageRating: 5,
      goalDifference: 0,
      goalsScored: 0,
      wonQuarterfinal: false,
    }
  }

  const performance = calculateMatchPerformance(
    quarterfinal,
    team,
  )

  return {
    team,
    ...performance,
    wonQuarterfinal:
      quarterfinal.status === 'completed' &&
      quarterfinal.winnerId === team.id,
  }
}

function comparePerformance(
  a: TeamPerformanceScore,
  b: TeamPerformanceScore,
): number {
  return (
    b.score - a.score ||
    b.averageRating - a.averageRating ||
    b.goalDifference - a.goalDifference ||
    b.goalsScored - a.goalsScored ||
    a.team.name.localeCompare(b.team.name) ||
    a.team.id.localeCompare(b.team.id)
  )
}

function getBestEliminated(
  state: TournamentState,
): TeamPerformanceScore | null {
  const eliminated: TeamPerformanceScore[] = []

  for (const match of getQuarterfinals(state)) {
    if (
      match.status !== 'completed' ||
      !match.home ||
      !match.away ||
      !match.winnerId
    ) {
      continue
    }

    const loser =
      match.winnerId === match.home.id
        ? match.away
        : match.home

    eliminated.push(getTeamPerformance(state, loser))
  }

  eliminated.sort(comparePerformance)

  return eliminated[0] ?? null
}

function buildSemifinals(
  state: TournamentState,
): TournamentState {
  const quarterfinals = getQuarterfinals(state)

  if (
    quarterfinals.length !== 4 ||
    quarterfinals.some(
      (match) => match.status !== 'completed',
    )
  ) {
    return {
      ...state,
      matches: state.matches.map((match) => {
        if (
          match.round === 'semifinal' ||
          match.round === 'final'
        ) {
          return {
            ...emptyMatch(match),
            home: null,
            away: null,
          }
        }

        return match
      }),
    }
  }

  const performances = state.teams.map((team) =>
    getTeamPerformance(state, team),
  )

  const bestEliminated = getBestEliminated(state)

  const selectedMateus = performances
    .filter(
      (item) =>
        item.team.owner === 'Mateus' &&
        item.wonQuarterfinal,
    )
    .sort(comparePerformance)

  const selectedLucas = performances
    .filter(
      (item) =>
        item.team.owner === 'Lucas' &&
        item.wonQuarterfinal,
    )
    .sort(comparePerformance)

  if (bestEliminated) {
    const selected =
      bestEliminated.team.owner === 'Mateus'
        ? selectedMateus
        : selectedLucas

    if (
      !selected.some(
        (item) => item.team.id === bestEliminated.team.id,
      )
    ) {
      if (selected.length >= 2) {
        selected.pop()
      }

      selected.push(bestEliminated)
      selected.sort(comparePerformance)
    }
  }

  function completeOwnerSlots(
    owner: 'Mateus' | 'Lucas',
    selected: TeamPerformanceScore[],
  ): TeamPerformanceScore[] {
    const candidates = performances
      .filter((item) => item.team.owner === owner)
      .sort(comparePerformance)

    for (const candidate of candidates) {
      if (selected.length >= 2) break

      const alreadySelected = selected.some(
        (item) => item.team.id === candidate.team.id,
      )

      if (!alreadySelected) {
        selected.push(candidate)
      }
    }

    return selected.sort(comparePerformance).slice(0, 2)
  }

  const mateus = completeOwnerSlots('Mateus', selectedMateus)
  const lucas = completeOwnerSlots('Lucas', selectedLucas)

  if (mateus.length !== 2 || lucas.length !== 2) {
    throw new Error(
      'Não foi possível montar semifinais válidas.',
    )
  }

  const matches = state.matches.map((match) => {
    if (match.id === 'SF1') {
      return {
        ...emptyMatch(match),
        home: mateus[0].team,
        away: lucas[0].team,
      }
    }

    if (match.id === 'SF2') {
      return {
        ...emptyMatch(match),
        home: mateus[1].team,
        away: lucas[1].team,
      }
    }

    if (match.id === 'FINAL') {
      return {
        ...emptyMatch(match),
        home: null,
        away: null,
      }
    }

    return match
  })

  return { ...state, matches }
}

function buildFinal(state: TournamentState): TournamentState {
  const semifinal1 = state.matches.find(
    (match) => match.id === 'SF1',
  )
  const semifinal2 = state.matches.find(
    (match) => match.id === 'SF2',
  )

  if (!semifinal1 || !semifinal2) return state

  if (
    semifinal1.status !== 'completed' ||
    semifinal2.status !== 'completed' ||
    !semifinal1.home ||
    !semifinal1.away ||
    !semifinal2.home ||
    !semifinal2.away ||
    !semifinal1.winnerId ||
    !semifinal2.winnerId
  ) {
    return {
      ...state,
      matches: state.matches.map((match) =>
        match.id === 'FINAL'
          ? {
              ...emptyMatch(match),
              home: null,
              away: null,
            }
          : match,
      ),
    }
  }

  const winner1 =
    semifinal1.winnerId === semifinal1.home.id
      ? semifinal1.home
      : semifinal1.away

  const winner2 =
    semifinal2.winnerId === semifinal2.home.id
      ? semifinal2.home
      : semifinal2.away

  let finalistMateus: Team
  let finalistLucas: Team

  if (winner1.owner !== winner2.owner) {
    finalistMateus =
      winner1.owner === 'Mateus' ? winner1 : winner2
    finalistLucas =
      winner1.owner === 'Lucas' ? winner1 : winner2
  } else {
    const performance1 = calculateMatchPerformance(
      semifinal1,
      winner1,
    )
    const performance2 = calculateMatchPerformance(
      semifinal2,
      winner2,
    )

    const keepWinner1 =
      performance1.score > performance2.score ||
      (performance1.score === performance2.score &&
        (performance1.averageRating >
          performance2.averageRating ||
          (performance1.averageRating ===
            performance2.averageRating &&
            performance1.goalDifference >=
              performance2.goalDifference)))

    const chosenWinner = keepWinner1 ? winner1 : winner2

    const loser1 =
      semifinal1.winnerId === semifinal1.home.id
        ? semifinal1.away
        : semifinal1.home

    const loser2 =
      semifinal2.winnerId === semifinal2.home.id
        ? semifinal2.away
        : semifinal2.home

    const loserPerformance1 = calculateMatchPerformance(
      semifinal1,
      loser1,
    )
    const loserPerformance2 = calculateMatchPerformance(
      semifinal2,
      loser2,
    )

    const chosenLoser =
      loserPerformance1.score > loserPerformance2.score ||
      (loserPerformance1.score === loserPerformance2.score &&
        (loserPerformance1.averageRating >
          loserPerformance2.averageRating ||
          (loserPerformance1.averageRating ===
            loserPerformance2.averageRating &&
            loserPerformance1.goalDifference >=
              loserPerformance2.goalDifference)))
        ? loser1
        : loser2

    finalistMateus =
      chosenWinner.owner === 'Mateus'
        ? chosenWinner
        : chosenLoser

    finalistLucas =
      chosenWinner.owner === 'Lucas'
        ? chosenWinner
        : chosenLoser
  }

  if (finalistMateus.owner === finalistLucas.owner) {
    throw new Error(
      'Não foi possível montar uma final entre Mateus e Lucas.',
    )
  }

  return {
    ...state,
    matches: state.matches.map((match) =>
      match.id === 'FINAL'
        ? {
            ...emptyMatch(match),
            home: finalistMateus,
            away: finalistLucas,
          }
        : match,
    ),
  }
}

export function getInitialTournament(): TournamentState {
  return createInitialState()
}

export function advanceWinner(
  state: TournamentState,
  matchId: string,
  homeScore: number,
  awayScore: number,
  penaltyWinnerId?: string,
  playerStats: NonNullable<Match['playerStats']> = [],
): TournamentState {
  const matches = state.matches.map((match) => ({
    ...match,
  }))

  const match = matches.find((item) => item.id === matchId)

  if (!match || !match.home || !match.away) {
    throw new Error(
      'Partida não encontrada ou seleções indefinidas.',
    )
  }

  if (match.status === 'completed') {
    throw new Error('Esta partida já foi concluída.')
  }

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    throw new Error('Placar inválido.')
  }

  if (homeScore === awayScore && !penaltyWinnerId) {
    throw new Error('Informe o vencedor dos pênaltis.')
  }

  const winnerId =
    homeScore === awayScore
      ? penaltyWinnerId
      : homeScore > awayScore
        ? match.home.id
        : match.away.id

  if (
    winnerId !== match.home.id &&
    winnerId !== match.away.id
  ) {
    throw new Error(
      'O vencedor informado não pertence à partida.',
    )
  }

  if (match.home.owner === match.away.owner) {
    throw new Error(
      'Confronto inválido: Mateus só pode enfrentar Lucas.',
    )
  }

  match.homeScore = homeScore
  match.awayScore = awayScore
  match.winnerId = winnerId
  match.status = 'completed'
  match.playerStats = playerStats

  const updatedState: TournamentState = {
    ...state,
    matches,
  }

  if (match.round === 'quarterfinal') {
    return buildSemifinals(updatedState)
  }

  if (match.round === 'semifinal') {
    return buildFinal(updatedState)
  }

  return updatedState
}

export function resetMatch(
  state: TournamentState,
  matchId: string,
): TournamentState {
  const matches = state.matches.map((match) => ({
    ...match,
  }))

  const target = matches.find(
    (match) => match.id === matchId,
  )

  if (!target) {
    throw new Error('Partida não encontrada.')
  }

  Object.assign(target, emptyMatch(target))

  if (target.round === 'quarterfinal') {
    return buildSemifinals({
      ...state,
      matches,
    })
  }

  if (target.round === 'semifinal') {
    const final = matches.find(
      (match) => match.id === 'FINAL',
    )

    if (final) {
      Object.assign(final, emptyMatch(final))
      final.home = null
      final.away = null
    }
  }

  return { ...state, matches }
}

export function calculateAwards(
  state: TournamentState,
): {
  bestPlayer: TournamentAward | null
  topScorers: TournamentAward[]
  goldenBoot: TournamentAward[]
  silverBoot: TournamentAward[]
} {
  const players = new Map<
    string,
    {
      playerName: string
      teamName: string
      goals: number
      ratingTotal: number
      ratingCount: number
    }
  >()

  for (const match of state.matches) {
    if (match.status !== 'completed') continue

    for (const performance of match.playerStats ?? []) {
      if (!performance.playerName.trim()) continue

      const team = [match.home, match.away].find(
        (item) => item?.id === performance.teamId,
      )

      if (!team) continue

      const key = performance.playerName
        .trim()
        .toLocaleLowerCase()

      const current = players.get(key) ?? {
        playerName: performance.playerName.trim(),
        teamName: team.name,
        goals: 0,
        ratingTotal: 0,
        ratingCount: 0,
      }

      current.goals += performance.goals

      if (
        performance.rating !== null &&
        Number.isFinite(performance.rating)
      ) {
        current.ratingTotal += performance.rating
        current.ratingCount++
      }

      players.set(key, current)
    }
  }

  const awards: TournamentAward[] = Array.from(
    players.values(),
  ).map((player) => {
    const averageRating =
      player.ratingCount > 0
        ? player.ratingTotal / player.ratingCount
        : 0

    const ratingPoints = (averageRating / 10) * 100
    const goalPoints = Math.min(player.goals * 20, 100)

    const score =
      player.ratingCount > 0
        ? ratingPoints * 0.7 + goalPoints * 0.3
        : 0

    return {
      playerName: player.playerName,
      teamName: player.teamName,
      goals: player.goals,
      averageRating,
      score,
    }
  })

  const eligible = awards
    .filter((player) => player.averageRating > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.averageRating - a.averageRating ||
        b.goals - a.goals ||
        a.playerName.localeCompare(b.playerName),
    )

  // A artilharia é definida exclusivamente pela quantidade de gols.
  // O nome serve apenas para manter uma ordem estável em caso de empate.
  const topScorers = awards
    .filter((player) => player.goals > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        a.playerName.localeCompare(b.playerName),
    )

  // Chuteira de Ouro: todos que dividem o maior total de gols.
  const highestGoalCount = topScorers[0]?.goals ?? 0

  const goldenBoot =
    highestGoalCount > 0
      ? topScorers.filter(
          (player) => player.goals === highestGoalCount,
        )
      : []

  // Chuteira de Prata: todos que dividem o segundo maior
  // total DISTINTO de gols. Notas não são usadas no ranking.
  const secondHighestGoalCount =
    topScorers.find(
      (player) => player.goals < highestGoalCount,
    )?.goals ?? 0

  const silverBoot =
    secondHighestGoalCount > 0
      ? topScorers.filter(
          (player) => player.goals === secondHighestGoalCount,
        )
      : []

  return {
    bestPlayer: eligible[0] ?? null,
    topScorers,
    goldenBoot,
    silverBoot,
  }
}

export function createNewCup(
  state: TournamentState,
): TournamentState {
  const history = [...(state.history ?? [])]

  const completedMatches = state.matches.filter(
    (match) => match.status === 'completed',
  )

  const editionNumber =
    state.editionNumber ?? history.length + 1

  // Arquiva a edição se ao menos uma partida tiver sido disputada.
  // A cópia preserva placares e estatísticas sem depender da copa nova.
  if (completedMatches.length > 0) {
    const final = state.matches.find(
      (match) => match.id === 'FINAL',
    )

    const champion =
      final?.status === 'completed'
        ? [final.home, final.away].find(
            (team) => team?.id === final.winnerId,
          ) ?? null
        : null

    const awards = calculateAwards(state)

    const archivedEdition: TournamentEdition = {
      id: state.editionId ?? crypto.randomUUID(),
      editionNumber,
      date: new Date().toISOString(),
      status: champion ? 'completed' : 'in-progress',
      champion: champion?.name ?? 'Não concluída',
      championFlag: champion?.flag ?? '🏆',
      bestPlayer:
        awards.bestPlayer?.playerName ?? 'Não definido',
      topScorer:
        awards.goldenBoot[0]?.playerName ?? 'Não definido',
      teams: state.teams.map((team) => ({ ...team })),
      matches: state.matches.map((match) => ({
        ...match,
        home: match.home ? { ...match.home } : null,
        away: match.away ? { ...match.away } : null,
        playerStats: (match.playerStats ?? []).map((player) => ({
          ...player,
        })),
      })),
    }

    history.push(archivedEdition)

    return createInitialState(history, editionNumber + 1)
  }

  // Se nenhuma partida foi disputada, reinicia a edição sem
  // criar uma entrada vazia no histórico nem avançar a numeração.
  return createInitialState(history, editionNumber)
}
