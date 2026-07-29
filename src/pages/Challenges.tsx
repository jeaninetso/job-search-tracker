import { useEffect, useState, type FormEvent } from 'react';
import { formatISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/Spinner';
import { todayKey } from '../lib/date';
import {
  computeCategoryProgress,
  createChallenge,
  getEligibleItems,
  submitToCategory,
} from '../lib/challenges';
import type {
  Challenge,
  ChallengeCategory,
  ChallengeSubmission,
  DailyProgress,
  GoalItem,
  Profile,
} from '../types';

export function Challenges() {
  const { session } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<ChallengeCategory[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myItems, setMyItems] = useState<GoalItem[]>([]);
  const [myProgress, setMyProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session) return;
    const thirtyDaysAgo = formatISO(new Date(Date.now() - 30 * 86400000), { representation: 'date' });

    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    const challengeIds = (challengeData ?? []).map((c) => c.id);

    const [{ data: categoryData }, { data: profileData }, { data: itemData }, { data: progressData }] =
      await Promise.all([
        challengeIds.length > 0
          ? supabase.from('challenge_categories').select('*').in('challenge_id', challengeIds)
          : Promise.resolve({ data: [] as ChallengeCategory[] }),
        supabase.from('profiles').select('*'),
        supabase.from('goal_items').select('*').eq('user_id', session.user.id).gte('for_date', thirtyDaysAgo),
        supabase
          .from('daily_progress')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('entry_date', thirtyDaysAgo),
      ]);

    const categoryIds = (categoryData ?? []).map((c) => c.id);
    const { data: submissionData } =
      categoryIds.length > 0
        ? await supabase.from('challenge_submissions').select('*').in('category_id', categoryIds)
        : { data: [] as ChallengeSubmission[] };

    setChallenges(challengeData ?? []);
    setCategories(categoryData ?? []);
    setSubmissions(submissionData ?? []);
    setProfiles(profileData ?? []);
    setMyItems(itemData ?? []);
    setMyProgress(progressData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  if (loading) return <Spinner />;

  return (
    <div className="page">
      <h1>Challenges</h1>
      <p className="hint">
        Group goals - either everyone's own progress side by side, or one shared total to celebrate together.
        Your call when you create one.
      </p>

      {challenges.length === 0 && <p className="hint">No challenges yet - start one below.</p>}

      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          categories={categories.filter((c) => c.challenge_id === challenge.id)}
          submissions={submissions}
          profiles={profiles}
          myItems={myItems}
          myProgress={myProgress}
          myUserId={session?.user.id}
          onSubmitted={load}
        />
      ))}

      <details className="manage-checklist">
        <summary>Create a challenge</summary>
        {session && <CreateChallengeForm userId={session.user.id} onCreated={load} />}
      </details>
    </div>
  );
}

