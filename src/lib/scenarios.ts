/**
 * The three workplace scenarios in part 2 of the Meaning Survey.
 * Answer keys stay A–D even when the quiz shuffles the cards on screen.
 * The dimension notes are for the report later; the quiz only shows the prompt and the four choices.
 */

import type { MeaningKey } from './types';

export interface ScenarioOption {
  key: MeaningKey;
  text: string;
}

export interface Scenario {
  id: string;
  prompt: string;
  /** What the report will compare across teammates. */
  dimension: string;
  options: [ScenarioOption, ScenarioOption, ScenarioOption, ScenarioOption];
}

export const SCENARIOS: [Scenario, Scenario, Scenario] = [
  {
    id: 'decision-speed',
    dimension: 'Decision speed',
    prompt: 'The team disagrees about the direction of the project an hour before a check-in. You…',
    options: [
      { key: 'A', text: 'Push to decide quickly' },
      { key: 'B', text: 'Suggest a quick vote' },
      { key: 'C', text: 'Ask everyone to explain their reasoning first' },
      { key: 'D', text: 'Go with whoever owns that part' },
    ],
  },
  {
    id: 'conflict-approach',
    dimension: 'Conflict approach',
    prompt: "A teammate's part is late and the deadline is close. You…",
    options: [
      { key: 'A', text: 'Message them directly right away' },
      { key: 'B', text: 'Raise it in the group chat' },
      { key: 'C', text: 'Quietly do it yourself' },
      { key: 'D', text: 'Wait. They probably have a reason.' },
    ],
  },
  {
    id: 'building-vs-challenging',
    dimension: 'Building vs. challenging',
    prompt: 'In a brainstorm, someone suggests an idea you think is weak. You…',
    options: [
      { key: 'A', text: 'Say so and explain why' },
      { key: 'B', text: 'Ask a question to explore it' },
      { key: 'C', text: 'Build on the good part of it' },
      { key: 'D', text: 'Say nothing and propose your own idea' },
    ],
  },
];

export const SCENARIO_IDS: [string, string, string] = [
  SCENARIOS[0].id,
  SCENARIOS[1].id,
  SCENARIOS[2].id,
];
