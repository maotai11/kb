import { useState } from 'react';
import { AMTPage } from './pages/AMTPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { CITPage } from './pages/CITPage';
import { DeadlinePage } from './pages/DeadlinePage';
import { EstateGiftTaxPage } from './pages/EstateGiftTaxPage';
import { HouseLandTaxPage } from './pages/HouseLandTaxPage';
import { IITPage } from './pages/IITPage';
import { NhiSupplementPage } from './pages/NhiSupplementPage';
import { OvertimePage } from './pages/OvertimePage';
import { PayrollPage } from './pages/PayrollPage';
import { CompanyRegistryPage } from './pages/CompanyRegistryPage';
import { ResidencyPage } from './pages/ResidencyPage';
import { RetirementPage } from './pages/RetirementPage';
import { WithholdingPage } from './pages/WithholdingPage';
import { LandValueTaxPage } from './pages/LandValueTaxPage';
import { LawCardsPage } from './pages/LawCardsPage';
import { StampTaxPage } from './pages/StampTaxPage';
import { HouseTaxPage } from './pages/HouseTaxPage';
import { ClientsPage } from './pages/ClientsPage';
import { SchedulePage } from './pages/SchedulePage';

type PageKey =
  | 'cit'
  | 'withholding'
  | 'payroll'
  | 'nhiSupplement'
  | 'overtime'
  | 'houseLandTax'
  | 'houseTax'
  | 'deadline'
  | 'landValueTax'
  | 'stampTax'
  | 'residency'
  | 'retirement'
  | 'companyRegistry'
  | 'lawCards'
  | 'estateGift'
  | 'iit'
  | 'amt'
  | 'clients'
  | 'cashFlow'
  | 'schedule';

