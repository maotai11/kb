import fs from 'node:fs';
import type Database from 'better-sqlite3';
import AdmZip from 'adm-zip';

type FtuManifestContentType = 'yearly_params' | 'grade_tables' | 'law_cards';

type FtuManifestContent = {
  type: FtuManifestContentType;
  file: string;
};

type FtuManifest = {
  version: string;
  min_app_version: string;
  contents: FtuManifestContent[];
};

type YearlyParamPayload = {
  fiscalYear: number;
  category: string;
  paramKey: string;
  paramValue?: number | null;
  paramText?: string | null;
  unit?: string | null;
  sourceLaw?: string | null;
  officialAnnouncement?: string | null;
  announcementDate?: string | null;
  isConfirmed?: number;
  usageContext: 'income_year' | 'effective_year';
  filingYear?: number | null;
  effectiveDate?: string | null;
  note?: string | null;
  updatedBy?: string | null;
};

type GradeTablePayload = {
  fiscalYear: number;
  tableType: string;
  usageContext: 'income_year' | 'effective_year';
  versionTag: string;
  effectiveDate: string;
  isConfirmed: number;
  tableJson: string;
};

type LawCardPayload = {
  cardId?: number | null;
  lawName: string;
  article?: string | null;
  category: string;
  summary?: string | null;
  content?: string | null;
  searchKeywords?: string | null;
  isActive?: number;
  supersededBy?: number | null;
};

