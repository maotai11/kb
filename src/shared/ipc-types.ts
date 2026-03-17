export type UsageContext = 'income_year' | 'effective_year';

export type DbParamsRequest = {
  fiscalYear: number;
  category: string;
  usageContext: UsageContext;
};

export type DbGradeTableRequest = {
  fiscalYear: number;
  tableType: string;
};

export type GradeRow = {
  grade: number;
  minSalary: number;
  maxSalary: number | null;
  insuredSalary: number;
};

export type GradeTablePayload = {
  version: string;
  rows: GradeRow[];
};

export type GradeTableSnapshotMeta = {
  fiscal_year: number;
  source: string;
  record_count: number;
};

export type ParamsSnapshotUsedParam = {
  value: number | string | null;
  is_confirmed: boolean;
};

export type ParamsSnapshot = {
  snapshot_time: string;
  params_version: string;
  used_params: Record<string, ParamsSnapshotUsedParam>;
  used_grade_tables?: Record<string, GradeTableSnapshotMeta>;
};

export type HistoryListFilter = {
  calculator?: string;
  bookmarkedOnly?: boolean;
  limit?: number;
};

export type HistoryListItem = {
  calcId: number;
  calculator: string;
  fiscalYear: number | null;
  createdAt: string;
  isBookmarked: boolean;
};

export type HistoryDetail = {
  calcId: number;
  calculator: string;
  fiscalYear: number | null;
  inputs: unknown;
  outputs: unknown;
  paramsSnapshot: ParamsSnapshot | null;
  gradeSnapshot: unknown | null;
  createdAt: string;
  isBookmarked: boolean;
};

export type CompanyRegistryRow = {
  rowid: number;
  tax_id: string;
  company_name: string;
  status: string | null;
  representative: string | null;
  address: string | null;
  capital: number | null;
};

export type DeadlineCalculationInput = {
  rawDeadline: string;
};

export type DeadlineAdjustmentStep = {
  date: string;
  reason: 'sunday' | 'saturday' | 'holiday';
  holidayName: string | null;
};

export type DeadlineCalculationResult = {
  rawDeadline: string;
  adjustedDeadline: string;
  adjustmentDays: number;
  steps: DeadlineAdjustmentStep[];
};

export type AmtCalculationInput = {
  fiscalYear: number;
  regularTax: number;
  netIncome: number;
  overseasIncome: number;
  insuranceDeathBenefit: number;
  insuranceNonDeath: number;
  privateFundGain: number;
  nonCashDonation: number;
  foreignTaxPaid: number;
};

export type AmtCalculationResult = {
  amtBase: number;
  amtTax: number;
  regularTaxForAmt: number;
  overseasIncomeIncluded: number;
  insuranceDeathBenefitIncluded: number;
  insuranceNonDeathIncluded: number;
  privateFundGainIncluded: number;
  nonCashDonationIncluded: number;
  foreignTaxCreditLimit: number;
  foreignTaxCreditUsed: number;
  additionalAmtTax: number;
};

export type CitCalculationInput = {
  fiscalYear: number;
  taxableIncome: number;
};

export type CitCalculationResult = {
  fiscalYear: number;
  taxableIncome: number;
  exemptionThreshold: number;
  taxRate: number;
  normalTax: number;
  excessHalfTax: number;
  taxPayable: number;
  appliedRule: 'exempt' | 'normal' | 'smooth';
};

export type EstateGiftTaxCalculationInput = {
  taxType: 'estate' | 'gift';
  eventDate: string;
  netTaxableAmount: number;
};

export type EstateGiftTaxCalculationResult = {
  taxType: 'estate' | 'gift';
  eventDate: string;
  lookupYear: 113 | 114;
  netTaxableAmount: number;
  rate: number;
  progressiveDifference: number;
  taxPayable: number;
  bracketLabel: 'tier1' | 'tier2' | 'tier3';
  bracketCeilings: {
    tier1: number;
    tier2: number;
  };
};

