/**
 * Event system types for connector
 */

import type { TransactionActivity } from './transactions';

/**
 * Event types emitted by the connector
 * Use these for analytics, logging, and custom behavior
 */
export type ConnectorEvent =
    | {
          type: 'wallet:connected';
          wallet: string;
          account: string;
          timestamp: string;
      }
    | { type: 'wallet:disconnected'; timestamp: string }
    | { type: 'wallet:changed'; wallet: string; timestamp: string }
    | { type: 'account:changed'; account: string; timestamp: string }
    | {
          type: 'cluster:changed';
          cluster: string;
          previousCluster: string | null;
          timestamp: string;
      }
    | { type: 'wallets:detected'; count: number; timestamp: string }
    | { type: 'error'; error: Error; context: string; timestamp: string }
    | { type: 'connecting'; wallet: string; timestamp: string }
    | {
          type: 'connection:failed';
          wallet: string;
          error: string;
          timestamp: string;
      }
    | {
          type: 'transaction:tracked';
          signature: string;
          status: TransactionActivity['status'];
          timestamp: string;
      }
    | {
          type: 'transaction:updated';
          signature: string;
          status: TransactionActivity['status'];
          timestamp: string;
      }
    | {
          type: 'transaction:preparing';
          transaction: Uint8Array;
          size: number;
          timestamp: string;
      }
    | {
          type: 'transaction:simulated';
          success: boolean;
          computeUnits: number | null;
          timestamp: string;
      }
    | {
          type: 'transaction:signing';
          timestamp: string;
      }
    | {
          type: 'transaction:sent';
          signature: string;
          timestamp: string;
      }
    | {
          type: 'storage:reset';
          timestamp: string;
      };

/**
 * Event listener function type
 */
export type ConnectorEventListener = (event: ConnectorEvent) => void;
