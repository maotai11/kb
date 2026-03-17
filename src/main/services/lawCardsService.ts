import type Database from 'better-sqlite3';
import type { LawCardDetail, LawCardSummary } from '../../shared/ipc-types';

export function searchLawCards(
  db: Database.Database,
  query: string,
  category?: string
): LawCardSummary[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const params: Record<string, string> = {
    like: `%${trimmed}%`
  };

  let sql = `
    SELECT card_id, law_name, article, category, summary, is_active, superseded_by
    FROM law_cards
    WHERE is_active = 1
      AND (law_name LIKE @like OR search_keywords LIKE @like OR summary LIKE @like)
  `;

  if (category) {
    sql += '\n      AND category = @category';
    params.category = category;
  }

  sql += `
    ORDER BY category, law_name
    LIMIT 50
  `;

  const rows = db.prepare(sql).all(params) as Array<{
    card_id: number;
    law_name: string;
    article: string | null;
    category: string;
    summary: string | null;
    is_active: number;
    superseded_by: number | null;
  }>;

  return rows.map((row) => ({
    cardId: row.card_id,
    lawName: row.law_name,
    article: row.article,
    category: row.category,
    summary: row.summary,
    isActive: row.is_active === 1,
    isSuperseded: row.superseded_by !== null
  }));
}

export function getLawCard(db: Database.Database, cardId: number): LawCardDetail | null {
  const row = db
    .prepare(
      `
        SELECT card_id, law_name, article, category, summary, content, search_keywords, is_active, superseded_by
        FROM law_cards
        WHERE card_id = ?
      `
    )
    .get(cardId) as
    | {
        card_id: number;
        law_name: string;
        article: string | null;
        category: string;
        summary: string | null;
        content: string | null;
        search_keywords: string | null;
        is_active: number;
        superseded_by: number | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    cardId: row.card_id,
    lawName: row.law_name,
    article: row.article,
    category: row.category,
    summary: row.summary,
    content: row.content,
    searchKeywords: row.search_keywords,
    isActive: row.is_active === 1,
    supersededBy: row.superseded_by
  };
}
