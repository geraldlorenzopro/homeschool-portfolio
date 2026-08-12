import type { Area, Portfolio } from '@/lib/types'

export function uid(): string {
  return crypto.randomUUID()
}

/** The ten areas an IEP usually covers. Mirrors the trigger in migration 0002. */
export const DEFAULT_AREAS: { key: string; label: string }[] = [
  // The two the portfolio has always had come first and keep their names.
  { key: 'ela', label: 'Language Arts' },
  { key: 'math', label: 'Mathematics' },
  // The rest are the domains an IEP usually covers, there when they are needed.
  { key: 'speech', label: 'Speech & Language' },
  { key: 'fine_motor', label: 'Fine Motor' },
  { key: 'gross_motor', label: 'Gross Motor' },
  { key: 'social', label: 'Social-Emotional' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'daily_living', label: 'Daily Living / Self-Help' },
  { key: 'attention', label: 'Attention & Study Skills' },
  { key: 'sensory', label: 'Sensory & Regulation' },
]

export function defaultAreas(): Area[] {
  return DEFAULT_AREAS.map((a, index) => ({
    id: uid(),
    key: a.key,
    label: a.label,
    sort: index + 1,
    is_custom: false,
  }))
}

/**
 * The sample year. It backs "Reset to sample data" and gives a new account
 * something to look at — a child with an IEP, goals in four areas, and a
 * handful of sessions recorded against them.
 */