export type HouseLandTaxCalculationInput = {
  acquisitionMethod: 'self_built' | 'purchase' | 'presale' | 'inheritance' | 'gift';
  landAcquisitionDate?: string;
  usageLicenseDate?: string;
  acquisitionDate?: string;
  saleDate: string;
  selfUseEligible?: boolean;
  profitAmount: number;
  replacementPurchaseDate?: string;
  oldSalePrice?: number;
  newPurchasePrice?: number;
};

export type HouseLandTaxCalculationResult = {
  acquisitionMethod: HouseLandTaxCalculationInput['acquisitionMethod'];
  holdStartDate: string;
  saleDate: string;
  holdYears: number;
  holdMonths: number;
  rate: number;
  taxableGain: number;
  taxPayable: number;
  selfUseApplied: boolean;
  repurchase: {
    deadline: string | null;
    withinTwoYears: boolean;
    refundType: 'none' | 'full' | 'partial';
    refundAmount: number;
  };
};

export type LandValueTaxInput = {
  assessedValue: number;
  psUnit: number;
  selfUse?: boolean;
};

export type LandValueTaxStep = {
  taxable: number;
  rate: number;
  taxAmount: number;
};

export type LandValueTaxResult = {
  assessedValue: number;
  psUnit: number;
  tax: number;
  steps: LandValueTaxStep[];
};

export type NhiSupplementCalculationInput = {
  fiscalYear: number;
  insuredSalary: number;
  currentBonus: number;
  ytdBonusPaid: number;
};

export type NhiSupplementCalculationResult = {
  fiscalYear: number;
  rate: number;
  threshold: number;
  thresholdReached: boolean;
  ytdTotalBonus: number;
  taxableAmount: number;
  cappedTaxableAmount: number;
  supplementPremium: number;
};

export type OvertimeCalculationInput = {
  monthlySalary: number;
  hours: number;
  dayType: 'weekday' | 'rest_day' | 'holiday';
};

export type OvertimeCalculationResult = {
  dayType: OvertimeCalculationInput['dayType'];
  monthlySalary: number;
  hours: number;
  baseHourlyWage: number;
  tier1Hours: number;
  tier2Hours: number;
  tier1Multiplier: number;
  tier2Multiplier: number;
  tier1Pay: number;
  tier2Pay: number;
  overtimePay: number;
  note: string;
};

export type PayrollCalculationInput = {
  fiscalYear: number;
  salary: number;
  dependentsCount: number;
  occupationalAccidentRate: number;
  voluntaryPensionRate: number;
};

export type PayrollCalculationResult = {
  fiscalYear: number;
  gradeTableVersion: string;
  paramsVersion: string;
  insuredSalaries: {
    laborIns: number;
    nhi: number;
    pension: number;
  };
  employeeContribution: {
    laborInsurance: number;
    healthInsurance: number;
    pension: number;
  };
  employerContribution: {
    laborInsurance: number;
    occupationalAccident: number;
    healthInsurance: number;
    healthInsuranceDependents: number;
    pension: number;
  };
};

export type ResidencyStayInput = {
  entryDate: string;
  departureDate: string;
};

export type ResidencyCalculationInput = {
  mode: 'calendar_year' | 'rolling_12m';
  taxYear?: number;
  referenceDate?: string;
  stays: ResidencyStayInput[];
};

export type ResidencyCalculationResult = {
  mode: ResidencyCalculationInput['mode'];
  periodStart: string;
  periodEnd: string;
  lawBasis: string;
  totalDays: number;
  isResident: boolean;
};

export type RetirementCalculationInput = {
  fiscalYear: number;
  paymentType: 'annuity' | 'lump';
  yearsOfService: number;
  totalAmount: number;
};

type RetirementCalculationBase = {
  fiscalYear: number;
  paymentType: RetirementCalculationInput['paymentType'];
  yearsOfService: number;
  totalAmount: number;
};

type RetirementCalculationSuccess = RetirementCalculationBase & {
  annualExempt: number;
  tier1Amount: number;
  tier2Amount: number;
  taxableAmount: number;
  appliedTier: 'annuity' | 'tier1' | 'tier2' | 'tier3';
  error: null;
};

type RetirementCalculationFailure = RetirementCalculationBase & {
  annualExempt: null;
  tier1Amount: null;
  tier2Amount: null;
  taxableAmount: null;
  appliedTier: null;
  error: string;
};

