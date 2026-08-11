import type { Portfolio } from '@/lib/types'

export function uid(): string {
  return crypto.randomUUID()
}

/**
 * The sample year from the design prototype. It backs the "Reset to sample
 * data" action and gives a brand-new account something to look at.
 */
export function sampledPortfolio(studentId = uid()): Portfolio {
  const ela = uid()
  const math = uid()
  const activity = (
    subject_key: string,
    date: string,
    title: string,
    notes: string,
    hours: string,
  ) => ({ id: uid(), subject_key, date, title, notes, hours })

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
        'Sofía completed her first-grade year at home with steady, visible growth. She began the year reading three-letter words with support and finished reading early chapter books aloud without help. Mathematics moved from counting objects to addition and subtraction within twenty, with measurement introduced in the spring. Both subjects are documented activity by activity in the log below.',
    },
    subjects: [
      { id: ela, key: 'ela', label: 'Language Arts', sort: 1 },
      { id: math, key: 'math', label: 'Mathematics', sort: 2 },
    ],
    activities: [
      activity(
        'ela',
        '2025-09-08',
        'Short vowel word families',
        'Explode the Code pp. 12–20; built -at, -op, -in words with letter tiles.',
        '1.5',
      ),
      activity(
        'ela',
        '2025-11-14',
        'Sentence writing and capitals',
        'Wrote four sentences about the beach trip; edited for capitals and periods.',
        '1',
      ),
      activity(
        'ela',
        '2026-02-03',
        'Reading aloud, early chapter books',
        'Read two chapters of Frog and Toad unassisted; retold the plot in her own words.',
        '1.25',
      ),
      activity(
        'ela',
        '2026-04-21',
        'Poetry recitation',
        'Memorized and recited "The Swing" for the family.',
        '0.75',
      ),
      activity(
        'math',
        '2025-09-16',
        'Counting and place value to 100',
        'Hundred chart, skip counting by 2s, 5s and 10s.',
        '1',
      ),
      activity(
        'math',
        '2025-12-02',
        'Addition within 20',
        'Number bonds with counters; timed practice sheet, 18/20 correct.',
        '1',
      ),
      activity(
        'math',
        '2026-03-10',
        'Measurement with non-standard units',
        'Measured the kitchen in shoe-lengths and recorded results in a table.',
        '1.5',
      ),
    ],
    curriculums: [
      {
        id: uid(),
        title: 'Explode the Code, Books 1–2',
        publisher: 'Educators Publishing Service',
        subject: 'ela',
        usage: 'Core phonics — three lessons a week, September through March',
        sort: 1,
      },
      {
        id: uid(),
        title: 'All About Reading, Level 1',
        publisher: 'All About Learning Press',
        subject: 'ela',
        usage: 'Reading fluency and decoding practice, full year',
        sort: 2,
      },
      {
        id: uid(),
        title: 'Handwriting Without Tears — First Grade',
        publisher: 'Learning Without Tears',
        subject: 'ela',
        usage: 'Daily handwriting, ten minutes',
        sort: 3,
      },
      {
        id: uid(),
        title: 'Math-U-See Alpha',
        publisher: 'Demme Learning',
        subject: 'math',
        usage: 'Core mathematics with manipulatives, full year',
        sort: 4,
      },
      {
        id: uid(),
        title: 'Kitchen Table Math, Book 1',
        publisher: 'Chris Wright',
        subject: 'math',
        usage: 'Supplement for measurement and word problems, spring term',
        sort: 5,
      },
      {
        id: uid(),
        title: 'Ambleside Online Year 1 book list',
        publisher: 'Ambleside Online (free curriculum)',
        subject: 'other',
        usage: 'Read-aloud and narration spine for the reading list below',
        sort: 6,
      },
    ],
    books: [
      {
        id: uid(),
        title: 'Frog and Toad Together',
        author: 'Arnold Lobel',
        finished_on: '2025-10-02',
        how_read: 'Read independently',
      },
      {
        id: uid(),
        title: 'The Story of Ferdinand',
        author: 'Munro Leaf',
        finished_on: '2025-11-19',
        how_read: 'Read aloud together',
      },
      {
        id: uid(),
        title: 'Blueberries for Sal',
        author: 'Robert McCloskey',
        finished_on: '2025-12-15',
        how_read: 'Read aloud together',
      },
      {
        id: uid(),
        title: 'Henry and Mudge: The First Book',
        author: 'Cynthia Rylant',
        finished_on: '2026-01-28',
        how_read: 'Read independently',
      },
      {
        id: uid(),
        title: 'A Tree Is Nice',
        author: 'Janice May Udry',
        finished_on: '2026-03-04',
        how_read: 'Read aloud together',
      },
      {
        id: uid(),
        title: 'Owl Moon',
        author: 'Jane Yolen',
        finished_on: '2026-05-12',
        how_read: 'Read independently',
      },
    ],
    workSamples: [
      {
        id: uid(),
        title: 'Handwriting page — capital letters',
        subject: 'ela',
        date: '2025-09-25',
        storage_path: null,
        mime: null,
        url: null,
      },
      {
        id: uid(),
        title: 'Addition within 20, practice sheet',
        subject: 'math',
        date: '2025-12-02',
        storage_path: null,
        mime: null,
        url: null,
      },
      {
        id: uid(),
        title: 'Narrated drawing — Owl Moon retelling',
        subject: 'ela',
        date: '2026-05-14',
        storage_path: null,
        mime: null,
        url: null,
      },
      {
        id: uid(),
        title: 'Measurement table — kitchen in shoe-lengths',
        subject: 'math',
        date: '2026-03-10',
        storage_path: null,
        mime: null,
        url: null,
      },
    ],
    supportDocuments: [
      {
        id: uid(),
        title: 'Individualized Education Program (IEP) 2025–2026',
        kind: 'IEP',
        document_date: '2025-08-22',
        note: 'Annual IEP from Miami-Dade County Public Schools; goals in reading fluency and fine-motor writing carried into the home program.',
        storage_path: null,
        file_name: 'IEP-2025-2026.pdf',
        mime: 'application/pdf',
        size_bytes: null,
        url: null,
      },
    ],
  }
}
