import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { getLawCard, searchLawCards } from '../src/main/services/lawCardsService';

function setupDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE law_cards (
      card_id INTEGER PRIMARY KEY AUTOINCREMENT,
      law_name TEXT NOT NULL,
      article TEXT,
      category TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      search_keywords TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      superseded_by INTEGER
    );
  `);

  const insert = db.prepare(`
    INSERT INTO law_cards (
      law_name, article, category, summary, content, search_keywords, is_active, superseded_by
    ) VALUES (
      @lawName, @article, @category, @summary, @content, @searchKeywords, @isActive, @supersededBy
    )
  `);

  insert.run({
    lawName: '所得稅法',
    article: '第14條',
    category: 'TAX',
    summary: '對所得課稅之基本條文',
    content: '內容 A',
    searchKeywords: '所得 稅',
    isActive: 1,
    supersededBy: null
  });

  insert.run({
    lawName: '所得稅法',
    article: '第4條之1',
    category: 'TAX',
    summary: '特別條款',
    content: '內容 B',
    searchKeywords: '特別所得',
    isActive: 1,
    supersededBy: null
  });

  insert.run({
    lawName: '勞動基準法',
    article: '第24條',
    category: 'LABOR',
    summary: '工時管理',
    content: '內容 C',
    searchKeywords: '勞基法 工時',
    isActive: 1,
    supersededBy: 5
  });

  insert.run({
    lawName: '勞動基準法',
    article: '第84條之1（廢止）',
    category: 'LABOR',
    summary: '廢止規定',
    content: '內容 D',
    searchKeywords: '廢止',
    isActive: 0,
    supersededBy: null
  });

  insert.run({
    lawName: '勞動基準法',
    article: '第84條之2',
    category: 'LABOR',
    summary: '新修正條文',
    content: '內容 E',
    searchKeywords: '勞基法 新制',
    isActive: 1,
    supersededBy: null
  });

  return db;
}

describe('law_cards service', () => {
  it('returns active cards when a keyword matches', () => {
    const db = setupDb();
    const results = searchLawCards(db, '勞基法', 'LABOR');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].lawName).toContain('勞動基準法');
  });

  it('does not return inactive cards even when the keyword matches', () => {
    const db = setupDb();
    const results = searchLawCards(db, '廢止');

    expect(results).toHaveLength(0);
  });

  it('annotates superseded cards and exposes supersededBy via getLawCard', () => {
    const db = setupDb();
    const laborResults = searchLawCards(db, '勞', 'LABOR');
    const superseded = laborResults.find((card) => card.cardId === 3);

    expect(superseded).toBeDefined();
    expect(superseded?.isSuperseded).toBe(true);

    const detail = getLawCard(db, 3);
    expect(detail?.supersededBy).toBe(5);
  });
});