export type RetirementCalculationResult =
  | RetirementCalculationSuccess
  | RetirementCalculationFailure;

export type WithholdingCalculationInput = {
  fiscalYear: number;
  incomeType: 'salary' | 'dividend' | 'interest' | 'service_fee' | 'rent' | 'other';
  payerType?: 'individual' | 'corporation';
  landlordType?: 'individual' | 'corporation';
  recipientResidency?: 'resident' | 'nonresident';
  amount: number;
};

export type WithholdingCalculationResult = {
  fiscalYear: number;
  incomeType: WithholdingCalculationInput['incomeType'];
  withholding: number;
  taxRate: number;
  note: string;
};

export type StampTaxCertificateType = 'cashReceipt' | 'contract' | 'realEstate' | 'loan';

export type StampTaxCalculationInput = {
  certificateType: StampTaxCertificateType;
  amount: number;
};

export type StampTaxCalculationResult = {
  certificateType: StampTaxCertificateType;
  certificateLabel: string;
  amount: number;
  ratePerThousand: number;
  rateDecimal: number;
  tax: number;
};

export type HouseTaxUsageType =
  | 'self_use'
  | 'non_self_use'
  | 'business'
  | 'other_non_residential';

export type HouseTaxCalculationInput = {
  houseValue: number;
  usageType: HouseTaxUsageType;
  rate?: number;
};

export type HouseTaxCalculationResult = {
  houseValue: number;
  usageType: HouseTaxUsageType;
  rate: number;
  tax: number;
};

export type IitChildInput = {
  id: string;
  age: number;
  birthOrderAmongChildren: number;
};

export type IitCalculationInput = {
  fiscalYear: number;
  children: IitChildInput[];
  testTaxRate: number;
  testNetIncome: number;
  applyLongTermCareDeduction: boolean;
  exemptionCount?: number;
  filingStatus?: 'single' | 'married';
  salaryIncome?: number;
  householdSize?: number;
  dividendIncome?: number;
  withholdingCredit?: number;
  overseasIncome?: number;
  insuranceDeathBenefit?: number;
  insuranceNonDeath?: number;
  privateFundGain?: number;
  nonCashDonation?: number;
  foreignTaxPaid?: number;
};

export type IitDividendMethodResult = {
  taxableNetIncome: number;
  progressiveTax: number;
  dividendCredit: number;
  withholdingCredit: number;
  regularTax: number;
  dividendFlatTax: number;
  totalTax: number;
};

export type IitDeductionResult = {
  fiscalYear: number;
  preschoolDeduction: number;
  preschoolEligibleChildren: Array<{
    id: string;
    birthOrderAmongChildren: number;
    deduction: number;
  }>;
  longTermCareDeduction: number;
  longTermCareExcluded: boolean;
  exemptionTotal: number;
  standardDeduction: number;
  salaryDeduction: number;
  basicLivingExpenseDifference: number;
  taxableNetIncome: number;
  progressiveTax: number;
  dividendIncome: number;
  withholdingCredit: number;
  dividendMethodA: IitDividendMethodResult;
  dividendMethodB: IitDividendMethodResult;
  recommendedDividendMethod: 'A' | 'B';
  selectedDividendMethod: 'A' | 'B';
  regularTax: number;
  amt: AmtCalculationResult;
};

export type LawCardSummary = {
  cardId: number;
  lawName: string;
  article: string | null;
  category: string;
  summary: string | null;
  isActive: boolean;
  isSuperseded: boolean;
};

export type LawCardDetail = {
  cardId: number;
  lawName: string;
  article: string | null;
  category: string;
  summary: string | null;
  content: string | null;
  searchKeywords: string | null;
  isActive: boolean;
  supersededBy: number | null;
};

export type LawCardSearchOptions = {
  query: string;
  category?: string;
};

