import { useEffect, useState } from 'react';
import type { LawCardSummary } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { SectionWarning } from '../components/SectionWarning';

const categories = ['ALL', 'TAX', 'LABOR', 'COMMERCE', 'AUDIT'] as const;

export function LawCardsPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<typeof categories[number]>('ALL');
  const [results, setResults] = useState<LawCardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let active = true;
    setIsLoading(true);

    window.firmAPI.db
      .searchLawCards(debouncedQuery, category === 'ALL' ? undefined : category)
      .then((rows) => {
        if (active) {
          setResults(rows);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, category]);

  const showPrompt = debouncedQuery.length < 2;

  return (
    <CalcPageLayout
      title="law_cards lexicon"
      subtitle="Powered by a curated seed of active TAX and LABOR cards; search uses LIKE filters plus optional category in the renderer."
      yearControl={<span className="field-label">text search + category</span>}
      inputPanel={
        <form className="calc-form" onSubmit={(event) => event.preventDefault()}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">關鍵字 / 條文引用</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="至少輸入兩個字元才能查詢"
              />
            </label>
            <label className="field">
              <span className="field-label">分類篩選</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as typeof categories[number])
                }
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value === 'ALL' ? 'ALL CATEGORIES' : value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <SectionWarning
            severity="info"
            message="只會回傳 is_active=1 的卡片；superseded 門卡會帶上提示讓你知道它被更新或廢止。"
          />
        </form>
      }
      resultPanel={
        <div className="law-card-list">
          {isLoading ? (
            <p className="result-hint">搜尋中…</p>
          ) : showPrompt ? (
            <p className="result-hint">輸入至少兩個字元，系統就會搜尋 law_cards 表。</p>
          ) : results.length ? (
            results.map((card) => (
              <article className="law-card" key={card.cardId}>
                <header className="law-card-header">
                  <div>
                    <strong>{card.lawName}</strong>
                    <p>{card.article ?? '—'}</p>
                  </div>
                  <div className="law-card-meta">
                    <span className="law-card-category">{card.category}</span>
                    {card.isSuperseded ? (
                      <span className="law-card-badge" aria-label="Superseded">
                        已更新 / 廢止
                      </span>
                    ) : null}
                  </div>
                </header>
                <p className="law-card-summary">{card.summary ?? '摘要尚未填寫。'}</p>
              </article>
            ))
          ) : (
            <p className="result-hint">沒有符合的卡片；試試另選分類或換一組關鍵字。</p>
          )}
        </div>
      }
    />
  );
}
