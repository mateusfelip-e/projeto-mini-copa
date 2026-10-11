import { useEffect, useState } from 'react'
import {
  Trophy,
  Shield,
  Swords,
  ChartNoAxesCombined,
  History,
  Settings,
  ChevronRight,
  Plus,
  RotateCcw,
  CalendarDays,
  Medal,
  Users,
  X,
  Trash2,
  Pencil,
  UserRound,
  Star,
  Check,
  Cloud,
  Loader2,
} from 'lucide-react'

import type {
  Match,
  PlayerPerformance,
  TournamentEdition,
  TournamentState,
} from './types/tournament'

import {
  getInitialTournament,
  advanceWinner,
  calculateAwards,
  createNewCup,
} from './services/tournament'

import {
  loadTournamentFromCloud,
  saveTournamentToCloud,
} from './services/tournamentStorage'

const STORAGE_KEY = 'mini-copa-tournament'

const roundLabels = {
  quarterfinal: 'Quartas de final',
  semifinal: 'Semifinais',
  final: 'Grande final',
}

type Team = TournamentState['teams'][number]

type PlayerDraft = {
  id: string
  playerName: string
  teamId: string
  goals: string
  rating: string
  competitor: string
}

type RegistrationDraft = {
  matchId: string
  homeScore: number
  awayScore: number
}

type TeamDraft = {
  name: string
  flag: string
  owner: string
  color: string
}

type MatchTeamsDraft = {
  homeTeamId: string
  awayTeamId: string
}

type PlayerPerformanceWithCompetitor = PlayerPerformance & {
  competitor?: string
}

function loadTournament(): TournamentState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved) as TournamentState
      const initial = getInitialTournament()

      if (
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.matches)
      ) {
        const history = Array.isArray(parsed.history)
          ? parsed.history
          : []

        return {
          ...initial,
          ...parsed,
          history,
          editionId: parsed.editionId ?? initial.editionId,
          editionNumber:
            Number.isInteger(parsed.editionNumber) &&
            (parsed.editionNumber ?? 0) > 0
              ? parsed.editionNumber
              : history.length + 1,
        }
      }
    }
  } catch {
    console.error('Erro ao carregar o campeonato salvo.')
  }

  return getInitialTournament()
}

function formatDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Data não disponível'
  }

  return parsedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getEditionStatus(edition: TournamentEdition) {
  if (edition.status === 'completed') {
    return 'Concluída'
  }

  if (edition.status === 'in-progress') {
    return 'Interrompida'
  }

  return edition.champion !== 'Não concluída'
    ? 'Concluída'
    : 'Interrompida'
}

function getArchivedAwards(edition: TournamentEdition) {
  return calculateAwards({
    teams: edition.teams ?? [],
    matches: edition.matches ?? [],
    history: [],
    editionId: edition.id,
    editionNumber: edition.editionNumber ?? 1,
  })
}

