import type { FirmApi } from './ipc-types';

declare global {
  interface Window {
    firmAPI: FirmApi;
  }
}

export {};
