import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { calculateIndividualAmt } from '../calculators/amtCalculator';
import { calculateCit } from '../calculators/citCalculator';
import { calculateEstateGiftTax } from '../calculators/estateGiftTaxCalculator';
import { calculateHouseLandTax } from '../calculators/houseLandTaxCalculator';
import { calculateHouseTax } from '../calculators/houseTaxCalculator';
import { calculateLandValueTax } from '../calculators/landValueTaxCalculator';
import { calculateIitDeductions } from '../calculators/iitCalculator';
import {
  calculateRentalWithholding,
  calculateUndistributedEarningsTax
} from '../calculators/cashFlowCalculators';
import { searchCompanyRegistry } from '../services/companyRegistryService';
import { getLawCard, searchLawCards } from '../services/lawCardsService';
import { createClient, deleteClient, listClients, updateClient } from '../services/clientsService';
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule
} from '../services/scheduleService';
import { calculateDeadline } from '../calculators/deadlineCalculator';
import { calculateNhiSupplementPremium } from '../calculators/nhiSupplementCalculator';
import { calculateOvertime } from '../calculators/overtimeCalculator';
import { calculateResidencyDays } from '../calculators/residencyCalculator';
import { calculatePayroll } from '../calculators/payrollCalculator';
import { calculateRetirementIncome } from '../calculators/retirementCalculator';
import { calculateStampTax } from '../calculators/stampTaxCalculator';
import { calculateWithholding } from '../calculators/withholdingCalculator';
import { getGradeTable } from '../services/gradeTableService';
import {
  bookmarkHistory,
  buildParamsSnapshot,
  buildStaticParamsSnapshot,
  deleteHistory,
  getHistoryDetail,
  listHistory,
  saveCalculationHistory
} from '../services/historyService';
import { getYearlyParamMap } from '../services/yearlyParamsService';
import type {
  AmtCalculationInput,
  CitCalculationInput,
  DeadlineCalculationInput,
  DbGradeTableRequest,
  EstateGiftTaxCalculationInput,
  HouseLandTaxCalculationInput,
  HouseTaxCalculationInput,
  LandValueTaxInput,
  HistoryListFilter,
  IitCalculationInput,
  ClientCreateInput,
  ClientUpdateInput,
  NhiSupplementCalculationInput,
  OvertimeCalculationInput,
  ResidencyCalculationInput,
  DbParamsRequest,
  PayrollCalculationInput,
  RetirementCalculationInput,
  WithholdingCalculationInput,
  StampTaxCalculationInput,
  LawCardSearchOptions,
  UndistributedEarningsInput,
  RentalWithholdingInput,
  ScheduleCreateInput,
  ScheduleUpdateInput
} from '../../shared/ipc-types';