const pageMeta: Record<Exclude<PageKey, 'stampTax'>, { eyebrow: string; title: string; description: string }> = {
  cashFlow: {
    eyebrow: 'C-3-B / C-4 現金流',
    title: '未分配盈餘稅（5%）與租賃反推毛額，兩項合用同一頁面。',
    description: '法人房東免扣；個人房東 10% + 補充保費 2.11%，未達 20,000 免扣。'
  },
  schedule: {
    eyebrow: '申報排程',
    title: '記錄各申報截止日，依假日自動順延並追蹤完成狀態。',
    description: '順延規則呼叫 adjustDeadline()，與 Module D 使用同一套假日表。'
  },
  cit: {
    eyebrow: 'C-3 營利事業所得稅',
    title: '用最短公式驗證 smooth mechanism 與 200,000 臨界點。',
    description: '結果同時顯示 normal tax、excess-half 與最終適用路徑。'
  },
  withholding: {
    eyebrow: 'C-5 各類所得扣繳',
    title: '依所得性質切換輸入欄位，並清楚說明適用稅率與原因。',
    description: '目前先覆蓋非居住者扣繳基線與法人房東免扣繳例外。'
  },
  payroll: {
    eyebrow: 'C-7 勞健保 / 勞退',
    title: '三套分級表分區顯示，讓勞保、健保、勞退來源不混淆。',
    description: '同一套 layout 已能承接多區塊結果與各自警示。'
  },
  nhiSupplement: {
    eyebrow: 'C-8 補充保費',
    title: '先鎖住獎金 YTD 累計四種狀態，避免跨門檻邏輯靜默算錯。',
    description: '門檻 = 投保金額 × 4，並要同時處理部分跨門檻、已過門檻與 1,000 萬上限。'
  },
  overtime: {
    eyebrow: 'C-12 加班費',
    title: '先鎖住平日 / 休息日 / 例假日三種規則，並確認休息日永遠只有兩段。',
    description: '這頁先用靜態勞基法規則試算，不把休息日錯拆成三段。'
  },
  houseLandTax: {
    eyebrow: 'C-11 房地合一 2.0',
    title: '先固定取得方式起算日、持有期間四段稅率與重購 2 年期限的日期算法。',
    description: '這頁目前先驗證 self_built、閏年重購期限、自用住宅與稅率四段主線。'
  },
  houseTax: {
    eyebrow: 'calc:house-tax',
    title: '房屋稅試算',
    description: '依據用途選擇稅率或手動輸入，自動估算稅額，僅供模擬。'
  },
  deadline: {
    eyebrow: 'Module D 申報期限順延',
    title: '依週末、國定假日與補班日規則自動調整申報截止日。',
    description: '這頁目前先驗證 adjustDeadline() 主線、連假迴圈與 holidays table 的最小接線。'
  },
  landValueTax: {
    eyebrow: 'C-15 Land Value Tax',
    title: 'Break down the 6 PS brackets and show taxable �� rate = tax.',
    description: 'Supports self-use 0.2% and preserves every step in the history panel.'
  },
  companyRegistry: {
    eyebrow: 'company_registry',
    title: 'FTS5 全文搜尋 + 統編查詢',
    description: '輸入統編或公司名稱，300ms debounce 後使用 db:search-company IPC 搜尋。'
  },
  lawCards: {
    eyebrow: 'law_cards',
    title: '精準搜尋法條卡片',
    description: '透過 LIKE + category 篩選，讓 baseline seed 的 TAX/LABOR 卡片在 renderer 端立即可查。'
  },
  clients: {
    eyebrow: 'clients',
    title: 'Clients CRUD',
    description: '新增/編輯/刪除客戶資料 (統編、名稱、會計年度) 並保留本機紀錄。'
  },
  residency: {
    eyebrow: 'C-16 居留天數',
    title: '先鎖住日曆年度與滾動 12 個月兩種模式，以及出境當日不計的核心規則。',
    description: '這頁目前優先驗證本地日期計算、182/183 邊界與法源模式切換。'
  },
  retirement: {
    eyebrow: 'C-9 退職所得',
    title: '一次領與分期領分開試算，先鎖住三段邏輯與未公告年度錯誤處理。',
    description: '這頁會直接顯示年度免稅額、各段門檻與應稅退職所得。'
  },
  estateGift: {
    eyebrow: 'C-14 遺產稅 / 贈與稅',
    title: '由事件日期決定適用級距年度，並以 DB 中的累進差額計算稅額。',
    description: '遺產稅與贈與稅共用同一支 calculator，依 taxType 分流對應級距表。'
  },
  iit: {
    eyebrow: 'C-1 綜合所得稅',
    title: '扣除額、股利二擇一與 AMT handoff 都已接上主線。',
    description: '這裡使用 income_year，不能和 effective_year 混用。'
  },
  amt: {
    eyebrow: 'C-10 基本稅額 AMT',
    title: 'AMT 獨有所得項目與 regularTax 分開處理，避免混算。',
    description: '目前已覆蓋海外所得門檻、保險給付分流與境外扣抵比例上限。'
  }
};

const stampMeta = {
  eyebrow: 'calc:stamp',
  title: '印花稅快速計算',
  description: '依照憑證類型套用 0.1‰/0.4‰/1‰，讓固定比率的稅額即時計出。'
};

