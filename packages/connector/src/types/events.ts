/**
 * Event system types for connector
 */

import type { TransactionActivity, TransactionActivityStatus } from './transactions';
import type { WalletName } from './wallets';
import type { SolanaClusterId } from '@wallet-ui/core';
import type { Address } from '@solana/addresses';
import type { Signature } from '@solana/keys';

/**
 * Event types emitted by the connector
 * Use these for analytics, logging, and custom behavior
 */
export type ConnectorEvent =
    | {
          type: 'wallet:connected';
          wallet: WalletName;
          account: Address;
          timestamp: string;
      }
    | { type: 'wallet:disconnected'; timestamp: string }
    | { type: 'wallet:changed'; wallet: WalletName; timestamp: string }
    | { type: 'account:changed'; account: Address; timestamp: string }
    | {
          type: 'cluster:changed';
          cluster: SolanaClusterId;
          previousCluster: SolanaClusterId | null;
          timestamp: string;
      }
    | { type: 'wallets:detected'; count: number; timestamp: string }
    | { type: 'error'; error: Error; context: string; timestamp: string }
    | { type: 'connecting'; wallet: WalletName; timestamp: string }
    | {
          type: 'connection:failed';
          wallet: WalletName;
          error: string;
          timestamp: string;
      }
    | {
          type: 'transaction:tracked';
          signature: Signature;
          status: TransactionActivityStatus;
          timestamp: string;
      }
    | {
          type: 'transaction:updated';
          signature: Signature;
          status: TransactionActivityStatus;
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
          signature: Signature;
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
