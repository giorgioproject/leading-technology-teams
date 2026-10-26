/**
 * One React context for the whole team session.
 * Pages read and update it; this file is the only place that talks to storage.
 */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  createContext,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemoSession } from '../lib/demoData';
import { readSession, writeSession } from '../lib/storage';
import {
  MAX_MEMBERS,
  MAX_TERMS,
  MIN_MEMBERS,
  createEmptySession,
  createId,
  isStepComplete,
  type CharterTerm,
  type FourMeanings,
  type Member,
  type MemberAssessment,
  type SurveyResponse,
  type TeamSession,
  type WorkflowStepId,
} from '../lib/types';

interface Store {
  session: TeamSession;
  storageError: boolean;
  demoMessage: string | null;
}

export interface TeamContextValue {
  session: TeamSession;
  storageError: boolean;
  /** Set when "Load demo team" is clicked before demo data exists. */
  demoMessage: string | null;
  dismissDemoMessage: () => void;
  canAddMember: boolean;
  canRemoveMember: boolean;
  setTeamName: (teamName: string) => void;
  setMembers: (members: Member[]) => void;
  addMember: () => void;
  updateMember: (id: string, patch: Partial<Pick<Member, 'name' | 'role'>>) => void;
  removeMember: (id: string) => void;
  setCharterText: (charterText: string) => void;
  setSelectedTerms: (selectedTerms: CharterTerm[]) => void;
  setCustomTerms: (customTerms: CharterTerm[]) => void;
  setMeaningEdits: (meaningEdits: Record<string, FourMeanings>) => void;
  setResponses: (responses: SurveyResponse[]) => void;
  upsertResponse: (response: SurveyResponse) => void;
  setTranscriptText: (transcriptText: string) => void;
  setSpeakerMap: (speakerMap: Record<string, string>) => void;
  setAssessment: (memberId: string, assessment: MemberAssessment) => void;
  clearAll: () => void;
  /** Replaces the session with the sample team and opens the report. */
  loadDemoTeam: () => void;
  isStepComplete: (step: WorkflowStepId) => boolean;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [store, setStore] = useState<Store>(() => {
    const loaded = readSession();
    return { session: loaded.session, storageError: loaded.storageError, demoMessage: null };
  });

  const { session, storageError, demoMessage } = store;

  useEffect(() => {
    const saved = writeSession(session);
    setStore((current) => {
      const nextError = !saved;
      if (current.storageError === nextError) return current;
      return { ...current, storageError: nextError };
    });
  }, [session]);

  const update = useCallback((recipe: (current: TeamSession) => TeamSession) => {
    setStore((current) => {
      const next = recipe(current.session);
      if (next === current.session) return current;
      return {
        ...current,
        session: { ...next, updatedAt: new Date().toISOString() },
      };
    });
  }, []);

  const dismissDemoMessage = useCallback(() => {
    setStore((current) => (current.demoMessage === null ? current : { ...current, demoMessage: null }));
  }, []);

  const setTeamName = useCallback(
    (teamName: string) => {
      update((current) => ({ ...current, teamName }));
    },
    [update],
  );

  const setMembers = useCallback(
    (members: Member[]) => {
      update((current) => {
        if (members.length < MIN_MEMBERS || members.length > MAX_MEMBERS) return current;
        return { ...current, members };
      });
    },
    [update],
  );

  const addMember = useCallback(() => {
    update((current) => {
      if (current.members.length >= MAX_MEMBERS) return current;
      return { ...current, members: [...current.members, { id: createId(), name: '' }] };
    });
  }, [update]);

  const updateMember = useCallback(
    (id: string, patch: Partial<Pick<Member, 'name' | 'role'>>) => {
      update((current) => ({
        ...current,
        members: current.members.map((member) => (member.id === id ? { ...member, ...patch } : member)),
      }));
    },
    [update],
  );