function App() {
  const [tournament, setTournament] =
    useState<TournamentState>(loadTournament)

  const [cloudLoaded, setCloudLoaded] = useState(false)

  const [scores, setScores] = useState<
    Record<string, { home: string; away: string }>
  >({})

  const [activeTab, setActiveTab] = useState('Visão geral')

  const [registration, setRegistration] =
    useState<RegistrationDraft | null>(null)

  const [playerDrafts, setPlayerDrafts] = useState<PlayerDraft[]>([])
  const [draftPlayerName, setDraftPlayerName] = useState('')
  const [draftTeamId, setDraftTeamId] = useState('')
  const [draftGoals, setDraftGoals] = useState('0')
  const [draftRating, setDraftRating] = useState('7.0')
  const [draftCompetitor, setDraftCompetitor] = useState('Mateus')
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [penaltyWinnerId, setPenaltyWinnerId] = useState('')

  // ── Edição de seleções ──
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamDraft, setTeamDraft] = useState<TeamDraft | null>(null)

  // ── Edição de confrontos ──
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [matchTeamsDraft, setMatchTeamsDraft] =
    useState<MatchTeamsDraft | null>(null)

  // ── Carregamento inicial a partir da nuvem ──
  useEffect(() => {
    let cancelled = false

    async function loadCloud() {
      try {
        const cloudTournament = await loadTournamentFromCloud()

        if (cancelled) return

        if (cloudTournament) {
          setTournament(cloudTournament)
        } else {
          console.info('Nenhum campeonato encontrado na nuvem.')
        }
      } catch (error) {
        console.error('Erro ao carregar o campeonato da nuvem:', error)
      } finally {
        if (!cancelled) {
          setCloudLoaded(true)
        }
      }
    }

    loadCloud()

    return () => {
      cancelled = true
    }
  }, [])

  // ── Persistência local ──
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament))
    } catch {
      console.error('Erro ao salvar o campeonato localmente.')
    }
  }, [tournament])

  // ── Persistência remota ──
  useEffect(() => {
    if (!cloudLoaded) return

    const saveCloud = async () => {
      try {
        await saveTournamentToCloud(tournament)
        console.info('Campeonato salvo na nuvem.')
      } catch (error) {
        console.error('Erro ao salvar o campeonato na nuvem:', error)
      }
    }

    saveCloud()
  }, [tournament, cloudLoaded])

  function updateScore(
    id: string,
    side: 'home' | 'away',
    value: string,
  ) {
    setScores((current) => ({
      ...current,
      [id]: {
        home: current[id]?.home ?? '',
        away: current[id]?.away ?? '',
        [side]: value,
      },
    }))
  }

  function resetPlayerForm(teamId?: string) {
    setDraftPlayerName('')
    setDraftGoals('0')
    setDraftRating('7.0')
    setEditingDraftId(null)

    if (teamId) {
      setDraftTeamId(teamId)
    }
  }

  function cancelRegistration() {
    setRegistration(null)
    setPlayerDrafts([])
    setPenaltyWinnerId('')
    resetPlayerForm()
  }

  // ── Edição de seleções ──
  function openTeamEditor(team: Team) {
    setEditingTeamId(team.id)
    setTeamDraft({
      name: team.name,
      flag: team.flag,
      owner: team.owner,
      color: team.color,
    })
  }

  function closeTeamEditor() {
    setEditingTeamId(null)
    setTeamDraft(null)
  }

  function saveTeamEdit() {
    if (!editingTeamId || !teamDraft) return

    const name = teamDraft.name.trim()
    const flag = teamDraft.flag.trim()
    const owner = teamDraft.owner.trim()
    const color = teamDraft.color.trim()

    if (!name) {
      alert('Informe o nome da seleção.')
      return
    }

    if (!flag) {
      alert('Informe a bandeira (emoji).')
      return
    }

    if (!owner) {
      alert('Informe o competidor responsável.')
      return
    }

    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
      alert('Informe uma cor em formato hexadecimal (ex.: #22c55e).')
      return
    }

    setTournament((current) => {
      const target = current.teams.find(
        (team) => team.id === editingTeamId,
      )

      if (!target) return current

      const patch = {
        name,
        flag,
        owner: owner as typeof target.owner,
        color: color as typeof target.color,
      }

      return {
        ...current,
        teams: current.teams.map((team) =>
          team.id === editingTeamId ? { ...team, ...patch } : team,
        ),
        matches: current.matches.map((match) => ({
          ...match,
          home:
            match.home && match.home.id === editingTeamId
              ? ({ ...match.home, ...patch } as typeof match.home)
              : match.home,
          away:
            match.away && match.away.id === editingTeamId
              ? ({ ...match.away, ...patch } as typeof match.away)
              : match.away,
        })),
      }
    })

    closeTeamEditor()
  }

  // ── Edição de confrontos ──
  function openMatchEditor(match: Match) {
    setEditingMatchId(match.id)
    setMatchTeamsDraft({
      homeTeamId: match.home?.id ?? '',
      awayTeamId: match.away?.id ?? '',
    })
  }

  function closeMatchEditor() {
    setEditingMatchId(null)
    setMatchTeamsDraft(null)
  }

  function saveMatchEdit() {
    if (!editingMatchId || !matchTeamsDraft) return

    const { homeTeamId, awayTeamId } = matchTeamsDraft

    if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
      alert('Escolha seleções diferentes para mandante e visitante.')
      return
    }

    setTournament((current) => ({
      ...current,
      matches: current.matches.map((match) => {
        if (match.id !== editingMatchId) return match

        const home = homeTeamId
          ? current.teams.find((t) => t.id === homeTeamId) ?? null
          : null

        const away = awayTeamId
          ? current.teams.find((t) => t.id === awayTeamId) ?? null
          : null

        const winnerStillValid =
          match.winnerId != null &&
          (match.winnerId === home?.id ||
            match.winnerId === away?.id)

        return {
          ...match,
          home,
          away,
          // Match.winnerId é `string | null` — usamos `null` (não
          // `undefined`) quando o vencedor não é mais válido.
          winnerId:
            winnerStillValid && match.winnerId !== null
              ? match.winnerId
              : null,
        }
      }),
    }))

    closeMatchEditor()
  }

  function registerResult(id: string) {
    const score = scores[id]

    if (
      !score ||
      score.home.trim() === '' ||
      score.away.trim() === ''
    ) {
      alert('Preencha os dois placares.')
      return
    }

    const homeScore = Number(score.home)
    const awayScore = Number(score.away)

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      alert('Informe um placar válido.')
      return
    }

    const match = tournament.matches.find(
      (item) => item.id === id,
    )

    if (!match?.home || !match.away) {
      alert('As duas equipes precisam estar definidas.')
      return
    }

    setRegistration({
      matchId: id,
      homeScore,
      awayScore,
    })

    setPlayerDrafts([])
    setPenaltyWinnerId('')
    setEditingDraftId(null)
    setDraftPlayerName('')
    setDraftTeamId(match.home.id)
    setDraftGoals('0')
    setDraftRating('7.0')
    setDraftCompetitor(
      match.home.owner === 'Lucas' ? 'Lucas' : 'Mateus',
    )
  }

  function addPlayerDraft() {
    if (!registration) return

    const match = tournament.matches.find(
      (item) => item.id === registration.matchId,
    )

    if (!match?.home || !match.away) {
      alert('As duas equipes precisam estar definidas.')
      return
    }

    const playerName = draftPlayerName.trim()
    const goals = Number(draftGoals)
    const rating = Number(draftRating)

    if (!playerName) {
      alert('Digite o nome do jogador.')
      return
    }

    if (
      draftTeamId !== match.home.id &&
      draftTeamId !== match.away.id
    ) {
      alert('Selecione uma das duas seleções da partida.')
      return
    }

    if (
      draftGoals.trim() === '' ||
      !Number.isInteger(goals) ||
      goals < 0
    ) {
      alert('Informe uma quantidade válida de gols.')
      return
    }

    if (
      draftRating.trim() === '' ||
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 10
    ) {
      alert('A nota precisa estar entre 0 e 10.')
      return
    }

    const duplicated = playerDrafts.some(
      (player) =>
        player.id !== editingDraftId &&
        player.teamId === draftTeamId &&
        player.playerName.trim().toLowerCase() ===
          playerName.toLowerCase(),
    )

    if (duplicated) {
      alert('Esse jogador já foi cadastrado para essa seleção.')
      return
    }

    const newPlayer: PlayerDraft = {
      id: editingDraftId ?? `${Date.now()}-${Math.random()}`,
      playerName,
      teamId: draftTeamId,
      goals: String(goals),
      rating: String(rating),
      competitor: draftCompetitor,
    }

    if (editingDraftId) {
      setPlayerDrafts((current) =>
        current.map((player) =>
          player.id === editingDraftId ? newPlayer : player,
        ),
      )
    } else {
      setPlayerDrafts((current) => [...current, newPlayer])
    }

    resetPlayerForm(draftTeamId)
  }

  function editPlayerDraft(player: PlayerDraft) {
    setEditingDraftId(player.id)
    setDraftPlayerName(player.playerName)
    setDraftTeamId(player.teamId)
    setDraftGoals(player.goals)
    setDraftRating(player.rating)
    setDraftCompetitor(player.competitor)
  }

  function removePlayerDraft(id: string) {
    setPlayerDrafts((current) =>
      current.filter((player) => player.id !== id),
    )

    if (editingDraftId === id) {
      resetPlayerForm()
    }
  }

  function saveRegistration() {
    if (!registration) return

    const match = tournament.matches.find(
      (item) => item.id === registration.matchId,
    )

    if (!match?.home || !match.away) {
      alert('As duas equipes precisam estar definidas.')
      return
    }

    const isDraw =
      registration.homeScore === registration.awayScore

    if (isDraw && !penaltyWinnerId) {
      alert('Selecione o vencedor nos pênaltis.')
      return
    }

    if (
      isDraw &&
      penaltyWinnerId !== match.home.id &&
      penaltyWinnerId !== match.away.id
    ) {
      alert('Selecione uma das equipes como vencedora nos pênaltis.')
      return
    }

    const homePlayers = playerDrafts.filter(
      (player) => player.teamId === match.home?.id,
    )

    const awayPlayers = playerDrafts.filter(
      (player) => player.teamId === match.away?.id,
    )

    // Só exige jogadores das seleções que efetivamente marcaram gols.
    if (registration.homeScore > 0 && homePlayers.length === 0) {
      alert(
        `Cadastre pelo menos um jogador de ${match.home.name} que tenha marcado gol.`,
      )
      return
    }

    if (registration.awayScore > 0 && awayPlayers.length === 0) {
      alert(
        `Cadastre pelo menos um jogador de ${match.away.name} que tenha marcado gol.`,
      )
      return
    }

    const homeGoals = homePlayers.reduce(
      (total, player) => total + Number(player.goals),
      0,
    )

    const awayGoals = awayPlayers.reduce(
      (total, player) => total + Number(player.goals),
      0,
    )

    if (homeGoals !== registration.homeScore) {
      alert(
        `Os jogadores de ${match.home.name} somam ${homeGoals} gols, mas o placar é ${registration.homeScore}.\n\nCorrija as estatísticas individuais.`,
      )
      return
    }

    if (awayGoals !== registration.awayScore) {
      alert(
        `Os jogadores de ${match.away.name} somam ${awayGoals} gols, mas o placar é ${registration.awayScore}.\n\nCorrija as estatísticas individuais.`,
      )
      return
    }

    const playerStats = playerDrafts.map((player) => ({
      playerName: player.playerName.trim(),
      teamId: player.teamId,
      goals: Number(player.goals),
      rating: Number(player.rating),
      competitor: player.competitor,
    })) as PlayerPerformance[]

    try {
      const updated = advanceWinner(
        tournament,
        registration.matchId,
        registration.homeScore,
        registration.awayScore,
        isDraw ? penaltyWinnerId : undefined,
        playerStats,
      )

      setTournament(updated)

      setScores((current) => {
        const next = { ...current }
        delete next[registration.matchId]
        return next
      })

      cancelRegistration()
      alert('Resultado e estatísticas registrados com sucesso!')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o resultado.',
      )
    }
  }

  function handleNewCup() {
    const hasCompletedMatches = tournament.matches.some(
      (match) => match.status === 'completed',
    )

    const message = hasCompletedMatches
      ? 'Iniciar uma nova Copa?\n\nA edição atual será arquivada no histórico, incluindo as partidas e os dados registrados. A nova edição começará com os resultados zerados.'
      : 'Iniciar uma nova Copa?\n\nNenhuma partida concluída foi encontrada. A edição atual não será arquivada e a numeração será mantida.'

    if (!window.confirm(message)) return

    try {
      setTournament((current) => createNewCup(current))
      setScores({})
      cancelRegistration()
      setActiveTab('Visão geral')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar uma nova Copa.',
      )
    }
  }

  function handleFullReset() {
    const confirmed = window.confirm(
      'ATENÇÃO: deseja apagar todos os dados?\n\nIsso apagará a Copa atual, todas as edições do histórico e os resultados salvos neste navegador. Essa ação não pode ser desfeita.',
    )

    if (!confirmed) return

    setTournament(getInitialTournament())
    setScores({})
    cancelRegistration()
    setActiveTab('Visão geral')
  }

  const completedMatches = tournament.matches.filter(
    (match) => match.status === 'completed',
  ).length

  const finalMatch = tournament.matches.find(
    (match) => match.id === 'FINAL',
  )

  const championTeam =
    finalMatch?.status === 'completed'
      ? [finalMatch.home, finalMatch.away].find(
          (team) => team?.id === finalMatch.winnerId,
        )
      : undefined

  const editionNumber = tournament.editionNumber ?? 1
  const history = tournament.history ?? []
  const awards = calculateAwards(tournament)

  const totalGoals = tournament.matches.reduce((total, match) => {
    if (match.status !== 'completed') return total

    return total + (match.homeScore ?? 0) + (match.awayScore ?? 0)
  }, 0)

  const quarterfinalMatches = tournament.matches.filter(
    (match) => match.round === 'quarterfinal',
  )

  const semifinalMatches = tournament.matches.filter(
    (match) => match.round === 'semifinal',
  )

  const finalMatches = tournament.matches.filter(
    (match) => match.round === 'final',
  )

  const navigation = [
    { name: 'Visão geral', icon: Shield },
    { name: 'Mata-mata', icon: Swords },
    { name: 'Estatísticas', icon: ChartNoAxesCombined },
    { name: 'Histórico', icon: History },
    { name: 'Administração', icon: Settings },
  ]

  function renderCloudBadge() {
    if (!cloudLoaded) {
      return (
        <span className="flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 size={13} className="animate-spin text-amber-400" />
          Carregando da nuvem…
        </span>
      )
    }

    return (
      <span className="flex items-center gap-2 text-xs text-emerald-400/80">
        <Cloud size={13} />
        Dados sincronizados
      </span>
    )
  }

  function renderMatchCard(match: Match) {
    const home = match.home
    const away = match.away
    const isCompleted = match.status === 'completed'
    const isFinal = match.round === 'final'

    const winner = isCompleted
      ? [home, away].find((team) => team?.id === match.winnerId)
      : undefined

    return (
      <div
        key={match.id}
        className={`rounded-2xl border bg-[#111113] p-5 transition duration-200 sm:p-6 ${
          isFinal
            ? 'border-amber-400/40 shadow-lg shadow-amber-400/[0.04] hover:border-amber-400/60'
            : isCompleted
              ? 'border-amber-400/25 hover:border-amber-400/40'
              : 'border-white/10 hover:border-amber-400/25'
        }`}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isFinal ? (
              <Trophy size={15} className="text-amber-400" />
            ) : (
              <Swords size={15} className="text-amber-400" />
            )}

            <span className="text-xs font-bold tracking-wider text-amber-400">
              {match.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                onClick={() => openMatchEditor(match)}
                aria-label={`Editar confronto ${match.id}`}
                title="Editar confronto"
                className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:border-amber-400/30 hover:text-amber-300"
              >
                <Pencil size={13} />
              </button>
            )}

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                isCompleted
                  ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : home && away
                    ? 'border border-white/10 bg-white/[0.03] text-zinc-400'
                    : 'border border-white/5 bg-black/30 text-zinc-600'
              }`}
            >
              {isCompleted
                ? 'Concluída'
                : home && away
                  ? 'Aguardando resultado'
                  : 'Aguardando classificados'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div
            className={`min-w-0 rounded-xl p-3 text-center sm:p-4 ${
              isCompleted && home?.id === match.winnerId
                ? 'border border-amber-400/20 bg-amber-400/[0.06]'
                : 'border border-white/5 bg-black/20'
            }`}
          >
            <div className="mb-2 text-3xl sm:text-4xl">
              {home?.flag ?? '🏳️'}
            </div>

            <p className="truncate text-sm font-semibold text-zinc-100">
              {home?.name ?? 'A definir'}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {home?.owner ?? '—'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {isCompleted ? (
              <>
                <span className="text-xs font-bold tracking-widest text-zinc-600">
                  PLACAR
                </span>

                <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-black px-3 py-3 sm:gap-3 sm:px-4">
                  <span
                    className={`text-2xl font-bold tabular-nums ${
                      home?.id === match.winnerId
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {match.homeScore ?? 0}
                  </span>

                  <span className="text-zinc-700">:</span>

                  <span
                    className={`text-2xl font-bold tabular-nums ${
                      away?.id === match.winnerId
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {match.awayScore ?? 0}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs font-bold tracking-widest text-zinc-600">
                  PLACAR
                </span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    aria-label={`Gols de ${home?.name ?? 'mandante'}`}
                    type="number"
                    min="0"
                    disabled={!home || !away}
                    value={scores[match.id]?.home ?? ''}
                    onChange={(event) =>
                      updateScore(match.id, 'home', event.target.value)
                    }
                    className="w-11 rounded-lg border border-white/10 bg-black px-1 py-3 text-center text-lg font-bold text-amber-400 outline-none transition focus:border-amber-400/60 disabled:opacity-30 sm:w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  <span className="text-zinc-600">:</span>

                  <input
                    aria-label={`Gols de ${away?.name ?? 'visitante'}`}
                    type="number"
                    min="0"
                    disabled={!home || !away}
                    value={scores[match.id]?.away ?? ''}
                    onChange={(event) =>
                      updateScore(match.id, 'away', event.target.value)
                    }
                    className="w-11 rounded-lg border border-white/10 bg-black px-1 py-3 text-center text-lg font-bold text-amber-400 outline-none transition focus:border-amber-400/60 disabled:opacity-30 sm:w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </>
            )}
          </div>

          <div
            className={`min-w-0 rounded-xl p-3 text-center sm:p-4 ${
              isCompleted && away?.id === match.winnerId
                ? 'border border-amber-400/20 bg-amber-400/[0.06]'
                : 'border border-white/5 bg-black/20'
            }`}
          >
            <div className="mb-2 text-3xl sm:text-4xl">
              {away?.flag ?? '🏳️'}
            </div>

            <p className="truncate text-sm font-semibold text-zinc-100">
              {away?.name ?? 'A definir'}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {away?.owner ?? '—'}
            </p>
          </div>
        </div>

        {isCompleted && winner && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3">
            <Trophy size={15} className="text-amber-400" />

            <span className="text-xs text-zinc-400">
              Classificado:
            </span>

            <span className="text-sm font-semibold text-amber-300">
              {winner.flag} {winner.name}
            </span>
          </div>
        )}

        {!isCompleted && (
          <button
            disabled={!home || !away}
            onClick={() => registerResult(match.id)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-zinc-600"
          >
            <Plus size={16} />
            Registrar resultado
          </button>
        )}
      </div>
    )
  }

  const registrationMatch = registration
    ? tournament.matches.find(
        (match) => match.id === registration.matchId,
      )
    : undefined

  const editingTeam = editingTeamId
    ? tournament.teams.find((team) => team.id === editingTeamId)
    : undefined

  const editingMatch = editingMatchId
    ? tournament.matches.find((match) => match.id === editingMatchId)
    : undefined

  const matchEditorHomeTeam =
    editingMatch && matchTeamsDraft?.homeTeamId
      ? tournament.teams.find(
          (team) => team.id === matchTeamsDraft.homeTeamId,
        )
      : undefined

  const matchEditorAwayTeam =
    editingMatch && matchTeamsDraft?.awayTeamId
      ? tournament.teams.find(
          (team) => team.id === matchTeamsDraft.awayTeamId,
        )
      : undefined

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0d0d10] p-6 lg:block">
        <div className="mb-12 flex items-center gap-3">
          <div className="rounded-xl bg-amber-400 p-2 text-black shadow-lg shadow-amber-400/10">
            <Trophy size={22} />
          </div>

          <div>
            <h1 className="font-bold tracking-wide">MINI-COPA</h1>
            <p className="text-xs text-zinc-500">Tournament Manager</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Campeonato
        </p>

        <nav className="space-y-2">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                activeTab === name
                  ? 'border-amber-400/20 bg-amber-400/10 font-semibold text-amber-300'
                  : 'border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              <Icon
                size={18}
                className={
                  activeTab === name
                    ? 'text-amber-400'
                    : 'text-zinc-500'
                }
              />
              {name}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium">Temporada atual</p>

          <p className="mt-1 text-xs text-amber-400">
            Copa {String(editionNumber).padStart(2, '0')}
          </p>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{
                width: `${(completedMatches / 7) * 100}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            {completedMatches} de 7 partidas
          </p>

          <div className="mt-3 border-t border-white/10 pt-3">
            {renderCloudBadge()}
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-7xl p-5 sm:p-8 lg:ml-64 lg:p-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400">
              COMPETIÇÃO / COPA{' '}
              {String(editionNumber).padStart(2, '0')}
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">{renderCloudBadge()}</div>

            <div className="rounded-full border border-white/10 bg-[#111113] px-4 py-2 text-xs text-zinc-400">
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  championTeam ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {championTeam
                ? 'Campeonato encerrado'
                : 'Em andamento'}
            </div>
          </div>
        </header>

        {activeTab === 'Visão geral' && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-gradient-to-br from-[#191919] to-[#101012] p-6 sm:p-10">
              <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-3xl" />

              <div className="relative grid items-center gap-8 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold tracking-[0.25em] text-amber-400">
                    COPA {String(editionNumber).padStart(2, '0')}
                  </p>

                  <h3 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                    O caminho
                    <br />
                    até a <span className="text-amber-400">glória.</span>
                  </h3>

                  <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
                    Oito seleções. Dois competidores. Um único campeão.
                    Registre os resultados e acompanhe a disputa.
                  </p>

                  <button
                    onClick={() => setActiveTab('Mata-mata')}
                    className="mt-7 flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
                  >
                    Ver confrontos <ChevronRight size={17} />
                  </button>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex h-44 w-44 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.04] sm:h-52 sm:w-52">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border border-amber-400/30 sm:h-40 sm:w-40">
                      <Trophy
                        size={76}
                        strokeWidth={1}
                        className="text-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Seleções', value: '08', icon: Shield },
                { label: 'Partidas', value: '07', icon: Swords },
                { label: 'Competidores', value: '02', icon: Users },
                {
                  label: 'Concluídas',
                  value: String(completedMatches).padStart(2, '0'),
                  icon: History,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-[#111113] p-5 transition hover:border-amber-400/25"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500">{label}</p>
                    <Icon size={18} className="text-amber-400/80" />
                  </div>

                  <p className="mt-4 text-3xl font-bold text-amber-400">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            {championTeam && (
              <section className="mt-8 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/[0.08] to-transparent p-6">
                <Trophy className="mb-3 text-amber-400" size={32} />

                <p className="text-xs font-bold tracking-widest text-amber-400">
                  CAMPEÃO DA MINI-COPA
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {championTeam.flag} {championTeam.name}
                </h3>

                <p className="mt-1 text-sm text-zinc-400">
                  Controlada por {championTeam.owner}
                </p>
              </section>
            )}

            <section className="mt-12 pb-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                    PARTICIPANTES
                  </p>

                  <h3 className="mt-2 text-xl font-semibold">
                    Seleções participantes
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Quatro seleções para cada competidor. Toque no ícone de
                    lápis para editar nome, bandeira, competidor e cor.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {tournament.teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="rounded-2xl border border-white/10 bg-[#111113] p-5 transition hover:-translate-y-1 hover:border-amber-400/25"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xl">{team.flag}</span>

                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-medium"
                          style={{
                            color: team.color,
                            backgroundColor: `${team.color}15`,
                          }}
                        >
                          {team.owner}
                        </span>

                        <button
                          onClick={() => openTeamEditor(team)}
                          aria-label={`Editar ${team.name}`}
                          className="rounded-lg border border-white/10 p-1.5 text-zinc-500 transition hover:border-amber-400/30 hover:text-amber-300"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>

                    <h4 className="mt-5 font-semibold">{team.name}</h4>

                    <p className="mt-2 text-xs text-zinc-600">
                      Seleção {String(index + 1).padStart(2, '0')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'Mata-mata' && (
          <section className="space-y-12 pb-10">
            <div className="rounded-2xl border border-amber-400/15 bg-gradient-to-r from-amber-400/[0.06] to-transparent p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <Swords className="text-amber-400" size={25} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    Caminho até a final
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Cada fase tem sua própria área. Registre os placares
                    das quartas para definir os classificados, avance
                    pelas semifinais e decida quem será o campeão.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                      <span className="mr-2 text-amber-400">01</span>
                      Quartas
                    </span>

                    <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                      <span className="mr-2 text-amber-400">02</span>
                      Semifinais
                    </span>

                    <span className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-300">
                      <span className="mr-2">03</span>
                      Grande final
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <section>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-sm font-bold text-amber-400">
                      01
                    </span>

                    <h3 className="text-xl font-bold sm:text-2xl">
                      Quartas de final
                    </h3>
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    Os quatro confrontos iniciais da competição.
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-[#111113] px-3 py-1.5 text-xs text-zinc-400">
                  {
                    quarterfinalMatches.filter(
                      (match) => match.status === 'completed',
                    ).length
                  }
                  /{quarterfinalMatches.length} concluídas
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {quarterfinalMatches.map(renderMatchCard)}
              </div>
            </section>

            <section className="border-t border-white/10 pt-10">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-sm font-bold text-amber-400">
                      02
                    </span>

                    <h3 className="text-xl font-bold sm:text-2xl">
                      Semifinais
                    </h3>
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    Os confrontos que definem os finalistas.
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-[#111113] px-3 py-1.5 text-xs text-zinc-400">
                  {
                    semifinalMatches.filter(
                      (match) => match.status === 'completed',
                    ).length
                  }
                  /{semifinalMatches.length} concluídas
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {semifinalMatches.map(renderMatchCard)}
              </div>
            </section>

            <section className="border-t border-amber-400/20 pt-10">
              <div className="mb-7 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
                    <Trophy className="text-amber-400" size={30} />
                  </div>
                </div>

                <p className="text-xs font-bold tracking-[0.3em] text-amber-400">
                  A DECISÃO
                </p>

                <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Grande final
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
                  O último confronto. Uma partida para definir o campeão
                  da Mini-Copa.
                </p>
              </div>

              <div className="mx-auto max-w-3xl">
                {finalMatches.map(renderMatchCard)}
              </div>

              {championTeam && (
                <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/[0.08] via-amber-400/[0.03] to-transparent p-6 text-center sm:p-8">
                  <Trophy className="mx-auto mb-4 text-amber-400" size={38} />

                  <p className="text-xs font-bold tracking-[0.25em] text-amber-400">
                    CAMPEÃO DA MINI-COPA
                  </p>

                  <h4 className="mt-3 text-2xl font-bold sm:text-3xl">
                    {championTeam.flag} {championTeam.name}
                  </h4>

                  <p className="mt-2 text-sm text-zinc-400">
                    Campeão de {championTeam.owner}
                  </p>
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === 'Estatísticas' && (
          <section className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 transition hover:border-amber-400/20">
                <Swords className="mb-5 text-amber-400" size={25} />

                <p className="text-sm text-zinc-500">Partidas concluídas</p>

                <p className="mt-3 text-3xl font-bold text-amber-400">
                  {completedMatches}/7
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 transition hover:border-amber-400/20">
                <Trophy className="mb-5 text-amber-400" size={25} />

                <p className="text-sm text-zinc-500">Gols registrados</p>

                <p className="mt-3 text-3xl font-bold text-amber-400">
                  {totalGoals}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 transition hover:border-amber-400/20">
                <Medal className="mb-5 text-amber-400" size={25} />

                <p className="text-sm text-zinc-500">Melhor jogador</p>

                <p className="mt-3 text-xl font-bold text-amber-400">
                  {awards.bestPlayer
                    ? awards.bestPlayer.playerName
                    : 'A definir'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                  PREMIAÇÕES
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Estatísticas individuais
                </h3>
              </div>

              {awards.bestPlayer ? (
                <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
                  <p className="text-xs font-bold tracking-widest text-amber-400">
                    MELHOR JOGADOR DA COPA
                  </p>

                  <p className="mt-3 text-xl font-semibold">
                    {awards.bestPlayer.playerName}
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    {awards.bestPlayer.teamName} · Nota média{' '}
                    {awards.bestPlayer.averageRating.toFixed(1)} ·{' '}
                    {awards.bestPlayer.goals} gols
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-7 text-zinc-500">
                  Ainda não existem estatísticas individuais registradas.
                  Registre o placar, os gols de cada jogador e suas notas
                  para calcular as premiações.
                </p>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <Trophy className="text-amber-400" size={23} />

                    <div>
                      <p className="text-xs font-bold tracking-widest text-amber-400">
                        CHUTEIRA DE OURO
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Maior número de gols
                      </p>
                    </div>
                  </div>

                  {awards.goldenBoot.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {awards.goldenBoot.map((player) => (
                        <div
                          key={`${player.playerName}-${player.teamName}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold">{player.playerName}</p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {player.teamName}
                            </p>
                          </div>

                          <span className="font-bold text-amber-400">
                            {player.goals} gols
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      Ainda não definida.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-500/20 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3">
                    <Medal className="text-zinc-300" size={23} />

                    <div>
                      <p className="text-xs font-bold tracking-widest text-zinc-300">
                        CHUTEIRA DE PRATA
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Segunda maior marca distinta de gols
                      </p>
                    </div>
                  </div>

                  {awards.silverBoot.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {awards.silverBoot.map((player) => (
                        <div
                          key={`${player.playerName}-${player.teamName}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold">{player.playerName}</p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {player.teamName}
                            </p>
                          </div>

                          <span className="font-bold text-zinc-300">
                            {player.goals} gols
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">
                      Ainda não definida.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-semibold">Artilharia completa</h4>

                {awards.topScorers.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {awards.topScorers.map((player) => {
                      const rank =
                        1 +
                        awards.topScorers
                          .filter((other) => other.goals > player.goals)
                          .filter(
                            (other, index, array) =>
                              array.findIndex(
                                (item) => item.goals === other.goals,
                              ) === index,
                          ).length

                      return (
                        <div
                          key={`${player.playerName}-${player.teamName}`}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-sm font-bold text-amber-400">
                              {rank}
                            </span>

                            <div>
                              <p className="font-medium">{player.playerName}</p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {player.teamName}
                              </p>
                            </div>
                          </div>

                          <span className="font-bold text-amber-400">
                            {player.goals} gols
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    Nenhum gol individual registrado até o momento.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'Histórico' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <History className="text-amber-400" size={28} />
                </div>

                <div>
                  <h3 className="text-xl font-semibold">Histórico de Copas</h3>

                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Consulte as edições arquivadas, seus placares,
                    vencedores e estatísticas. Cada Copa mantém seus
                    próprios dados, independentemente da edição atual.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-zinc-500">Edição atual</p>

                  <p className="mt-3 text-2xl font-bold text-amber-400">
                    Copa {editionNumber}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-zinc-500">Edições arquivadas</p>

                  <p className="mt-3 text-2xl font-bold text-amber-400">
                    {history.length}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-zinc-500">
                    Campeonatos concluídos
                  </p>

                  <p className="mt-3 text-2xl font-bold text-amber-400">
                    {
                      history.filter(
                        (edition) =>
                          getEditionStatus(edition) === 'Concluída',
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            {championTeam && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="text-amber-400" size={28} />

                  <div>
                    <p className="text-xs font-bold tracking-widest text-amber-400">
                      EDIÇÃO ATUAL · COPA {editionNumber}
                    </p>

                    <p className="mt-2 text-lg font-semibold">
                      {championTeam.flag} {championTeam.name}
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      Campeão de {championTeam.owner}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#111113] p-10 text-center">
                <History
                  className="mx-auto mb-4 text-amber-400/60"
                  size={40}
                />

                <h3 className="text-lg font-semibold">
                  Nenhuma edição arquivada
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-500">
                  Quando você iniciar uma nova Copa após concluir pelo
                  menos uma partida, a edição anterior será salva aqui
                  com seus resultados. Não é necessário disputar a final
                  para arquivar uma edição.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {[...history]
                  .map((edition, index) => ({
                    edition,
                    fallbackNumber: index + 1,
                  }))
                  .sort(
                    (a, b) =>
                      (b.edition.editionNumber ?? b.fallbackNumber) -
                      (a.edition.editionNumber ?? a.fallbackNumber),
                  )
                  .map(({ edition, fallbackNumber }) => {
                    const number =
                      edition.editionNumber ?? fallbackNumber

                    const editionMatches = edition.matches ?? []
                    const editionAwards = getArchivedAwards(edition)

                    const completedEditionMatches =
                      editionMatches.filter(
                        (match) => match.status === 'completed',
                      ).length

                    return (
                      <details
                        key={edition.id}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111113] transition hover:border-amber-400/20"
                      >
                        <summary className="cursor-pointer list-none p-5 transition hover:bg-white/[0.02] sm:p-6">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.06] text-lg font-bold text-amber-400">
                                {String(number).padStart(2, '0')}
                              </div>

                              <div>
                                <h3 className="font-semibold">
                                  Copa {number}
                                </h3>

                                <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                                  <CalendarDays size={13} />
                                  {formatDate(edition.date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs ${
                                  getEditionStatus(edition) === 'Concluída'
                                    ? 'bg-emerald-400/10 text-emerald-400'
                                    : 'bg-amber-400/10 text-amber-400'
                                }`}
                              >
                                {getEditionStatus(edition)}
                              </span>

                              <ChevronRight
                                size={18}
                                className="text-zinc-500 transition group-open:rotate-90"
                              />
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/[0.05] bg-black/30 p-4">
                              <p className="text-xs text-zinc-500">Campeão</p>

                              <p className="mt-2 font-medium">
                                {edition.championFlag} {edition.champion}
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/[0.05] bg-black/30 p-4">
                              <p className="text-xs text-zinc-500">
                                Partidas concluídas
                              </p>

                              <p className="mt-2 font-medium text-amber-400">
                                {completedEditionMatches}/7
                              </p>
                            </div>

                            <div className="rounded-xl border border-white/[0.05] bg-black/30 p-4">
                              <p className="text-xs text-zinc-500">
                                Chuteira de Ouro
                              </p>

                              <p className="mt-2 font-medium">
                                {editionAwards.goldenBoot.length > 0
                                  ? editionAwards.goldenBoot
                                      .map((player) => player.playerName)
                                      .join(', ')
                                  : edition.topScorer || 'Não definido'}
                              </p>
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-white/10 p-5 sm:p-6">
                          <h4 className="font-semibold">
                            Resultados das partidas
                          </h4>

                          {editionMatches.length === 0 ? (
                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                              Esta edição foi salva antes de os detalhes
                              das partidas começarem a ser armazenados.
                              Os dados disponíveis no histórico antigo
                              foram preservados.
                            </p>
                          ) : (
                            <div className="mt-5 space-y-4">
                              {editionMatches.map((match: Match) => (
                                <div
                                  key={match.id}
                                  className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
                                >
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-amber-400">
                                      {roundLabels[match.round]} · {match.id}
                                    </span>

                                    <span className="text-xs text-zinc-500">
                                      {match.status === 'completed'
                                        ? 'Concluída'
                                        : 'Não disputada'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    <div>
                                      <p className="text-sm font-medium">
                                        {match.home
                                          ? `${match.home.flag} ${match.home.name}`
                                          : 'A definir'}
                                      </p>

                                      <p className="mt-1 text-xs text-zinc-500">
                                        {match.home?.owner ?? '—'}
                                      </p>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-[#111113] px-4 py-3 text-center font-bold tabular-nums">
                                      {match.status === 'completed'
                                        ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
                                        : '— : —'}
                                    </div>

                                    <div className="text-right">
                                      <p className="text-sm font-medium">
                                        {match.away
                                          ? `${match.away.flag} ${match.away.name}`
                                          : 'A definir'}
                                      </p>

                                      <p className="mt-1 text-xs text-zinc-500">
                                        {match.away?.owner ?? '—'}
                                      </p>
                                    </div>
                                  </div>

                                  {match.status === 'completed' && (
                                    <p className="mt-4 text-xs text-amber-400">
                                      Vencedor:{' '}
                                      {
                                        [match.home, match.away].find(
                                          (team) =>
                                            team?.id === match.winnerId,
                                        )?.name
                                      }
                                    </p>
                                  )}

                                  {(match.playerStats ?? []).length > 0 && (
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                      <p className="mb-3 text-xs font-medium text-zinc-400">
                                        Estatísticas individuais
                                      </p>

                                      <div className="space-y-3">
                                        {(match.playerStats ?? []).map(
                                          (player, index) => {
                                            const team = [
                                              match.home,
                                              match.away,
                                            ].find(
                                              (item) =>
                                                item?.id === player.teamId,
                                            )

                                            const competitor = (
                                              player as PlayerPerformanceWithCompetitor
                                            ).competitor

                                            return (
                                              <div
                                                key={`${player.playerName}-${index}`}
                                                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                                              >
                                                <span className="text-zinc-300">
                                                  {player.playerName}
                                                  {competitor
                                                    ? ` · ${competitor}`
                                                    : ''}
                                                  {team
                                                    ? ` · ${team.name}`
                                                    : ''}
                                                </span>

                                                <span className="text-zinc-500">
                                                  {player.goals} gols
                                                  {' · '}
                                                  Nota: {player.rating ?? '—'}
                                                </span>
                                              </div>
                                            )
                                          },
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-7 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                              <p className="text-xs font-bold tracking-widest text-amber-400">
                                MELHOR JOGADOR
                              </p>

                              <p className="mt-3 font-semibold">
                                {editionAwards.bestPlayer?.playerName ??
                                  edition.bestPlayer ??
                                  'Não definido'}
                              </p>

                              {editionAwards.bestPlayer && (
                                <p className="mt-2 text-xs text-zinc-500">
                                  Nota média:{' '}
                                  {editionAwards.bestPlayer.averageRating.toFixed(1)}
                                  {' · '}
                                  {editionAwards.bestPlayer.goals} gols
                                </p>
                              )}
                            </div>

                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
                              <p className="text-xs font-bold tracking-widest text-amber-400">
                                CHUTEIRA DE OURO
                              </p>

                              {editionAwards.goldenBoot.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                  {editionAwards.goldenBoot.map((player) => (
                                    <div
                                      key={`${player.playerName}-${player.teamName}`}
                                      className="flex items-center justify-between gap-2 text-sm"
                                    >
                                      <span>
                                        {player.playerName}
                                        <span className="ml-2 text-xs text-zinc-500">
                                          {player.teamName}
                                        </span>
                                      </span>

                                      <span className="font-semibold text-amber-400">
                                        {player.goals} gols
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-zinc-500">
                                  {edition.topScorer || 'Não definido'}
                                </p>
                              )}
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                              <p className="text-xs font-bold tracking-widest text-zinc-300">
                                CHUTEIRA DE PRATA
                              </p>

                              {editionAwards.silverBoot.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                  {editionAwards.silverBoot.map((player) => (
                                    <div
                                      key={`${player.playerName}-${player.teamName}`}
                                      className="flex items-center justify-between gap-2 text-sm"
                                    >
                                      <span>
                                        {player.playerName}
                                        <span className="ml-2 text-xs text-zinc-500">
                                          {player.teamName}
                                        </span>
                                      </span>

                                      <span className="font-semibold text-zinc-300">
                                        {player.goals} gols
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-zinc-500">
                                  Não definido
                                </p>
                              )}
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                              <p className="text-xs font-bold tracking-widest text-amber-400">
                                ARTILHARIA COMPLETA
                              </p>

                              {editionAwards.topScorers.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                  {editionAwards.topScorers
                                    .slice(0, 5)
                                    .map((player) => (
                                      <div
                                        key={`${player.playerName}-${player.teamName}`}
                                        className="flex items-center justify-between gap-2 text-sm"
                                      >
                                        <span>{player.playerName}</span>

                                        <span className="font-semibold text-amber-400">
                                          {player.goals} gols
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-zinc-500">
                                  {edition.topScorer || 'Não definido'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    )
                  })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'Administração' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 sm:p-8">
              <div className="mb-5 inline-flex rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                <Settings className="text-amber-400" size={28} />
              </div>

              <h3 className="text-xl font-semibold">
                Administração do campeonato
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
                Os resultados são salvos automaticamente neste navegador.
                Ao iniciar uma nova Copa, os resultados atuais são
                arquivados se pelo menos uma partida tiver sido concluída.
                O histórico permanece disponível entre as edições.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleNewCup}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
                >
                  <Plus size={17} />
                  Iniciar nova Copa
                </button>

                <button
                  onClick={() => setActiveTab('Visão geral')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:border-amber-400/25 hover:bg-white/[0.03]"
                >
                  <Pencil size={17} />
                  Editar seleções
                </button>

                <button
                  onClick={() => setActiveTab('Histórico')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:border-amber-400/25 hover:bg-white/[0.03]"
                >
                  <History size={17} />
                  Consultar histórico
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <Cloud className="text-amber-400" size={23} />
                </div>

                <div>
                  <h3 className="font-semibold">Sincronização</h3>

                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Ao abrir o app, os dados mais recentes são carregados
                    da nuvem. O envio automático das alterações será
                    ativado em uma próxima etapa.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                {renderCloudBadge()}
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3">
                  <RotateCcw className="text-red-400" size={23} />
                </div>

                <div>
                  <h3 className="font-semibold">Reset geral</h3>

                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Apaga a Copa atual e todas as edições arquivadas.
                    Use esta opção somente se realmente quiser eliminar
                    todo o histórico salvo neste navegador.
                  </p>

                  <button
                    onClick={handleFullReset}
                    className="mt-5 rounded-xl border border-red-500/30 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    Apagar todos os dados
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111113] p-6">
              <h3 className="text-sm font-semibold">Estado atual</h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-zinc-500">Edição</p>

                  <p className="mt-2 font-semibold text-amber-400">
                    Copa {editionNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">
                    Partidas concluídas
                  </p>

                  <p className="mt-2 font-semibold">
                    {completedMatches} de 7
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">
                    Histórico arquivado
                  </p>

                  <p className="mt-2 font-semibold">
                    {history.length} edições
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-12 border-t border-white/10 py-7 text-center text-xs tracking-wider text-zinc-600">
          MINI-COPA <span className="mx-2 text-amber-400">·</span>
          UMA COMPETIÇÃO ENTRE AMIGOS
        </footer>
      </main>

      {/* ── Modal: Editar seleção ── */}
      {editingTeamId && teamDraft && editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111113]/95 p-5 backdrop-blur sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                    MINI-COPA · EDITAR SELEÇÃO
                  </p>

                  <h3 className="mt-2 text-xl font-bold sm:text-2xl">
                    Editar seleção
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Atualize os dados da seleção. As partidas em que ela
                    aparece também serão atualizadas automaticamente.
                  </p>
                </div>

                <button
                  onClick={closeTeamEditor}
                  aria-label="Fechar formulário"
                  className="rounded-xl border border-white/10 p-2.5 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div
                className="flex items-center gap-4 rounded-2xl border p-4"
                style={{
                  borderColor: `${teamDraft.color || '#22c55e'}40`,
                  backgroundColor: `${teamDraft.color || '#22c55e'}10`,
                }}
              >
                <span className="text-4xl">{teamDraft.flag || '🏳️'}</span>

                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {teamDraft.name || 'Sem nome'}
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    {teamDraft.owner || 'Sem competidor'}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Nome da seleção
                </span>

                <input
                  autoFocus
                  type="text"
                  value={teamDraft.name}
                  onChange={(event) =>
                    setTeamDraft({
                      ...teamDraft,
                      name: event.target.value,
                    })
                  }
                  placeholder="Ex.: Brasil"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Bandeira (emoji)
                </span>

                <input
                  type="text"
                  value={teamDraft.flag}
                  onChange={(event) =>
                    setTeamDraft({
                      ...teamDraft,
                      flag: event.target.value,
                    })
                  }
                  placeholder="Ex.: 🇧🇷"
                  maxLength={4}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
                />

                <span className="mt-2 block text-xs text-zinc-500">
                  Dica: use um emoji de bandeira (⌘ + Ctrl + Espaço no Mac
                  ou Win + . no Windows).
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Competidor responsável
                </span>

                <input
                  type="text"
                  value={teamDraft.owner}
                  onChange={(event) =>
                    setTeamDraft({
                      ...teamDraft,
                      owner: event.target.value,
                    })
                  }
                  placeholder="Ex.: Mateus ou Lucas"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Cor de destaque
                </span>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(teamDraft.color)
                        ? teamDraft.color
                        : '#22c55e'
                    }
                    onChange={(event) =>
                      setTeamDraft({
                        ...teamDraft,
                        color: event.target.value,
                      })
                    }
                    className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-black/30 p-1"
                  />

                  <input
                    type="text"
                    value={teamDraft.color}
                    onChange={(event) =>
                      setTeamDraft({
                        ...teamDraft,
                        color: event.target.value,
                      })
                    }
                    placeholder="#22c55e"
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-7">
              <button
                onClick={closeTeamEditor}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Cancelar
              </button>

              <button
                onClick={saveTeamEdit}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
              >
                <Check size={17} />
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar confronto ── */}
      {editingMatchId && matchTeamsDraft && editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111113]/95 p-5 backdrop-blur sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                    MINI-COPA · {editingMatch.id}
                  </p>

                  <h3 className="mt-2 text-xl font-bold sm:text-2xl">
                    Editar confronto
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Escolha manualmente as seleções que vão disputar esta
                    partida. Deixe em branco para "A definir".
                  </p>
                </div>

                <button
                  onClick={closeMatchEditor}
                  aria-label="Fechar formulário"
                  className="rounded-xl border border-white/10 p-2.5 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="min-w-0 text-center">
                  <span className="text-3xl sm:text-4xl">
                    {matchEditorHomeTeam?.flag ?? '🏳️'}
                  </span>

                  <p className="mt-2 truncate text-sm font-semibold">
                    {matchEditorHomeTeam?.name ?? 'A definir'}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {matchEditorHomeTeam?.owner ?? '—'}
                  </p>
                </div>

                <span className="text-zinc-600">×</span>

                <div className="min-w-0 text-center">
                  <span className="text-3xl sm:text-4xl">
                    {matchEditorAwayTeam?.flag ?? '🏳️'}
                  </span>

                  <p className="mt-2 truncate text-sm font-semibold">
                    {matchEditorAwayTeam?.name ?? 'A definir'}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {matchEditorAwayTeam?.owner ?? '—'}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Seleção mandante
                </span>

                <select
                  autoFocus
                  value={matchTeamsDraft.homeTeamId}
                  onChange={(event) =>
                    setMatchTeamsDraft({
                      ...matchTeamsDraft,
                      homeTeamId: event.target.value,
                    })
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                >
                  <option value="">A definir</option>

                  {tournament.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.flag} {team.name} · {team.owner}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-zinc-400">
                  Seleção visitante
                </span>

                <select
                  value={matchTeamsDraft.awayTeamId}
                  onChange={(event) =>
                    setMatchTeamsDraft({
                      ...matchTeamsDraft,
                      awayTeamId: event.target.value,
                    })
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                >
                  <option value="">A definir</option>

                  {tournament.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.flag} {team.name} · {team.owner}
                    </option>
                  ))}
                </select>
              </label>

              <p className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-xs leading-5 text-zinc-500">
                Dica: você pode trocar as seleções manualmente para
                corrigir classificações ou simular confrontos. Se o
                vencedor anterior não estiver mais na partida, a
                classificação será limpa.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-7">
              <button
                onClick={closeMatchEditor}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Cancelar
              </button>

              <button
                onClick={saveMatchEdit}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
              >
                <Check size={17} />
                Salvar confronto
              </button>
            </div>
          </div>
        </div>
      )}

      {registration && registrationMatch?.home && registrationMatch.away && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111113]/95 p-5 backdrop-blur sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-amber-400">
                    MINI-COPA · {registrationMatch.id}
                  </p>

                  <h3 className="mt-2 text-xl font-bold sm:text-2xl">
                    Registrar resultado
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Cadastre os jogadores e as notas desta partida.
                  </p>
                </div>

                <button
                  onClick={cancelRegistration}
                  aria-label="Fechar formulário"
                  className="rounded-xl border border-white/10 p-2.5 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-4 sm:p-5">
                <div className="min-w-0 text-center">
                  <span className="text-3xl sm:text-4xl">
                    {registrationMatch.home.flag}
                  </span>

                  <p className="mt-2 truncate text-sm font-semibold">
                    {registrationMatch.home.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {registrationMatch.home.owner}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-[#09090b] px-4 py-3 sm:px-5">
                  <span className="text-2xl font-bold text-amber-400">
                    {registration.homeScore}
                  </span>

                  <span className="text-zinc-600">:</span>

                  <span className="text-2xl font-bold text-amber-400">
                    {registration.awayScore}
                  </span>
                </div>

                <div className="min-w-0 text-center">
                  <span className="text-3xl sm:text-4xl">
                    {registrationMatch.away.flag}
                  </span>

                  <p className="mt-2 truncate text-sm font-semibold">
                    {registrationMatch.away.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {registrationMatch.away.owner}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-7 p-5 sm:p-7">
              {registration.homeScore === registration.awayScore && (
                <section className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
                  <div className="flex items-center gap-3">
                    <Trophy className="text-amber-400" size={22} />

                    <div>
                      <h4 className="font-semibold">
                        Vencedor nos pênaltis
                      </h4>

                      <p className="mt-1 text-xs text-zinc-500">
                        A partida terminou empatada. Escolha quem avançará.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[registrationMatch.home, registrationMatch.away].map(
                      (team) => {
                        const selected = penaltyWinnerId === team.id

                        return (
                          <button
                            key={team.id}
                            onClick={() => setPenaltyWinnerId(team.id)}
                            className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                              selected
                                ? 'border-amber-400/50 bg-amber-400/10'
                                : 'border-white/10 bg-black/20 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{team.flag}</span>

                              <div>
                                <p className="text-sm font-semibold">
                                  {team.name}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {team.owner}
                                </p>
                              </div>
                            </div>

                            {selected && (
                              <Check
                                size={18}
                                className="text-amber-400"
                              />
                            )}
                          </button>
                        )
                      },
                    )}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5">
                    <UserRound className="text-amber-400" size={21} />
                  </div>

                  <div>
                    <h4 className="font-semibold">
                      Cadastro de jogador
                    </h4>

                    <p className="mt-1 text-xs text-zinc-500">
                      Selecione o competidor e a seleção. Digite apenas o
                      nome do jogador manualmente.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Nome do jogador
                    </span>

                    <input
                      autoFocus
                      type="text"
                      value={draftPlayerName}
                      onChange={(event) =>
                        setDraftPlayerName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addPlayerDraft()
                        }
                      }}
                      placeholder="Ex.: Cristiano Ronaldo"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Competidor
                    </span>

                    <select
                      value={draftCompetitor}
                      onChange={(event) =>
                        setDraftCompetitor(event.target.value)
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                    >
                      <option value="Mateus">Mateus</option>
                      <option value="Lucas">Lucas</option>
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Seleção representada nesta partida
                    </span>

                    <select
                      value={draftTeamId}
                      onChange={(event) =>
                        setDraftTeamId(event.target.value)
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                    >
                      <option value={registrationMatch.home.id}>
                        {registrationMatch.home.flag}{' '}
                        {registrationMatch.home.name}
                      </option>

                      <option value={registrationMatch.away.id}>
                        {registrationMatch.away.flag}{' '}
                        {registrationMatch.away.name}
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Gols marcados
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftGoals}
                      onChange={(event) =>
                        setDraftGoals(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                      <Star size={13} className="text-amber-400" />
                      Nota da partida (0–10)
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={draftRating}
                      onChange={(event) =>
                        setDraftRating(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                    />
                  </label>
                </div>

                <button
                  onClick={addPlayerDraft}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-400/15"
                >
                  {editingDraftId ? (
                    <Check size={17} />
                  ) : (
                    <Plus size={17} />
                  )}

                  {editingDraftId
                    ? 'Atualizar jogador'
                    : 'Adicionar jogador'}
                </button>

                {editingDraftId && (
                  <button
                    onClick={() => resetPlayerForm(draftTeamId)}
                    className="mt-2 w-full rounded-xl px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
                  >
                    Cancelar edição
                  </button>
                )}
              </section>

              <section>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">
                      Jogadores cadastrados
                    </h4>

                    <p className="mt-1 text-xs text-zinc-500">
                      {playerDrafts.length} jogador(es) registrado(s)
                    </p>
                  </div>
                </div>

                {playerDrafts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                    <Users
                      className="mx-auto mb-3 text-zinc-600"
                      size={30}
                    />

                    <p className="text-sm font-medium text-zinc-300">
                      Nenhum jogador cadastrado
                    </p>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Adicione pelo menos um jogador para cada seleção que
                      marcou gol. Seleções com 0 gols podem ficar sem
                      estatísticas individuais.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[registrationMatch.home, registrationMatch.away].map(
                      (team) => {
                        const teamPlayers = playerDrafts.filter(
                          (player) => player.teamId === team.id,
                        )

                        const teamGoals = teamPlayers.reduce(
                          (total, player) =>
                            total + Number(player.goals || 0),
                          0,
                        )

                        const expectedGoals =
                          team.id === registrationMatch.home?.id
                            ? registration.homeScore
                            : registration.awayScore

                        const goalsMatch = teamGoals === expectedGoals

                        return (
                          <div
                            key={team.id}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{team.flag}</span>

                                <div>
                                  <p className="text-sm font-semibold">
                                    {team.name}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {teamPlayers.length} jogador(es)
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                                  goalsMatch
                                    ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
                                    : 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
                                }`}
                              >
                                {teamGoals}/{expectedGoals} gols
                              </span>
                            </div>

                            {teamPlayers.length === 0 ? (
                              <p className="p-4 text-xs text-zinc-500">
                                {expectedGoals === 0
                                  ? 'Nenhum jogador cadastrado (esta seleção não marcou gols).'
                                  : 'Nenhum jogador cadastrado para esta seleção.'}
                              </p>
                            ) : (
                              <div className="divide-y divide-white/[0.05]">
                                {teamPlayers.map((player) => (
                                  <div
                                    key={player.id}
                                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-zinc-100">
                                        {player.playerName}
                                      </p>

                                      <p className="mt-1 text-xs text-zinc-500">
                                        {player.competitor} · {team.name}
                                      </p>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-zinc-400">
                                          {player.goals} gols
                                        </span>

                                        <span className="flex items-center gap-1 rounded-md bg-amber-400/[0.07] px-2 py-1 text-xs text-amber-300">
                                          <Star size={11} />
                                          {Number(player.rating).toFixed(1)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => editPlayerDraft(player)}
                                        aria-label={`Editar ${player.playerName}`}
                                        className="rounded-lg border border-white/10 p-2.5 text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-300"
                                      >
                                        <Pencil size={15} />
                                      </button>

                                      <button
                                        onClick={() =>
                                          removePlayerDraft(player.id)
                                        }
                                        aria-label={`Excluir ${player.playerName}`}
                                        className="rounded-lg border border-white/10 p-2.5 text-zinc-400 transition hover:border-red-400/30 hover:text-red-400"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>
                )}
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={cancelRegistration}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveRegistration}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
                >
                  <Check size={17} />
                  Salvar resultado e estatísticas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App