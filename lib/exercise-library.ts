export type ExerciseEntry = {
  name: string
  aliases: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
  formCues: string[]
  commonMistakes: string[]
  variations: string[]
  progressionOptions: string[]
}

const EXERCISE_LIBRARY: ExerciseEntry[] = [
  {
    name: 'Squat',
    aliases: ['squat', 'back squat', 'barbell squat', 'high bar squat', 'low bar squat'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'upper back'],
    formCues: [
      'Brace before the descent and keep the torso stacked.',
      'Drive knees in line with toes; control depth.',
      'Stay balanced over mid-foot and push the floor away.',
    ],
    commonMistakes: [
      'Knees collapsing inward or drifting too far forward.',
      'Losing brace and rounding the lower back.',
      'Rising hips faster than the chest.',
    ],
    variations: ['Front squat', 'Pause squat', 'Tempo squat', 'Box squat'],
    progressionOptions: ['Add 2.5-5 lb weekly', 'Add a rep at the same load', 'Use pauses to build control'],
  },
  {
    name: 'Bench Press',
    aliases: ['bench', 'bench press', 'flat bench', 'barbell bench', 'flat bench press'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    formCues: [
      'Set the shoulder blades down and back on the bench.',
      'Keep wrists stacked over elbows with forearms vertical.',
      'Touch the bar to the lower chest and drive up in a slight arc.',
    ],
    commonMistakes: [
      'Elbows flaring straight out.',
      'Losing upper back tightness off the bench.',
      'Bouncing the bar off the chest.',
    ],
    variations: ['Pause bench', 'Close-grip bench', 'Incline bench'],
    progressionOptions: ['Add 2.5 lb per week', 'Add a rep at a fixed load', 'Use pause reps to build control'],
  },
  {
    name: 'Deadlift',
    aliases: ['deadlift', 'conventional deadlift', 'barbell deadlift'],
    primaryMuscles: ['glutes', 'hamstrings'],
    secondaryMuscles: ['back', 'core', 'forearms'],
    formCues: [
      'Brace hard and pull slack out of the bar before lifting.',
      'Keep the bar close and drag it up the legs.',
      'Hips and chest rise together off the floor.',
    ],
    commonMistakes: [
      'Bar drifting away from the shins.',
      'Rounding the lower back at the start.',
      'Yanking the bar without tension.',
    ],
    variations: ['Romanian deadlift', 'Deficit deadlift', 'Rack pull'],
    progressionOptions: ['Add 5 lb weekly', 'Add a rep at a fixed load', 'Use tempo eccentrics'],
  },
  {
    name: 'Overhead Press',
    aliases: ['overhead press', 'shoulder press', 'standing press', 'military press'],
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'upper back', 'core'],
    formCues: [
      'Squeeze glutes and keep ribs down to avoid over-arching.',
      'Press the bar in a straight line and move the head through at the top.',
      'Keep wrists stacked over elbows.',
    ],
    commonMistakes: [
      'Over-arching the lower back.',
      'Pressing the bar forward instead of up.',
      'Losing tension at lockout.',
    ],
    variations: ['Seated dumbbell press', 'Push press', 'Arnold press'],
    progressionOptions: ['Add 2.5 lb weekly', 'Add a rep at a fixed load', 'Use paused reps at forehead level'],
  },
  {
    name: 'Barbell Row',
    aliases: ['row', 'barbell row', 'bent over row', 'bent-over row'],
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'rear delts', 'core'],
    formCues: [
      'Hinge at the hips and keep a stable torso angle.',
      'Pull the bar toward the lower ribs and squeeze the back.',
      'Keep the neck neutral and avoid excessive momentum.',
    ],
    commonMistakes: [
      'Jerking the torso to move the bar.',
      'Letting the back round under load.',
      'Shrugging instead of rowing.',
    ],
    variations: ['Pendlay row', 'Chest-supported row', 'Dumbbell row'],
    progressionOptions: ['Add 5 lb weekly', 'Add a rep at a fixed load', 'Pause at the top'],
  },
  {
    name: 'Pull-Up',
    aliases: ['pull-up', 'pull up', 'chin-up', 'chin up'],
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms', 'core'],
    formCues: [
      'Start from a dead hang and initiate by pulling the shoulder blades down.',
      'Keep the ribcage down and drive elbows toward the ribs.',
      'Clear the chin over the bar without craning the neck.',
    ],
    commonMistakes: [
      'Kipping or swinging excessively.',
      'Shrugging up instead of pulling down and back.',
      'Cutting range of motion short.',
    ],
    variations: ['Neutral-grip pull-up', 'Weighted pull-up', 'Assisted pull-up'],
    progressionOptions: ['Add a rep each session', 'Use assistance bands', 'Add small plate weight'],
  },
]

const normalizeText = (value: string) => value.trim().toLowerCase()
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const findExerciseEntry = (question: string): ExerciseEntry | null => {
  if (!question) return null
  const normalized = normalizeText(question)
  if (!normalized) return null
  let best: { entry: ExerciseEntry; score: number } | null = null
  for (const entry of EXERCISE_LIBRARY) {
    const allAliases = [entry.name, ...entry.aliases]
    for (const alias of allAliases) {
      const normalizedAlias = normalizeText(alias)
      const pattern = new RegExp(`\\b${escapeRegex(normalizedAlias)}\\b`, 'i')
      if (!pattern.test(normalized)) continue
      const score = normalizedAlias.length
      if (!best || score > best.score) {
        best = { entry, score }
      }
    }
  }
  return best ? best.entry : null
}

export const buildExerciseGuidanceMessage = (entry: ExerciseEntry) => {
  const lines = [
    `${entry.name} form cues (general guidance):`,
    ...entry.formCues.map(cue => `- ${cue}`),
    '',
    'Common mistakes:',
    ...entry.commonMistakes.map(mistake => `- ${mistake}`),
    '',
    'Variations:',
    ...entry.variations.map(variation => `- ${variation}`),
    '',
    'Progression options:',
    ...entry.progressionOptions.map(option => `- ${option}`),
    '',
    'Note: I cannot assess form quality from logs, so this is general guidance.',
  ]
  return lines.join('\n')
}
