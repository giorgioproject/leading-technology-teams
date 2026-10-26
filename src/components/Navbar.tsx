import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { Button, cn, focusRing } from './Button';
import { Container } from './Container';
import { Logo } from './Logo';

const links = [
  { to: '/guide', label: 'Guide' },
  { to: '/science', label: 'The Science' },
  { to: '/setup', label: 'Start' },
];

function navClass(isActive: boolean): string {
  return cn(
    'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200',
    focusRing,
    isActive
      ? 'bg-primary-soft text-primary dark:bg-primary-soft-dark dark:text-primary-bright'
      : 'text-muted hover:bg-primary-soft hover:text-ink dark:text-muted-dark dark:hover:bg-primary-soft-dark dark:hover:text-ink-dark',
  );
}

export function Navbar() {
  const { loadDemoTeam } = useTeam();
  const { pathname } = useLocation();
  const quiet = pathname === '/take';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function onDemo() {
    setOpen(false);
    loadDemoTeam();
  }

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md print:hidden dark:border-line-dark dark:bg-paper-dark/90">
      <Container className="flex h-16 items-center justify-between gap-3">
        <NavLink to="/" className={cn('flex items-center gap-2.5 rounded-lg', focusRing)} aria-label="CommonGround, home">
          <Logo />
          <span className="font-serif text-xl font-semibold tracking-tight" aria-hidden="true">
            CommonGround
          </span>
        </NavLink>

        {quiet ? null : (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => navClass(isActive)}>
                {link.label}
              </NavLink>
            ))}
            <Button variant="secondary" size="sm" className="ml-2" onClick={onDemo}>
              Load demo team
            </Button>
          </nav>
        )}

        {quiet ? null : (
          <button
            type="button"
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink md:hidden dark:text-ink-dark',
              focusRing,
            )}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
      </Container>

      {open && !quiet ? (
        <div id="mobile-nav" className="border-t border-line md:hidden dark:border-line-dark">
          <Container className="flex flex-col gap-1 py-3">
            <nav aria-label="Main" className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(navClass(isActive), 'w-full')}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <Button variant="secondary" onClick={onDemo}>
              Load demo team
            </Button>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
