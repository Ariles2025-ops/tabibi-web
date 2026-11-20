import { instantLisible, trierParDateRecenteDabord } from './dates-lisibles';

describe('dates-lisibles', () => {
  it('instantLisible : null si absente ou illisible', () => {
    expect(instantLisible(undefined)).toBeNull();
    expect(instantLisible(null)).toBeNull();
    expect(instantLisible('')).toBeNull();
    expect(instantLisible('pas une date')).toBeNull();
    expect(instantLisible('2026-11-20T09:00:00Z')).toBe(Date.parse('2026-11-20T09:00:00Z'));
  });

  it('trie du plus recent au plus ancien, dates inconnues en fin de liste', () => {
    const liste = [
      { id: 'sans', d: null as string | null },
      { id: 'ancien', d: '2026-01-01T00:00:00Z' },
      { id: 'illisible', d: 'xx' },
      { id: 'recent', d: '2026-06-01T00:00:00Z' },
    ];
    expect(trierParDateRecenteDabord(liste, (e) => e.d).map((e) => e.id)).toEqual(['recent', 'ancien', 'sans', 'illisible']);
  });
});