export function App() {
  const [page, setPage] = useState<PageKey>('nhiSupplement');
  const current = page === 'stampTax' ? stampMeta : pageMeta[page];

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="brand-kicker">Firm Tool v3.3.5</p>
          <h1>會計事務所員工輔助系統</h1>
          <p className="brand-copy">
            這是離線 Windows 桌面工具的 renderer 骨架。現在用多個 calculator 頁面驗證共用 layout、IPC contract 與年度語意。
          </p>
        </div>

        <div className="header-panel">
          <p className="header-label">目前焦點</p>
          <strong>{current.eyebrow}</strong>
          <span>Electron + SQLite + typed IPC contract</span>
        </div>
      </header>

      <section className="hero-band">
        <div>
          <p className="hero-eyebrow">{current.eyebrow}</p>
          <h2>{current.title}</h2>
        </div>
        <p className="hero-description">{current.description}</p>
      </section>

      <nav className="page-switcher" aria-label="Calculator pages">
        <button type="button" className={page === 'cit' ? 'page-chip is-active' : 'page-chip'} onClick={() => setPage('cit')}>
          C-3
        </button>
        <button
          type="button"
          className={page === 'withholding' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('withholding')}
        >
          C-5
        </button>
        <button
          type="button"
          className={page === 'payroll' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('payroll')}
        >
          C-7
        </button>
        <button
          type="button"
          className={page === 'nhiSupplement' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('nhiSupplement')}
        >
          C-8
        </button>
        <button
          type="button"
          className={page === 'overtime' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('overtime')}
        >
          C-12
        </button>
        <button
          type="button"
          className={page === 'houseLandTax' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('houseLandTax')}
        >
          C-11
        </button>
        <button
          type="button"
          className={page === 'houseTax' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('houseTax')}
        >
          house tax
        </button>
        <button
          type="button"
          className={page === 'landValueTax' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('landValueTax')}
        >
          C-15
        </button>
        <button
          type="button"
          className={page === 'stampTax' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('stampTax')}
        >
          stamp
        </button>
        <button
          type="button"
          className={page === 'deadline' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('deadline')}
        >
          D
        </button>
        <button
          type="button"
          className={page === 'companyRegistry' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('companyRegistry')}
        >
          registry
        </button>
        <button
          type="button"
          className={page === 'lawCards' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('lawCards')}
        >
          law
        </button>
        <button
          type="button"
          className={page === 'clients' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('clients')}
        >
          clients
        </button>
        <button
          type="button"
          className={page === 'residency' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('residency')}
        >
          C-16
        </button>
        <button
          type="button"
          className={page === 'retirement' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('retirement')}
        >
          C-9
        </button>
        <button
          type="button"
          className={page === 'estateGift' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('estateGift')}
        >
          C-14
        </button>
        <button type="button" className={page === 'iit' ? 'page-chip is-active' : 'page-chip'} onClick={() => setPage('iit')}>
          C-1
        </button>
        <button type="button" className={page === 'amt' ? 'page-chip is-active' : 'page-chip'} onClick={() => setPage('amt')}>
          C-10
        </button>
        <button
          type="button"
          className={page === 'cashFlow' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('cashFlow')}
        >
          C-3-B/C-4
        </button>
        <button
          type="button"
          className={page === 'schedule' ? 'page-chip is-active' : 'page-chip'}
          onClick={() => setPage('schedule')}
        >
          排程
        </button>
      </nav>

      {page === 'cit' ? <CITPage /> : null}
      {page === 'withholding' ? <WithholdingPage /> : null}
      {page === 'payroll' ? <PayrollPage /> : null}
      {page === 'nhiSupplement' ? <NhiSupplementPage /> : null}
      {page === 'overtime' ? <OvertimePage /> : null}
      {page === 'houseLandTax' ? <HouseLandTaxPage /> : null}
      {page === 'houseTax' ? <HouseTaxPage /> : null}
      {page === 'deadline' ? <DeadlinePage /> : null}
      {page === 'landValueTax' ? <LandValueTaxPage /> : null}
      {page === 'stampTax' ? <StampTaxPage /> : null}
      {page === 'companyRegistry' ? <CompanyRegistryPage /> : null}
      {page === 'lawCards' ? <LawCardsPage /> : null}
      {page === 'clients' ? <ClientsPage /> : null}
      {page === 'residency' ? <ResidencyPage /> : null}
      {page === 'retirement' ? <RetirementPage /> : null}
      {page === 'estateGift' ? <EstateGiftTaxPage /> : null}
      {page === 'iit' ? <IITPage /> : null}
      {page === 'amt' ? <AMTPage /> : null}
      {page === 'cashFlow' ? <CashFlowPage /> : null}
      {page === 'schedule' ? <SchedulePage /> : null}
    </main>
  );
}