function ChallengeCard({
  challenge,
  categories,
  submissions,
  profiles,
  myItems,
  myProgress,
  myUserId,
  onSubmitted,
}: {
  challenge: Challenge;
  categories: ChallengeCategory[];
  submissions: ChallengeSubmission[];
  profiles: Profile[];
  myItems: GoalItem[];
  myProgress: DailyProgress[];
  myUserId: string | undefined;
  onSubmitted: () => Promise<void>;
}) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ended = !!challenge.end_date && challenge.end_date < todayKey();

  const handleSubmit = async (categoryId: string, goalItemId: string, amount: number) => {
    if (!myUserId || submittingId) return;
    setSubmittingId(goalItemId);
    setError(null);
    try {
      await submitToCategory(categoryId, myUserId, goalItemId, amount);
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong logging that - try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="goal-group">
      <h3>
        {challenge.title}
        {ended && <span className="feed-badge challenge-ended-badge">Ended</span>}
      </h3>
      {challenge.description && <p className="hint">{challenge.description}</p>}

      {categories.map((category) => {
        const progress = computeCategoryProgress(category, submissions);
        const alreadySubmitted = new Set(
          submissions
            .filter((s) => s.category_id === category.id && s.user_id === myUserId)
            .map((s) => s.goal_item_id)
        );
        const eligible = myUserId ? getEligibleItems(myItems, myProgress, alreadySubmitted) : [];

        return (
          <div key={category.id} className="challenge-category">
            <p className="challenge-category-label">{category.label}</p>

            {challenge.display_mode === 'aggregate' ? (
              <>
                <div className="progress-bar">
                  <div
                    className={
                      progress.groupTotal >= category.target_count
                        ? 'progress-bar-fill progress-bar-fill--done'
                        : 'progress-bar-fill'
                    }
                    style={{ width: `${Math.min(100, (progress.groupTotal / category.target_count) * 100)}%` }}
                  />
                </div>
                <p className="challenge-total-label">
                  {progress.groupTotal} / {category.target_count} (group total)
                </p>
              </>
            ) : (
              <div className="challenge-individual-rows">
                {profiles.map((profile) => {
                  const total = progress.totalsByUser.get(profile.id) ?? 0;
                  return (
                    <div key={profile.id} className="challenge-individual-row">
                      <Avatar name={profile.display_name} avatarKey={profile.avatar_key} seed={profile.id} size={24} />
                      <span className="challenge-individual-name">{profile.display_name}</span>
                      <div className="progress-bar">
                        <div
                          className={
                            total >= category.target_count
                              ? 'progress-bar-fill progress-bar-fill--done'
                              : 'progress-bar-fill'
                          }
                          style={{ width: `${Math.min(100, (total / category.target_count) * 100)}%` }}
                        />
                      </div>
                      <span className="challenge-individual-count">
                        {total}/{category.target_count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {eligible.length > 0 && (
              <div className="challenge-submit-list">
                <p className="hint">Log one of your completed items toward this:</p>
                {eligible.map(({ item, amount }) => (
                  <button
                    key={item.id}
                    className="challenge-submit-btn"
                    disabled={submittingId === item.id}
                    onClick={() => handleSubmit(category.id, item.id, amount)}
                  >
                    + {item.label} ({amount})
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function CreateChallengeForm({ userId, onCreated }: { userId: string; onCreated: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayMode, setDisplayMode] = useState<'individual' | 'aggregate'>('aggregate');
  const [categoryRows, setCategoryRows] = useState([{ label: '', target: 10 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (i: number, patch: Partial<{ label: string; target: number }>) => {
    setCategoryRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };
  const addRow = () => setCategoryRows((prev) => [...prev, { label: '', target: 10 }]);
  const removeRow = (i: number) => setCategoryRows((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createChallenge(
        userId,
        title,
        description,
        endDate || null,
        displayMode,
        categoryRows.map((row) => ({ label: row.label, targetCount: row.target }))
      );
      setTitle('');
      setDescription('');
      setEndDate('');
      setDisplayMode('aggregate');
      setCategoryRows([{ label: '', target: 10 }]);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating that challenge - try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="goal-form">
      <input
        required
        placeholder="Title, e.g. Group Application Sprint"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        title="End date (optional - leave blank for open-ended)"
      />
      <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as 'individual' | 'aggregate')}>
        <option value="aggregate">One shared group total</option>
        <option value="individual">Everyone's own progress</option>
      </select>

      {categoryRows.map((row, i) => (
        <div className="count-row" key={i}>
          <input
            required
            placeholder="Category, e.g. Applications"
            value={row.label}
            onChange={(e) => updateRow(i, { label: e.target.value })}
          />
          <input
            required
            type="number"
            min={1}
            value={row.target}
            onChange={(e) => updateRow(i, { target: Number(e.target.value) })}
          />
          {categoryRows.length > 1 && (
            <button type="button" onClick={() => removeRow(i)}>
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" className="link-button" onClick={addRow}>
        + Add another category
      </button>

      <button type="submit" disabled={saving || !title.trim()}>
        {saving ? 'Creating...' : 'Create challenge'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