export function importFtuPack(
  db: Database.Database,
  filePath: string,
  appVersion: string
): void {
  if (!fs.existsSync(filePath)) {
    throw new Error('FTU pack not found');
  }

  const zip = new AdmZip(filePath);
  const manifest = readManifest(zip);

  if (compareVersions(appVersion, manifest.min_app_version) < 0) {
    throw new Error(`FTU pack requires app version >= ${manifest.min_app_version}`);
  }

  const payloads = readContents(zip, manifest.contents);
  validateTaxBracketDiffs(payloads.yearlyParams);

  const insertYearlyParam = db.prepare(`
    INSERT OR REPLACE INTO yearly_params (
      fiscal_year, category, param_key, param_value, param_text, unit, source_law,
      official_announcement, announcement_date, is_confirmed, usage_context,
      filing_year, effective_date, note, updated_by
    ) VALUES (
      @fiscalYear, @category, @paramKey, @paramValue, @paramText, @unit, @sourceLaw,
      @officialAnnouncement, @announcementDate, @isConfirmed, @usageContext,
      @filingYear, @effectiveDate, @note, @updatedBy
    )
  `);

  const insertGradeTable = db.prepare(`
    INSERT OR REPLACE INTO grade_tables (
      fiscal_year, table_type, usage_context, version_tag, effective_date, is_confirmed, table_json
    ) VALUES (
      @fiscalYear, @tableType, @usageContext, @versionTag, @effectiveDate, @isConfirmed, @tableJson
    )
  `);

  const insertLawCard = db.prepare(`
    INSERT OR REPLACE INTO law_cards (
      card_id, law_name, article, category, summary, content, search_keywords, is_active, superseded_by
    ) VALUES (
      @cardId, @lawName, @article, @category, @summary, @content, @searchKeywords, @isActive, @supersededBy
    )
  `);

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_log (source, event, detail)
    VALUES (@source, @event, @detail)
  `);

  const transaction = db.transaction(() => {
    for (const param of payloads.yearlyParams) {
      insertYearlyParam.run({
        fiscalYear: param.fiscalYear,
        category: param.category,
        paramKey: param.paramKey,
        paramValue: param.paramValue ?? null,
        paramText: param.paramText ?? null,
        unit: param.unit ?? null,
        sourceLaw: param.sourceLaw ?? null,
        officialAnnouncement: param.officialAnnouncement ?? null,
        announcementDate: param.announcementDate ?? null,
        isConfirmed: param.isConfirmed ?? 0,
        usageContext: param.usageContext,
        filingYear: param.filingYear ?? null,
        effectiveDate: param.effectiveDate ?? null,
        note: param.note ?? null,
        updatedBy: param.updatedBy ?? null
      });
    }

    for (const table of payloads.gradeTables) {
      insertGradeTable.run({
        fiscalYear: table.fiscalYear,
        tableType: table.tableType,
        usageContext: table.usageContext,
        versionTag: table.versionTag,
        effectiveDate: table.effectiveDate,
        isConfirmed: table.isConfirmed,
        tableJson: table.tableJson
      });
    }

    for (const card of payloads.lawCards) {
      insertLawCard.run({
        cardId: card.cardId ?? null,
        lawName: card.lawName,
        article: card.article ?? null,
        category: card.category,
        summary: card.summary ?? null,
        content: card.content ?? null,
        searchKeywords: card.searchKeywords ?? null,
        isActive: card.isActive ?? 1,
        supersededBy: card.supersededBy ?? null
      });
    }

    insertAuditLog.run({
      source: 'ftu-pack',
      event: 'import',
      detail: JSON.stringify({
        version: manifest.version,
        minAppVersion: manifest.min_app_version,
        contents: manifest.contents.map((entry) => entry.type)
      })
    });
  });

  transaction();
}

function readManifest(zip: AdmZip): FtuManifest {
  const entry = zip.getEntry('manifest.json');
  if (!entry) {
    throw new Error('manifest.json missing from FTU pack');
  }

  const payload = entry.getData().toString('utf-8');
  return JSON.parse(payload) as FtuManifest;
}

function readContents(
  zip: AdmZip,
  contents: FtuManifestContent[]
): {
  yearlyParams: YearlyParamPayload[];
  gradeTables: GradeTablePayload[];
  lawCards: LawCardPayload[];
} {
  const result = {
    yearlyParams: [] as YearlyParamPayload[],
    gradeTables: [] as GradeTablePayload[],
    lawCards: [] as LawCardPayload[]
  };

  for (const content of contents) {
    const entry = zip.getEntry(content.file);
    if (!entry) {
      throw new Error(`FTU pack is missing ${content.file}`);
    }

    const data = JSON.parse(entry.getData().toString('utf-8'));

    switch (content.type) {
      case 'yearly_params':
        result.yearlyParams = Array.isArray(data) ? data : [];
        break;
      case 'grade_tables':
        result.gradeTables = Array.isArray(data) ? data : [];
        break;
      case 'law_cards':
        result.lawCards = Array.isArray(data) ? data : [];
        break;
      default:
        throw new Error(`Unsupported FTU content type: ${(content as unknown as { type: string }).type}`);
    }
  }

  return result;
}

function validateTaxBracketDiffs(params: YearlyParamPayload[]): void {
  const relevantCategories = ['TAX_ESTATE_BRACKET', 'TAX_GIFT_BRACKET'];
  const grouped = params.reduce<Record<string, YearlyParamPayload[]>>((acc, param) => {
    if (!relevantCategories.includes(param.category)) {
      return acc;
    }

    const key = `${param.fiscalYear}-${param.category}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(param);
    return acc;
  }, {});

  for (const [key, group] of Object.entries(grouped)) {
    const paramMap = new Map<string, number>();
    for (const param of group) {
      if (param.paramValue !== undefined && param.paramValue !== null) {
        paramMap.set(param.paramKey, Number(param.paramValue));
      }
    }

    const requiredKeys = [
      'tier1_ceil',
      'tier2_ceil',
      'tier1_rate',
      'tier2_rate',
      'tier3_rate',
      'tier2_diff',
      'tier3_diff'
    ];

    if (!requiredKeys.every((keyName) => paramMap.has(keyName))) {
      continue;
    }

    const tier1Ceil = paramMap.get('tier1_ceil')!;
    const tier2Ceil = paramMap.get('tier2_ceil')!;
    const tier1Rate = paramMap.get('tier1_rate')!;
    const tier2Rate = paramMap.get('tier2_rate')!;
    const tier3Rate = paramMap.get('tier3_rate')!;
    const tier2Diff = paramMap.get('tier2_diff')!;
    const tier3Diff = paramMap.get('tier3_diff')!;

    const expectedTier2Diff = tier1Ceil * (tier2Rate - tier1Rate);
    const expectedTier3Diff = tier2Ceil * tier3Rate - (tier1Ceil * tier1Rate + (tier2Ceil - tier1Ceil) * tier2Rate);

    if (!isApproximatelyEqual(tier2Diff, expectedTier2Diff)) {
      throw new Error(`tier2_diff mismatch for ${key}`);
    }

    if (!isApproximatelyEqual(tier3Diff, expectedTier3Diff)) {
      throw new Error(`tier3_diff mismatch for ${key}`);
    }
  }
}

function isApproximatelyEqual(value: number, expected: number): boolean {
  return Math.abs(value - expected) < 1e-6;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((token) => Number(token) || 0);
  const rightParts = right.split('.').map((token) => Number(token) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let i = 0; i < length; i += 1) {
    const leftPart = leftParts[i] ?? 0;
    const rightPart = rightParts[i] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}
