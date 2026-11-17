import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = { title: string; reason: string };
type WorkoutState =
  | { status: 'loading' }
  | { status: 'success'; suggestions: Suggestion[] }
  | { status: 'error' };

export default function Workouts() {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`).then(
      ({ suggestions }) => {
        if (active) setState({ status: 'success', suggestions });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
      {state.status === 'error' && <p role="alert">Unable to load workout suggestions. Please try again later.</p>}
      {state.status === 'success' && (
        state.suggestions.length === 0 ? <p>No workout suggestions yet.</p> : (
          <ul>{state.suggestions.map((suggestion, index) => (
            <li key={index}><strong>{suggestion.title}</strong><p>{suggestion.reason}</p></li>
          ))}</ul>
        )
      )}
    </CapabilityCard>
  );
}
