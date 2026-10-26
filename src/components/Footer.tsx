import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';
import { COURSE_FOOTER } from '../lib/types';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { Container } from './Container';

export function Footer() {
  const { pathname } = useLocation();
  const { clearAll } = useTeam();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (pathname === '/take') return null;

  function confirmClear() {
    clearAll();
    setOpen(false);
  }

  return (
    <footer className="border-t border-line print:hidden dark:border-line-dark">
      <Container className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted dark:text-muted-dark">{COURSE_FOOTER}</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Clear all data
        </Button>
      </Container>
      <ConfirmDialog
        open={open}
        title="Clear all data?"
        body="This deletes the team, charter, survey answers, and transcript stored in this browser. It cannot be undone."
        confirmLabel="Delete data"
        onConfirm={confirmClear}
        onCancel={close}
      />
    </footer>
  );
}
