import { GroupStats } from '../components/GroupStats';
import { PostFeed } from '../components/PostFeed';

export function Group() {
  return (
    <div className="page page--wide">
      <h1>The Group</h1>

      <div className="split-grid">
        <div>
          <p className="hint">Everyone's daily status. No ranking, just visibility.</p>
          <GroupStats />
        </div>

        <div className="split-side">
          <h2>Notes</h2>
          <PostFeed />
        </div>
      </div>
    </div>
  );
}
