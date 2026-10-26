import { Card } from '../components/Card';
import { PageScaffold } from '../components/PageScaffold';

interface ScienceEntry {
  feature: string;
  measures: string;
  concept: string;
  why: string;
  does: string;
}

/**
 * Course evidence behind each report section.
 * Citations are the Fall Leading Technology Teams materials: the Breakout Learning
 * Team Charter Simulation pre-work, and Edmondson, Ager, Harburg, and Bartlett,
 * "Teaming at Disney Animation" (HBS 9-615-023).
 */
const entries: ScienceEntry[] = [
  {
    feature: 'Shared meaning',
    measures: 'Whether teammates hold the same reading of a charter word.',
    concept: 'Team charter alignment',
    why: 'The Team Charter Simulation pre-work says a charter aligns the team only when members share the same expectations about mission, norms, and goals. A line like “open communication” does not do that work until the team says what it means.',
    does: 'The Meaning Survey makes hidden differences visible, so the team can agree on one meaning explicitly.',
  },
  {
    feature: 'Charter rewrite',
    measures: 'How concrete a vague charter term can become.',
    concept: 'Norms you can observe',
    why: 'The same pre-work asks the team to write norms someone could check: reply within 24 hours, turn work in a day early, and decide in advance how conflict will be handled. Vague words do not prevent the conflict.',
    does: 'For each term the team does not share, the report turns the word into an observable behavior the team can commit to.',
  },
  {
    feature: 'Participation balance',
    measures: 'How evenly speaking time is shared across the people in the room.',
    concept: 'Small teams and a voice in the room',
    why: 'In Teaming at Disney Animation (Edmondson, Ager, Harburg, and Bartlett, HBS 9-615-023), meeting quality dropped when a group went from six people to seven, and formal tables made people go quiet. The redesign used small collocated teams and dailies so more people could show their work.',
    does: 'The report scores balance from 0 to 100 and charts each person’s share of words and turns against an equal split.',
  },
  {
    feature: 'Idea uptake',
    measures: 'Whose ideas other people pick up and build on, separate from who talked the most.',
    concept: 'Voice, not just airtime',
    why: 'The Disney case separates talking from influence. In dailies, people put unfinished work in front of the team, others give notes, and the owner decides. Ideas that nobody picks up do not shape the work, and a blame culture teaches people to stop offering them.',
    does: 'It counts how often a person’s turn is taken up by someone else, how often they build on others, and shows a few examples.',
  },
  {
    feature: 'Unanswered questions and comfort',
    measures: 'Questions that get no reply, and how comfortable people feel sharing ideas.',
    concept: 'Psychological safety',
    why: 'Edmondson and coauthors show the old Systems group treating mistakes as blame, and the new one treating a failed experiment as an interesting result. People raise concerns when that is safe. An ignored question is an early sign that it is not.',
    does: 'Unanswered questions are listed with the speaker and the words. A low comfort score is only a team-level note, never a score next to someone’s name.',
  },
  {
    feature: 'Scenario styles',
    measures: 'How members prefer to decide, respond to a late task, and treat an idea they doubt.',
    concept: 'Conflict rules, set in advance',
    why: 'The charter pre-work says many people avoid confrontation, so the team has to decide how it will handle conflict before the conflict arrives. At Disney, teams argued toward consensus, and the lead held the final call only when consensus failed. Leaving that rule implicit is where the friction starts.',
    does: 'The report shows each person’s choice. When the team is split, it suggests a rule you can set before the next meeting.',
  },
  {
    feature: 'Language and meaning',
    measures: 'The gap between a shared word and the meanings people actually hold.',
    concept: 'The charter word is not the agreement',
    why: 'Both course materials make the same point. “On time,” “quality,” and “open communication” only become a team agreement when the people using them define them. The word itself does not carry one meaning.',
    does: 'The Misalignment Map puts those meanings side by side, instead of treating the charter word as if it had one definition.',
  },
];

/** One card per report feature: what it measures, the course idea, and what the tool does. */
export function SciencePage() {
  return (
    <PageScaffold
      eyebrow="Course evidence"
      title="The Science"
      description="Each card is one part of the report. Read what it measures, the course idea behind it, and what CommonGround does with it."
    >
      <ol className="max-w-3xl space-y-4">
        {entries.map((entry) => (
          <li key={entry.feature}>
            <Card>
              <h2 className="text-[1.35rem] sm:text-[1.75rem]">{entry.feature}</h2>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="label">What it measures</dt>
                  <dd className="mt-1">{entry.measures}</dd>
                </div>
                <div>
                  <dt className="label">Why it matters</dt>
                  <dd className="mt-1">
                    <span className="font-semibold">{entry.concept}. </span>
                    {entry.why}
                  </dd>
                </div>
                <div>
                  <dt className="label">What the tool does with it</dt>
                  <dd className="mt-1">{entry.does}</dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
      </ol>
    </PageScaffold>
  );
}