export type ClientRow = {
  client_id: number;
  tax_id: string;
  client_name: string;
  client_type: string | null;
  fiscal_year_end: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export type ClientCreateInput = {
  taxId: string;
  clientName: string;
  clientType?: string | null;
  fiscalYearEnd?: string | null;
  notes?: string | null;
};

export type ClientUpdateInput = ClientCreateInput;

export type UndistributedEarningsInput = {
  fiscalYear: number;
  earnings: number;
};

export type UndistributedEarningsResult = {
  undistributedTax: number;
  filingYear: number;
  filingDeadline: string;
};

export type RentalWithholdingInput = {
  netDesired: number;
  landlordType: 'individual' | 'corporation';
  payerType: 'individual' | 'corporation';
};

export type RentalWithholdingResult = {
  withholding: number;
  gross?: number;
  nhi?: number;
  note?: string;
};

export type ScheduleRow = {
  schedule_id: number;
  client_id: number | null;
  calculator: string;
  raw_deadline: string;
  adjusted_deadline: string | null;
  notes: string | null;
  is_done: number;
  created_at: string;
};

export type ScheduleCreateInput = {
  clientId?: number | null;
  calculator: string;
  rawDeadline: string;
  notes?: string | null;
};

export type ScheduleUpdateInput = {
  notes?: string | null;
  isDone?: boolean;
};

export type FirmApi = {
  calc: {
    cit: (input: CitCalculationInput) => Promise<CitCalculationResult>;
    estateGiftTax: (input: EstateGiftTaxCalculationInput) => Promise<EstateGiftTaxCalculationResult>;
    nhiSupplement: (input: NhiSupplementCalculationInput) => Promise<NhiSupplementCalculationResult>;
    overtime: (input: OvertimeCalculationInput) => Promise<OvertimeCalculationResult>;
    houseLandTax: (input: HouseLandTaxCalculationInput) => Promise<HouseLandTaxCalculationResult>;
    houseTax: (input: HouseTaxCalculationInput) => Promise<HouseTaxCalculationResult>;
    landValueTax: (input: LandValueTaxInput) => Promise<LandValueTaxResult>;
    residency: (input: ResidencyCalculationInput) => Promise<ResidencyCalculationResult>;
    deadline: (input: DeadlineCalculationInput) => Promise<DeadlineCalculationResult>;
    retirement: (input: RetirementCalculationInput) => Promise<RetirementCalculationResult>;
    payroll: (input: PayrollCalculationInput) => Promise<PayrollCalculationResult>;
    withholding: (input: WithholdingCalculationInput) => Promise<WithholdingCalculationResult>;
    iit: (input: IitCalculationInput) => Promise<IitDeductionResult>;
    amt: (input: AmtCalculationInput) => Promise<AmtCalculationResult>;
    stamp: (input: StampTaxCalculationInput) => Promise<StampTaxCalculationResult>;
    undistributedEarnings: (input: UndistributedEarningsInput) => Promise<UndistributedEarningsResult>;
    rentalWithholding: (input: RentalWithholdingInput) => Promise<RentalWithholdingResult>;
  };
  db: {
    getParams: (request: DbParamsRequest) => Promise<Record<string, number | string | null>>;
    getGradeTable: (request: DbGradeTableRequest) => Promise<GradeTablePayload>;
    searchCompany: (query: string) => Promise<CompanyRegistryRow[]>;
    searchLawCards: (query: string, category?: string) => Promise<LawCardSummary[]>;
    getLawCard: (cardId: number) => Promise<LawCardDetail | null>;
  };
  clients: {
    list: () => Promise<ClientRow[]>;
    create: (input: ClientCreateInput) => Promise<ClientRow>;
    update: (clientId: number, input: ClientUpdateInput) => Promise<ClientRow>;
    delete: (clientId: number) => Promise<void>;
  };
  history: {
    list: (filter?: HistoryListFilter) => Promise<HistoryListItem[]>;
    get: (calcId: number) => Promise<HistoryDetail | null>;
    bookmark: (calcId: number, flag: boolean) => Promise<{ calcId: number; isBookmarked: boolean }>;
    delete: (calcId: number) => Promise<{ deleted: boolean }>;
  };
  schedule: {
    list: (clientId?: number) => Promise<ScheduleRow[]>;
    create: (data: ScheduleCreateInput) => Promise<ScheduleRow>;
    update: (scheduleId: number, data: ScheduleUpdateInput) => Promise<ScheduleRow>;
    delete: (scheduleId: number) => Promise<void>;
  };
  system: {
    ping: () => string;
  };
};
