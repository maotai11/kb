import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { HistoryDetail, HistoryListItem } from '../../shared/ipc-types';

type CalcPageLayoutProps = {
  title: string;
  subtitle: string;
  yearControl: ReactNode;
  historyCalculator?: string;
  historyActionLabel?: string;
  inputPanel: ReactNode;
  resultPanel: ReactNode;
};

export function CalcPageLayout({
  title,
  subtitle,
  yearControl,
  historyCalculator,
  historyActionLabel = '查看歷史',
  inputPanel,
  resultPanel
}: CalcPageLayoutProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryListItem[]>([]);
  const [selectedCalcId, setSelectedCalcId] = useState<number | null>(null);
  const [historyDetail, setHistoryDetail] = useState<HistoryDetail | null>(null);

  useEffect(() => {
    if (!isHistoryOpen || !historyCalculator) {
      return;
    }

    let active = true;

    async function loadHistory() {
      const entries = await window.firmAPI.history.list({
        calculator: historyCalculator,
        limit: 20
      });

      if (!active) {
        return;
      }

      setHistoryList(entries);

      const nextCalcId =
        entries.find((item) => item.calcId === selectedCalcId)?.calcId ?? entries[0]?.calcId ?? null;
      setSelectedCalcId(nextCalcId);

      if (nextCalcId !== null) {
        const detail = await window.firmAPI.history.get(nextCalcId);
        if (active) {
          setHistoryDetail(detail);
        }
      } else {
        setHistoryDetail(null);
      }
    }

    loadHistory().catch(() => {
      if (active) {
        setHistoryList([]);
        setHistoryDetail(null);
      }
    });

    return () => {
      active = false;
    };
  }, [historyCalculator, isHistoryOpen, selectedCalcId]);

  async function selectHistory(calcId: number) {
    setSelectedCalcId(calcId);
    setHistoryDetail(await window.firmAPI.history.get(calcId));
  }

  async function toggleBookmark(calcId: number, currentFlag: boolean) {
    await window.firmAPI.history.bookmark(calcId, !currentFlag);
    setHistoryList((current) =>
      current.map((item) =>
        item.calcId === calcId ? { ...item, isBookmarked: !currentFlag } : item
      )
    );
    if (historyDetail?.calcId === calcId) {
      setHistoryDetail({ ...historyDetail, isBookmarked: !currentFlag });
    }
  }

  async function removeHistory(calcId: number) {
    await window.firmAPI.history.delete(calcId);
    const nextList = historyList.filter((item) => item.calcId !== calcId);
    setHistoryList(nextList);
    const nextCalcId = nextList[0]?.calcId ?? null;
    setSelectedCalcId(nextCalcId);
    setHistoryDetail(nextCalcId === null ? null : await window.firmAPI.history.get(nextCalcId));
  }

  return (
    <section className="calc-page">
      <header className="calc-page-header">
        <div>
          <p className="section-kicker">Calculator Workspace</p>
          <h3>{title}</h3>
          <p className="section-copy">{subtitle}</p>
        </div>

        <div className="calc-page-actions">
          <div className="year-control">{yearControl}</div>
          {historyCalculator ? (
            <button
              type="button"
              className="history-button"
              onClick={() => setIsHistoryOpen((current) => !current)}
            >
              {historyActionLabel}
            </button>
          ) : null}
        </div>
      </header>

      <div className="calc-grid">
        <section className="calc-panel calc-panel-input">
          <div className="panel-heading">
            <span>輸入區</span>
            <small>這裡的欄位會直接對應 IPC input shape</small>
          </div>
          {inputPanel}
        </section>

        <section className="calc-panel calc-panel-result">
          <div className="panel-heading">
            <span>結果區</span>
            <small>這裡顯示 calculator 回傳的最終結果</small>
          </div>
          {resultPanel}
        </section>
      </div>

      {isHistoryOpen && historyCalculator ? (
        <section className="history-panel">
          <div className="panel-heading">
            <span>計算歷史</span>
            <small>由主程序在計算完成時自動寫入 calc_history</small>
          </div>

          {historyList.length ? (
            <div className="history-grid">
              <div className="history-list">
                {historyList.map((item) => (
                  <button
                    key={item.calcId}
                    type="button"
                    className={
                      item.calcId === selectedCalcId ? 'history-item is-active' : 'history-item'
                    }
                    onClick={() => selectHistory(item.calcId)}
                  >
                    <strong>{item.calculator}</strong>
                    <span>{item.createdAt}</span>
                    <small>
                      {item.fiscalYear ? `${item.fiscalYear} 年` : '無年度'}
                      {item.isBookmarked ? ' ・ 已收藏' : ''}
                    </small>
                  </button>
                ))}
              </div>

              <div className="history-detail">
                {historyDetail ? (
                  <>
                    <div className="history-toolbar">
                      <button
                        type="button"
                        className="history-button"
                        onClick={() =>
                          toggleBookmark(historyDetail.calcId, historyDetail.isBookmarked)
                        }
                      >
                        {historyDetail.isBookmarked ? '取消收藏' : '加入收藏'}
                      </button>
                      <button
                        type="button"
                        className="history-button"
                        onClick={() => removeHistory(historyDetail.calcId)}
                      >
                        刪除
                      </button>
                    </div>
                    <pre className="history-json">{JSON.stringify(historyDetail.inputs, null, 2)}</pre>
                    <pre className="history-json">{JSON.stringify(historyDetail.outputs, null, 2)}</pre>
                    <pre className="history-json">
                      {JSON.stringify(historyDetail.paramsSnapshot, null, 2)}
                    </pre>
                  </>
                ) : (
                  <div className="empty-state">
                    <strong>目前沒有可顯示的歷史明細。</strong>
                    <p>先完成一次計算，主程序就會自動建立一筆新紀錄。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>目前沒有這個 calculator 的歷史紀錄。</strong>
              <p>歷史不由 renderer 主動保存，而是在 IPC handler 完成計算後即時寫入。</p>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