  const removeMember = useCallback(
    (id: string) => {
      update((current) => {
        if (current.members.length <= MIN_MEMBERS) return current;
        const assessments = { ...current.assessments };
        delete assessments[id];
        const speakerMap = Object.fromEntries(
          Object.entries(current.speakerMap).filter(([, target]) => target !== id),
        );
        return {
          ...current,
          members: current.members.filter((member) => member.id !== id),
          responses: current.responses.filter((response) => response.memberId !== id),
          assessments,
          speakerMap,
        };
      });
    },
    [update],
  );

  const setCharterText = useCallback(
    (charterText: string) => {
      update((current) => ({ ...current, charterText }));
    },
    [update],
  );

  const setSelectedTerms = useCallback(
    (selectedTerms: CharterTerm[]) => {
      update((current) => ({ ...current, selectedTerms: selectedTerms.slice(0, MAX_TERMS) }));
    },
    [update],
  );

  const setCustomTerms = useCallback(
    (customTerms: CharterTerm[]) => {
      update((current) => ({ ...current, customTerms }));
    },
    [update],
  );

  const setMeaningEdits = useCallback(
    (meaningEdits: Record<string, FourMeanings>) => {
      update((current) => ({ ...current, meaningEdits }));
    },
    [update],
  );

  const setResponses = useCallback(
    (responses: SurveyResponse[]) => {
      update((current) => ({ ...current, responses }));
    },
    [update],
  );

  const upsertResponse = useCallback(
    (response: SurveyResponse) => {
      update((current) => ({
        ...current,
        responses: [
          ...current.responses.filter((item) => item.memberId !== response.memberId),
          response,
        ],
      }));
    },
    [update],
  );

  const setTranscriptText = useCallback(
    (transcriptText: string) => {
      update((current) => ({ ...current, transcriptText }));
    },
    [update],
  );

  const setSpeakerMap = useCallback(
    (speakerMap: Record<string, string>) => {
      update((current) => ({ ...current, speakerMap }));
    },
    [update],
  );

  const setAssessment = useCallback(
    (memberId: string, assessment: MemberAssessment) => {
      update((current) => ({
        ...current,
        assessments: { ...current.assessments, [memberId]: assessment },
      }));
    },
    [update],
  );

  const clearAll = useCallback(() => {
    const fresh = createEmptySession();
    const saved = writeSession(fresh);
    setStore((current) => ({
      ...current,
      session: fresh,
      storageError: !saved,
      demoMessage: null,
    }));
  }, []);

  const loadDemoTeam = useCallback(() => {
    const demo = createDemoSession();
    setStore((current) => ({ ...current, session: demo, demoMessage: null }));
    navigate('/report');
  }, [navigate]);

  const stepIsComplete = useCallback(
    (step: WorkflowStepId) => isStepComplete(session, step),
    [session],
  );

  const value = useMemo<TeamContextValue>(
    () => ({
      session,
      storageError,
      demoMessage,
      dismissDemoMessage,
      canAddMember: session.members.length < MAX_MEMBERS,
      canRemoveMember: session.members.length > MIN_MEMBERS,
      setTeamName,
      setMembers,
      addMember,
      updateMember,
      removeMember,
      setCharterText,
      setSelectedTerms,
      setCustomTerms,
      setMeaningEdits,
      setResponses,
      upsertResponse,
      setTranscriptText,
      setSpeakerMap,
      setAssessment,
      clearAll,
      loadDemoTeam,
      isStepComplete: stepIsComplete,
    }),
    [
      session,
      storageError,
      demoMessage,
      dismissDemoMessage,
      setTeamName,
      setMembers,
      addMember,
      updateMember,
      removeMember,
      setCharterText,
      setSelectedTerms,
      setCustomTerms,
      setMeaningEdits,
      setResponses,
      upsertResponse,
      setTranscriptText,
      setSpeakerMap,
      setAssessment,
      clearAll,
      loadDemoTeam,
      stepIsComplete,
    ],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext);
  if (!value) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return value;
}
