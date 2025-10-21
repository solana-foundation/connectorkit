/**
 * @solana/connector-debugger - Code Snippet Generator
 *
 * Generates ready-to-use code snippets for creating and using
 * Address Lookup Tables based on analysis.
 */

/**
 * Generate code snippet for creating an Address Lookup Table
 *
 * @param addresses - Array of addresses to include in the ALT
 * @returns Copy-paste ready TypeScript code
 */
export function generateALTCreationCode(addresses: string[]): string {
    const addressList = addresses.map(addr => `  new PublicKey("${addr}")`).join(',\n');

    return `// Create Address Lookup Table
import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

// Your addresses to optimize
const addresses = [
${addressList}
];

// Create the lookup table
async function createLookupTable(
  connection: Connection,
  payer: Keypair
) {
  // Get recent slot for table creation
  const slot = await connection.getSlot();

  // Create lookup table instruction
  const [createLUTInstruction, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: slot,
    });

  console.log('Lookup Table Address:', lookupTableAddress.toBase58());

  // Send transaction to create the table
  const { blockhash } = await connection.getLatestBlockhash();
  
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [createLUTInstruction],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);

  const signature = await connection.sendTransaction(transaction);
  await connection.confirmTransaction(signature);

  console.log('Lookup table created:', signature);

  // Wait for table to activate (~1 slot)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Extend the lookup table with addresses
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    lookupTable: lookupTableAddress,
    authority: payer.publicKey,
    payer: payer.publicKey,
    addresses,
  });

  const extendMessage = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [extendInstruction],
  }).compileToV0Message();

  const extendTx = new VersionedTransaction(extendMessage);
  extendTx.sign([payer]);

  const extendSig = await connection.sendTransaction(extendTx);
  await connection.confirmTransaction(extendSig);

  console.log('Addresses added to lookup table:', extendSig);

  return lookupTableAddress;
}`;
}

/**
 * Generate code snippet for using an existing ALT
 *
 * @param lookupTableAddress - Address of the ALT to use
 * @returns Copy-paste ready TypeScript code
 */
export function generateALTUsageCode(lookupTableAddress: string): string {
    return `// Use Address Lookup Table in transaction
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

const lookupTableAddress = new PublicKey('${lookupTableAddress}');

async function sendTransactionWithALT(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[]
) {
  // Fetch the lookup table account
  const lookupTableAccount = await connection
    .getAddressLookupTable(lookupTableAddress)
    .then(res => res.value);

  if (!lookupTableAccount) {
    throw new Error('Lookup table not found');
  }

  // Create v0 transaction with lookup table
  const { blockhash } = await connection.getLatestBlockhash();
  
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([lookupTableAccount]);
  
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);

  // Send and confirm
  const signature = await connection.sendTransaction(transaction);
  await connection.confirmTransaction(signature);

  console.log('Transaction with ALT:', signature);
  return signature;
}`;
}

/**
 * Generate simplified code for quick copy-paste
 *
 * @param addresses - Addresses for the ALT
 * @returns Minimal code snippet
 */
export function generateQuickALTCode(addresses: string[]): string {
    const addressList = addresses
        .slice(0, 10)
        .map(addr => `  new PublicKey("${addr}")`)
        .join(',\n');
    const hasMore = addresses.length > 10;

    return `// Quick ALT Setup
const addresses = [
${addressList}${hasMore ? ',\n  // ... and ' + (addresses.length - 10) + ' more' : ''}
];

// 1. Create lookup table
const slot = await connection.getSlot();
const [createIx, lutAddress] = 
  AddressLookupTableProgram.createLookupTable({
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    recentSlot: slot,
  });

// 2. Send create transaction
await sendTransaction([createIx]);

// 3. Wait ~1 second for activation
await sleep(1000);

// 4. Extend with addresses
const extendIx = AddressLookupTableProgram.extendLookupTable({
  lookupTable: lutAddress,
  authority: wallet.publicKey,
  payer: wallet.publicKey,
  addresses,
});

await sendTransaction([extendIx]);

// 5. Use in your transactions
const lookupTable = await connection
  .getAddressLookupTable(lutAddress)
  .then(res => res.value);

const message = new TransactionMessage({
  payerKey: wallet.publicKey,
  recentBlockhash: blockhash,
  instructions: yourInstructions,
}).compileToV0Message([lookupTable]); // ← Add lookup table here`;
}

/**
 * Generate explanation text for ALT benefits
 *
 * @param bytesSaved - Estimated bytes saved
 * @param percentReduction - Percentage reduction
 * @returns Explanation text
 */
export function generateALTExplanation(bytesSaved: number, percentReduction: number): string {
    return `Address Lookup Tables (ALTs) optimize transaction size by replacing 32-byte addresses with 1-byte indices.

**Your Savings:**
- ${bytesSaved} bytes smaller (${percentReduction.toFixed(1)}% reduction)
- Fits more instructions in one transaction
- Reduces network bandwidth
- Same 5000 lamports transaction fee

**How it works:**
1. Create a lookup table once (one-time cost)
2. Add your frequently used addresses
3. Reference addresses by index instead of full address
4. Each address: 32 bytes → 1 byte (31 bytes saved)

**Best for:**
- Transactions with many repeated addresses
- Multi-instruction transactions
- Programs you interact with frequently
- Bundle transactions approaching the 1232 byte limit`;
}
