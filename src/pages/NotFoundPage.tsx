import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { buttonClasses } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageScaffold } from '../components/PageScaffold';

export function NotFoundPage() {
  return (
    <PageScaffold
      title="Page not found"
      description="That address is not part of CommonGround."
      documentTitle="Page not found · CommonGround"
    >
      <EmptyState icon={SearchX} message="Head back home, or start a team from the first step." />
      <Link to="/" className={buttonClasses('primary')}>
        Back home
      </Link>
    </PageScaffold>
  );
}
