import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MeaningQuiz, type QuizTerm } from '../components/MeaningQuiz';
import { PageScaffold } from '../components/PageScaffold';
import { decodeSurveyLink, type SurveyLinkPayload } from '../lib/encoding';
import type { FourMeanings } from '../lib/types';

function quizTerms(payload: SurveyLinkPayload): QuizTerm[] {
  return payload.terms.map((term) => {
    const meanings: FourMeanings = [
      { key: 'A', text: term.meanings[0] },
      { key: 'B', text: term.meanings[1] },
      { key: 'C', text: term.meanings[2] },
      { key: 'D', text: term.meanings[3] },
    ];
    return { id: term.id, label: term.term, meanings };
  });
}

/** The page a teammate opens from the leader's link. No workflow steps. */
export function TakePage() {
  const [params] = useSearchParams();
  const decoded = useMemo(() => decodeSurveyLink(params.get('s')), [params]);

  if (!decoded.ok) {
    return (
      <PageScaffold
        title="Meaning Survey"
        description="Takes about 2 minutes."
        documentTitle="Meaning Survey · CommonGround"
      >
        <EmptyState icon={Link2} message={decoded.error} />
      </PageScaffold>
    );
  }

  const teamName = decoded.value.teamName || 'Your team';

  return (
    <PageScaffold
      title={teamName}
      description="Takes about 2 minutes."
      documentTitle={`${teamName} · Meaning Survey`}
    >
      <MeaningQuiz terms={quizTerms(decoded.value)} names={decoded.value.members} finish="code" />
    </PageScaffold>
  );
}
