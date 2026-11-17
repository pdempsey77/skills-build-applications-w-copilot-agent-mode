import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; members: string[] };
type TeamState =
  | { status: 'loading' }
  | { status: 'success'; teams: Team[] }
  | { status: 'error' };

export default function Teams() {
  const [state, setState] = useState<TeamState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams').then(
      ({ teams }) => {
        if (active) setState({ status: 'success', teams });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {state.status === 'loading' && <p role="status">Loading teams...</p>}
      {state.status === 'error' && <p role="alert">Unable to load teams. Please try again later.</p>}
      {state.status === 'success' && (
        state.teams.length === 0 ? <p>No teams yet.</p> : (
          <ul>{state.teams.map((team, index) => (
            <li key={index}>{team.name} - {team.members.length} members</li>
          ))}</ul>
        )
      )}
    </CapabilityCard>
  );
}
