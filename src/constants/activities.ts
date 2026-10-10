import type { ActivityConfig, SaverKey } from '../types';

export const DEFAULT_ACTIVITY_CONFIGS: readonly ActivityConfig[] = [
  {
    id: 'SILENCE',
    letter: 'S',
    name: 'Silence',
    description: 'Begin with stillness and arrive fully in the morning.',
    guidance: 'Sit comfortably, soften your gaze, and follow five slow breaths.',
    durationSeconds: 5 * 60,
    enabled: true,
    order: 0,
    accentColor: '#6F958A',
  },
  {
    id: 'AFFIRMATIONS',
    letter: 'A',
    name: 'Affirmations',
    description: 'Rehearse the beliefs and intentions that guide your day.',
    guidance: 'Read each statement slowly and connect it to one action you can take.',
    durationSeconds: 5 * 60,
    enabled: true,
    order: 1,
    accentColor: '#D59463',
  },
  {
    id: 'VISUALIZATION',
    letter: 'V',
    name: 'Visualization',
    description: 'Picture a meaningful outcome and the process of reaching it.',
    guidance: 'Imagine today going well, including the effort and calm choices it takes.',
    durationSeconds: 5 * 60,
    enabled: true,
    order: 2,
    accentColor: '#8E7899',
  },
  {
    id: 'EXERCISE',
    letter: 'E',
    name: 'Exercise',
    description: 'Wake your body with movement that fits this morning.',
    guidance: 'Choose gentle mobility, yoga, a walk, or a short energizing circuit.',
    durationSeconds: 10 * 60,
    enabled: true,
    order: 3,
    accentColor: '#C9795D',
  },
  {
    id: 'READING',
    letter: 'R',
    name: 'Reading',
    description: 'Learn something useful before the day becomes noisy.',
    guidance: 'Read with one question in mind and capture a single useful idea.',
    durationSeconds: 10 * 60,
    enabled: true,
    order: 4,
    accentColor: '#557F70',
  },
  {
    id: 'SCRIBING',
    letter: 'S',
    name: 'Scribing',
    description: 'Write to notice, appreciate, and choose what matters.',
    guidance: 'Note one gratitude, one honest reflection, and one priority for today.',
    durationSeconds: 5 * 60,
    enabled: true,
    order: 5,
    accentColor: '#A9776E',
  },
] as const;

export const ACTIVITY_NAMES: Readonly<Record<SaverKey, string>> = Object.freeze(
  Object.fromEntries(DEFAULT_ACTIVITY_CONFIGS.map((item) => [item.id, item.name])) as Record<
    SaverKey,
    string
  >,
);

export function createDefaultActivityConfigs(): ActivityConfig[] {
  return DEFAULT_ACTIVITY_CONFIGS.map((config) => ({ ...config }));
}
