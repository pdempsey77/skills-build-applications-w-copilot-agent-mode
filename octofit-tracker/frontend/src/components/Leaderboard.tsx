import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardState =
  | { status: 'loading' }
  | { status: 'success'; leaderboard: LeaderboardEntry[] }
  | { status: 'error' };

export default function Leaderboard() {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard').then(
      ({ leaderboard }) => {
        if (active) setState({ status: 'success', leaderboard });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
      {state.status === 'error' && <p role="alert">Unable to load leaderboard. Please try again later.</p>}
      {state.status === 'success' && (
        state.leaderboard.length === 0 ? <p>No leaderboard scores yet.</p> : (
          <table className="table">
            <caption>Team rankings</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
            <tbody>{state.leaderboard.map((entry, index) => (
              <tr key={index}><td>{entry.rank}</td><td>{entry.teamName}</td><td>{entry.totalPoints}</td></tr>
            ))}</tbody>
          </table>
        )
      )}
    </CapabilityCard>
  );
}
