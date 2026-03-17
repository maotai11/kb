import { contextBridge, ipcRenderer } from 'electron';
import type { FirmApi } from '../shared/ipc-types';

const firmApi: FirmApi = {
  calc: {
    cit: (input) => ipcRenderer.invoke('calc:cit', input),
    estateGiftTax: (input) => ipcRenderer.invoke('calc:estate-gift-tax', input),
    nhiSupplement: (input) => ipcRenderer.invoke('calc:nhi-supplement', input),
    overtime: (input) => ipcRenderer.invoke('calc:overtime', input),
    houseLandTax: (input) => ipcRenderer.invoke('calc:house-land-tax', input),
    houseTax: (input) => ipcRenderer.invoke('calc:house-tax', input),
    landValueTax: (input) => ipcRenderer.invoke('calc:land-value-tax', input),
    residency: (input) => ipcRenderer.invoke('calc:residency', input),
    deadline: (input) => ipcRenderer.invoke('calc:deadline', input),
    retirement: (input) => ipcRenderer.invoke('calc:retirement', input),
    payroll: (input) => ipcRenderer.invoke('calc:payroll', input),
    withholding: (input) => ipcRenderer.invoke('calc:withholding', input),
    iit: (input) => ipcRenderer.invoke('calc:iit', input),
    amt: (input) => ipcRenderer.invoke('calc:amt', input),
    stamp: (input) => ipcRenderer.invoke('calc:stamp', input),
    undistributedEarnings: (input) => ipcRenderer.invoke('calc:undistributed-earnings', input),
    rentalWithholding: (input) => ipcRenderer.invoke('calc:rental-withholding', input)
  },
  db: {
    getParams: (request) => ipcRenderer.invoke('db:params', request),
    getGradeTable: (request) => ipcRenderer.invoke('db:grade-table', request),
    searchCompany: (query: string) => ipcRenderer.invoke('db:search-company', query),
    searchLawCards: (query: string, category?: string) =>
      ipcRenderer.invoke('db:search-law-cards', { query, category }),
    getLawCard: (cardId: number) => ipcRenderer.invoke('db:get-law-card', cardId)
  },
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    create: (data) => ipcRenderer.invoke('clients:create', data),
    update: (clientId, data) => ipcRenderer.invoke('clients:update', clientId, data),
    delete: (clientId) => ipcRenderer.invoke('clients:delete', clientId)
  },
  history: {
    list: (filter) => ipcRenderer.invoke('history:list', filter),
    get: (calcId) => ipcRenderer.invoke('history:get', calcId),
    bookmark: (calcId, flag) => ipcRenderer.invoke('history:bookmark', calcId, flag),
    delete: (calcId) => ipcRenderer.invoke('history:delete', calcId)
  },
  schedule: {
    list: (clientId) => ipcRenderer.invoke('schedule:list', clientId),
    create: (data) => ipcRenderer.invoke('schedule:create', data),
    update: (scheduleId, data) => ipcRenderer.invoke('schedule:update', scheduleId, data),
    delete: (scheduleId) => ipcRenderer.invoke('schedule:delete', scheduleId)
  },
  system: {
    ping: () => 'pong'
  }
};

contextBridge.exposeInMainWorld('firmAPI', firmApi);