export function registerHandlers(db: Database.Database): void {
  ipcMain.handle('clients:list', () => listClients(db));
  ipcMain.handle('clients:create', (_event, data: ClientCreateInput) => createClient(db, data));
  ipcMain.handle('clients:update', (_event, clientId: number, data: ClientUpdateInput) =>
    updateClient(db, clientId, data)
  );
  ipcMain.handle('clients:delete', (_event, clientId: number) => {
    deleteClient(db, clientId);
  });

  ipcMain.handle('calc:cit', (_event, input: CitCalculationInput) => {
    const result = calculateCit(db, input);
    saveCalculationHistory(db, {
      calculator: 'cit',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'TAX_CIT',
          usageContext: 'income_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });
  ipcMain.handle('calc:estate-gift-tax', (_event, input: EstateGiftTaxCalculationInput) =>
    {
      const result = calculateEstateGiftTax(db, input);
      saveCalculationHistory(db, {
        calculator: 'estate-gift-tax',
        fiscalYear: result.lookupYear,
        inputs: input,
        outputs: result,
        paramsSnapshot: buildParamsSnapshot(db, {
          paramsRequest: {
            fiscalYear: result.lookupYear,
            category: input.taxType === 'estate' ? 'TAX_ESTATE_BRACKET' : 'TAX_GIFT_BRACKET',
            usageContext: 'income_year'
          },
          paramsVersion: `${result.lookupYear}-baseline`
        })
      });
      return result;
    }
  );
  ipcMain.handle('calc:house-land-tax', (_event, input: HouseLandTaxCalculationInput) => {
    const result = calculateHouseLandTax(input);
    saveCalculationHistory(db, {
      calculator: 'house-land-tax',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-house-land-rules')
      });
    return result;
  });
  ipcMain.handle('calc:house-tax', (_event, input: HouseTaxCalculationInput) => {
    const result = calculateHouseTax(input);
    saveCalculationHistory(db, {
      calculator: 'house-tax',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-house-tax-rules')
    });
    return result;
  });
  ipcMain.handle('db:search-company', (_event, query: string) => searchCompanyRegistry(db, query));
  ipcMain.handle('db:search-law-cards', (_event, request: LawCardSearchOptions) =>
    searchLawCards(db, request.query, request.category)
  );
  ipcMain.handle('db:get-law-card', (_event, cardId: number) => getLawCard(db, cardId));
  ipcMain.handle('calc:land-value-tax', (_event, input: LandValueTaxInput) => {
    const result = calculateLandValueTax(input);
    saveCalculationHistory(db, {
      calculator: 'land-value-tax',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-land-value-rules')
    });
    return result;
  });
  ipcMain.handle('calc:nhi-supplement', (_event, input: NhiSupplementCalculationInput) => {
    const result = calculateNhiSupplementPremium(db, input);
    saveCalculationHistory(db, {
      calculator: 'nhi-supplement',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'LABOR',
          usageContext: 'effective_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });
  ipcMain.handle('calc:overtime', (_event, input: OvertimeCalculationInput) => {
    const result = calculateOvertime(input);
    saveCalculationHistory(db, {
      calculator: 'overtime',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-labor-rules')
    });
    return result;
  });
  ipcMain.handle('calc:residency', (_event, input: ResidencyCalculationInput) => {
    const result = calculateResidencyDays(input);
    saveCalculationHistory(db, {
      calculator: 'residency',
      fiscalYear: input.mode === 'calendar_year' ? (input.taxYear ?? null) : null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-residency-rules')
    });
    return result;
  });
  ipcMain.handle('calc:deadline', (_event, input: DeadlineCalculationInput) => {
    const result = calculateDeadline(db, input);
    saveCalculationHistory(db, {
      calculator: 'deadline',
      fiscalYear: Number(input.rawDeadline.slice(0, 4)),
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-deadline-rules')
    });
    return result;
  });
  ipcMain.handle('calc:retirement', (_event, input: RetirementCalculationInput) => {
    const result = calculateRetirementIncome(db, input);
    saveCalculationHistory(db, {
      calculator: 'retirement',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'TAX_IIT',
          usageContext: 'income_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });
  ipcMain.handle('calc:stamp', (_event, input: StampTaxCalculationInput) => {
    const result = calculateStampTax(input);
    saveCalculationHistory(db, {
      calculator: 'stamp',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-stamp-rules')
    });
    return result;
  });
  ipcMain.handle('calc:payroll', (_event, input: PayrollCalculationInput) => {
    const result = calculatePayroll(db, input);
    saveCalculationHistory(db, {
      calculator: 'payroll',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'LABOR',
          usageContext: 'effective_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`,
        gradeTables: ['LABOR_INS', 'NHI', 'PENSION']
      })
    });
    return result;
  });
  ipcMain.handle('calc:amt', (_event, input: AmtCalculationInput) => {
    const result = calculateIndividualAmt(db, input);
    saveCalculationHistory(db, {
      calculator: 'amt',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'TAX_AMT',
          usageContext: 'income_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });
  ipcMain.handle('calc:iit', (_event, input: IitCalculationInput) => {
    const result = calculateIitDeductions(db, input);
    saveCalculationHistory(db, {
      calculator: 'iit',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'TAX_IIT',
          usageContext: 'income_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });
  ipcMain.handle('calc:withholding', (_event, input: WithholdingCalculationInput) => {
    const result = calculateWithholding(db, input);
    saveCalculationHistory(db, {
      calculator: 'withholding',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: input.fiscalYear,
          category: 'WITHHOLD_NRA',
          usageContext: 'effective_year'
        },
        paramsVersion: `${input.fiscalYear}-baseline`
      })
    });
    return result;
  });

  ipcMain.handle('db:params', (_event, request: DbParamsRequest) => getYearlyParamMap(db, request));

  ipcMain.handle('db:grade-table', (_event, request: DbGradeTableRequest) =>
    getGradeTable(db, request.fiscalYear, request.tableType)
  );
  ipcMain.handle('history:list', (_event, filter: HistoryListFilter | undefined) => listHistory(db, filter));
  ipcMain.handle('history:get', (_event, calcId: number) => getHistoryDetail(db, calcId));
  ipcMain.handle('history:bookmark', (_event, calcId: number, flag: boolean) =>
    bookmarkHistory(db, calcId, flag)
  );
  ipcMain.handle('history:delete', (_event, calcId: number) => deleteHistory(db, calcId));

  ipcMain.handle('calc:undistributed-earnings', (_event, input: UndistributedEarningsInput) => {
    const result = calculateUndistributedEarningsTax(input);
    saveCalculationHistory(db, {
      calculator: 'undistributed-earnings',
      fiscalYear: input.fiscalYear,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-undistributed-rules')
    });
    return result;
  });

  ipcMain.handle('calc:rental-withholding', (_event, input: RentalWithholdingInput) => {
    const result = calculateRentalWithholding(input);
    saveCalculationHistory(db, {
      calculator: 'rental-withholding',
      fiscalYear: null,
      inputs: input,
      outputs: result,
      paramsSnapshot: buildStaticParamsSnapshot(db, 'static-rental-rules')
    });
    return result;
  });

  ipcMain.handle('schedule:list', (_event, clientId: number | undefined) =>
    listSchedules(db, clientId)
  );
  ipcMain.handle('schedule:create', (_event, data: ScheduleCreateInput) =>
    createSchedule(db, data)
  );
  ipcMain.handle('schedule:update', (_event, scheduleId: number, data: ScheduleUpdateInput) =>
    updateSchedule(db, scheduleId, data)
  );
  ipcMain.handle('schedule:delete', (_event, scheduleId: number) => {
    deleteSchedule(db, scheduleId);
  });
}
