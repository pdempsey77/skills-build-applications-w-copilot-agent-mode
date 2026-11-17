import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };
type ActivityState =
  | { status: 'loading' }
  | { status: 'success'; activities: Activity[] }
  | { status: 'error' };

export default function Activities() {
  const [state, setState] = useState<ActivityState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities').then(
      ({ activities }) => {
        if (active) setState({ status: 'success', activities });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      {state.status === 'loading' && <p role="status">Loading activities…</p>}
      {state.status === 'error' && <p role="alert">Unable to load activities. Please try again later.</p>}
      {state.status === 'success' && (
        state.activities.length === 0 ? <p>No activities yet.</p> : (
          <table className="table">
            <caption>Student activities</caption>
            <thead><tr><th scope="col">Activity</th><th scope="col">Minutes</th><th scope="col">Points</th></tr></thead>
            <tbody>{state.activities.map((activity, index) => (
              <tr key={index}><td>{activity.type}</td><td>{activity.minutes}</td><td>{activity.points}</td></tr>
            ))}</tbody>
          </table>
        )
      )}
    </CapabilityCard>
  );
}
