import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, buttonClasses, cn } from '../components/Button';
import { Callout } from '../components/Callout';
import { PageScaffold } from '../components/PageScaffold';
import { TextField } from '../components/TextField';
import { useTeam } from '../context/TeamContext';
import { MAX_MEMBERS, MEMBER_COLORS, MIN_MEMBERS } from '../lib/types';

/** Step 1. Team name and the people who will show up in the transcript. */
export function SetupPage() {
  const navigate = useNavigate();
  const { session, canAddMember, canRemoveMember, setTeamName, addMember, updateMember, removeMember } =
    useTeam();
  const [attempted, setAttempted] = useState(false);

  const teamNameError = attempted && session.teamName.trim() === '' ? 'Enter a team name.' : '';
  const missingName = session.members.some((member) => member.name.trim() === '');
  const ready = teamNameError === '' && !missingName && session.teamName.trim() !== '';

  function continueNext() {
    setAttempted(true);
    if (session.teamName.trim() === '') {
      document.getElementById('team-name')?.focus();
      return;
    }
    const blank = session.members.find((member) => member.name.trim() === '');
    if (blank) {
      document.getElementById(`member-name-${blank.id}`)?.focus();
      return;
    }
    navigate('/charter');
  }

  return (
    <PageScaffold
      title="Setup"
      description="Name the team and add the people in it. Use between 2 and 8 members."
    >
      <Callout tone="how">
        Use the same names that appear in your meeting transcript. You can match them later if they differ.
      </Callout>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          continueNext();
        }}
      >
        <TextField
          id="team-name"
          label="Team name"
          value={session.teamName}
          onChange={setTeamName}
          error={teamNameError}
          placeholder="Team Atlas"
          autoComplete="organization"
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink dark:text-ink-dark">Members</legend>
          <p className="text-sm text-muted dark:text-muted-dark">
            {MIN_MEMBERS} to {MAX_MEMBERS} people. Role is optional and is only a note for you.
          </p>
          <ul className="space-y-3">
            {session.members.map((member, index) => {
              const nameError =
                attempted && member.name.trim() === '' ? 'Enter a name, or remove this row.' : '';
              return (
                <li
                  key={member.id}
                  className="rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <span className="label">Member {index + 1}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canRemoveMember}
                      aria-label={`Remove member ${index + 1}${member.name.trim() ? `, ${member.name.trim()}` : ''}`}
                      onClick={() => removeMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id={`member-name-${member.id}`}
                      label="Name"
                      value={member.name}
                      onChange={(name) => updateMember(member.id, { name })}
                      error={nameError}
                      placeholder="Sara"
                      autoComplete="name"
                    />
                    <TextField
                      id={`member-role-${member.id}`}
                      label="Role"
                      optional
                      value={member.role ?? ''}
                      onChange={(role) => updateMember(member.id, { role })}
                      placeholder="Researcher"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={!canAddMember} onClick={addMember}>
              Add a member
            </Button>
            <p className="text-sm text-muted dark:text-muted-dark">
              {canAddMember
                ? `${session.members.length} of ${MAX_MEMBERS} members.`
                : `A team can have up to ${MAX_MEMBERS} members.`}
              {!canRemoveMember ? ` Keep at least ${MIN_MEMBERS}.` : ''}
            </p>
          </div>
        </fieldset>

        {attempted && !ready ? (
          <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
            Add a team name and a name for every member before continuing.
          </p>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" className={cn(buttonClasses('primary'), 'w-full sm:w-auto')}>
            Next: Charter →
          </button>
        </div>
      </form>
    </PageScaffold>
  );
}
