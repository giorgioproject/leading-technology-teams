import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { Button } from './components/Button';
import { Container } from './components/Container';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { Stepper } from './components/Stepper';
import { TeamProvider, useTeam } from './context/TeamContext';
import { CharterPage } from './pages/CharterPage';
import { GuidePage } from './pages/GuidePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SciencePage } from './pages/SciencePage';
import { SetupPage } from './pages/SetupPage';
import { SurveyPage } from './pages/SurveyPage';
import { TakePage } from './pages/TakePage';
import { TranscriptPage } from './pages/TranscriptPage';

const ReportPage = lazy(() => import('./pages/ReportPage').then((module) => ({ default: module.ReportPage })));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TeamProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/science" element={<SciencePage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/charter" element={<CharterPage />} />
            <Route path="/survey" element={<SurveyPage />} />
            <Route path="/take" element={<TakePage />} />
            <Route path="/transcript" element={<TranscriptPage />} />
            <Route
              path="/report"
              element={
                <Suspense fallback={<p className="text-sm text-muted dark:text-muted-dark">Loading the report…</p>}>
                  <ReportPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </TeamProvider>
    </BrowserRouter>
  );
}

function Shell() {
  const { storageError, demoMessage, dismissDemoMessage } = useTeam();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="content" className="flex-1 py-8 sm:py-12">
        <Container>
          {storageError ? (
            <p
              role="status"
              className="no-print mb-6 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm leading-relaxed text-ink dark:border-warn/40 dark:bg-warn-soft-dark dark:text-ink-dark"
            >
              This browser blocked local storage, so this session stays in memory only and will reset when you
              refresh.
            </p>
          ) : null}
          {demoMessage ? (
            <div
              role="status"
              className="no-print mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-relaxed shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-line-dark dark:bg-card-dark"
            >
              <p>{demoMessage}</p>
              <Button variant="ghost" size="sm" onClick={dismissDemoMessage}>
                Dismiss
              </Button>
            </div>
          ) : null}
          <Stepper />
          <Outlet />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
