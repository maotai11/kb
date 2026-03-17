import { useEffect, useState } from 'react';
import type { CompanyRegistryRow } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { SectionWarning } from '../components/SectionWarning';

export function CompanyRegistryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyRegistryRow[]>([]);
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
      .searchCompany(debouncedQuery)
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
  }, [debouncedQuery]);

  return (
    <CalcPageLayout
      title="公司登記查詢"
      subtitle="統編精查與公司名稱模糊搜尋（FTS5）"
      yearControl={<span className="field-label">FTS search</span>}
      inputPanel={
        <form className="calc-form" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span className="field-label">Tax ID / Company name</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入 8 碼統編或關鍵字"
            />
          </label>
          <SectionWarning
            message="輸入少於 2 字時不送出查詢；輸入 8 碼數字會直接精查統編，其它會跑 FTS 模糊查。"
          />
        </form>
      }
      resultPanel={
        <div className="result-stack">
          {isLoading ? (
            <p>查詢中…</p>
          ) : results.length ? (
            <div className="company-table">
              <div className="company-row company-heading">
                <span>統一編號</span>
                <span>公司名稱</span>
                <span>狀態</span>
                <span>負責人</span>
              </div>
              {results.map((row) => (
                <div className="company-row" key={row.rowid}>
                  <span>{row.tax_id}</span>
                  <span>{row.company_name}</span>
                  <span>{row.status ?? '-'}</span>
                  <span>{row.representative ?? '-'}</span>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p>查無資料。首次查詢需連線至 GCIS，查詢過的公司會快取於本機。</p>
          ) : (
            <p>輸入統編或公司名稱開始搜尋。</p>
          )}
        </div>
      }
    />
  );
}