export function sampledPortfolio(studentId = uid()): Portfolio {
  const areas = defaultAreas()
  const areaId = (key: string) => areas.find((a) => a.key === key)!.id

  const goals = [
    {
      id: uid(),
      area_id: areaId('ela'),
      text: 'Given a decodable text, Sofía will read CVC words with 80% accuracy across three consecutive sessions.',
      status: 'met' as const,
      source: 'iep' as const,
      sort: 1,
    },
    {
      id: uid(),
      area_id: areaId('ela'),
      text: 'Sofía will retell the beginning, middle and end of a story read aloud, with no more than one prompt.',
      status: 'in_progress' as const,
      source: 'iep' as const,
      sort: 2,
    },
    {
      id: uid(),
      area_id: areaId('math'),
      text: 'Sofía will solve addition facts within 20 using counters, with 80% accuracy.',
      status: 'in_progress' as const,
      source: 'iep' as const,
      sort: 3,
    },
    {
      id: uid(),
      area_id: areaId('fine_motor'),
      text: 'Sofía will form uppercase letters on a lined page with correct pencil grip for five minutes.',
      status: 'in_progress' as const,
      source: 'iep' as const,
      sort: 4,
    },
    {
      id: uid(),
      area_id: areaId('social'),
      text: 'Sofía will take turns in a two-player game for ten minutes without adult redirection.',
      status: 'not_started' as const,
      source: 'parent' as const,
      sort: 5,
    },
  ]

  const entry = (
    goalIndex: number,
    title: string,
    method: string,
    outcome: string,
    outcome_level: 'full_support' | 'partial_support' | 'independent',
    date: string,
    sort: number,
  ) => ({
    id: uid(),
    area_id: goals[goalIndex].area_id,
    goal_id: goals[goalIndex].id,
    title,
    method,
    outcome,
    outcome_level,
    date,
    hours: '',
    sort,
  })

  return {
    student: {
      id: studentId,
      name: 'Sofía Ramírez',
      dob: '2019-04-12',
      grade: 'First grade (K-2)',
      school_year: '2025–2026',
      parent_name: 'Marta Ramírez',
      county: 'Miami-Dade',
      evaluator: 'Karen Whitfield, FL cert. #718402',
      evaluation_date: '2026-06-05',
      statement:
        'Sofía completed her first-grade year at home working from the goals in her IEP. She began the year decoding CVC words with prompting and finished reading them independently. Mathematics and fine motor both moved from full support to partial support. Each goal below records the method used and how she responded.',
      diagnosis: 'Specific learning disability in reading (dyslexia)',
      diagnosis_date: '2025-05-19',
      diagnosed_by: 'Miami-Dade County Public Schools, district evaluation team',
      no_formal_diagnosis: false,
      strengths:
        'Strong listening comprehension and vocabulary. Persists with a task when it is broken into short steps. Loves being read to.',
      needs:
        'Decoding and phonological awareness. Fine-motor endurance for writing. Needs movement breaks roughly every fifteen minutes.',
      learns_best:
        'Multisensory work — letter tiles, sand tray, saying the sound while writing it. One instruction at a time, modelled first.',
      include_profile: true,
      show_dates: true,
      show_hours: false,
      show_activity_log: false,
    },
    areas,
    goals,
    entries: [
      entry(
        0,
        'Short vowel word families',
        'Letter tiles for -at, -op and -in; built each word, said the sounds, then read the list back.',
        'Read 18 of 20 words with no prompting. Self-corrected twice without being asked.',
        'independent',
        '2025-09-08',
        1,
      ),
      entry(
        0,
        'Decodable text, first read',
        'Read a six-page decodable book aloud, one sentence at a time, finger tracking.',
        'Needed a prompt on three words. Accuracy above the goal line for a third consecutive session — goal met.',
        'independent',
        '2026-02-03',
        2,
      ),
      entry(
        1,
        'Retelling — Owl Moon',
        'Read aloud together, then retold with a three-picture sequencing strip as support.',
        'Gave beginning and end unprompted; needed one prompt for the middle.',
        'partial_support',
        '2026-05-12',
        3,
      ),
      entry(
        2,
        'Addition within 20',
        'Number bonds with counters, then a written practice sheet.',
        '18 of 20 correct with counters available. Still counts on fingers when the sheet is removed.',
        'partial_support',
        '2025-12-02',
        4,
      ),
      entry(
        3,
        'Uppercase letter formation',
        'Handwriting Without Tears slate, then a lined page. Five-minute timer.',
        'Held the grip for the full five minutes for the first time. Letters E, F and L still reversed.',
        'partial_support',
        '2026-03-10',
        5,
      ),
    ],
    curriculums: [
      {
        id: uid(),
        title: 'Explode the Code, Books 1–2',
        publisher: 'Educators Publishing Service',
        area_id: areaId('ela'),
        usage: 'Core phonics — three lessons a week, September through March',
        sort: 1,
      },
      {
        id: uid(),
        title: 'All About Reading, Level 1',
        publisher: 'All About Learning Press',
        area_id: areaId('ela'),
        usage: 'Reading fluency and decoding practice, full year',
        sort: 2,
      },
      {
        id: uid(),
        title: 'Handwriting Without Tears — First Grade',
        publisher: 'Learning Without Tears',
        area_id: areaId('fine_motor'),
        usage: 'Daily handwriting, ten minutes',
        sort: 3,
      },
      {
        id: uid(),
        title: 'Math-U-See Alpha',
        publisher: 'Demme Learning',
        area_id: areaId('math'),
        usage: 'Core mathematics with manipulatives, full year',
        sort: 4,
      },
    ],
    books: [
      {
        id: uid(),
        title: 'Frog and Toad Together',
        author: 'Arnold Lobel',
        finished_on: '2025-10-02',
        how_read: 'Read independently',
        sort: 1,
      },
      {
        id: uid(),
        title: 'The Story of Ferdinand',
        author: 'Munro Leaf',
        finished_on: '2025-11-19',
        how_read: 'Read aloud together',
        sort: 2,
      },
      {
        id: uid(),
        title: 'Blueberries for Sal',
        author: 'Robert McCloskey',
        finished_on: '2025-12-15',
        how_read: 'Read aloud together',
        sort: 3,
      },
      {
        id: uid(),
        title: 'Owl Moon',
        author: 'Jane Yolen',
        finished_on: '2026-05-12',
        how_read: 'Read independently',
        sort: 4,
      },
    ],
    workSamples: [
      {
        id: uid(),
        title: 'Word family sort — -at, -op, -in',
        area_id: areaId('ela'),
        goal_id: goals[0].id,
        entry_id: null,
        date: '2025-09-25',
        storage_path: null,
        mime: null,
        sort: 1,
        url: null,
      },
      {
        id: uid(),
        title: 'Addition within 20, practice sheet',
        area_id: areaId('math'),
        goal_id: goals[2].id,
        entry_id: null,
        date: '2025-12-02',
        storage_path: null,
        mime: null,
        sort: 2,
        url: null,
      },
      {
        id: uid(),
        title: 'Handwriting page — capital letters',
        area_id: areaId('fine_motor'),
        goal_id: goals[3].id,
        entry_id: null,
        date: '2026-03-10',
        storage_path: null,
        mime: null,
        sort: 3,
        url: null,
      },
    ],
    supportDocuments: [
      {
        id: uid(),
        title: 'Individualized Education Program (IEP) 2025–2026',
        kind: 'IEP',
        document_date: '2025-08-22',
        note: 'Annual IEP from Miami-Dade County Public Schools. The goals below were transcribed from it.',
        storage_path: null,
        file_name: 'IEP-2025-2026.pdf',
        mime: 'application/pdf',
        size_bytes: null,
        url: null,
      },
    ],
    evaluations: [
      {
        id: uid(),
        title: 'District psychoeducational evaluation',
        kind: 'Psychoeducational',
        evaluation_date: '2025-05-19',
        performed_by: 'Miami-Dade County Public Schools',
        summary:
          'Average verbal comprehension with weakness in phonological processing. Eligible for services under specific learning disability. Recommends multisensory structured literacy and extended time.',
        storage_path: null,
        file_name: null,
        mime: null,
        size_bytes: null,
        sort: 1,
        url: null,
      },
    ],
    attachments: [],
  }
}
