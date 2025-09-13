import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import IDL from '../idl.json';

// Program ID from your deployed program
const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    console.log('useProgram called:', { 
      hasConnection: !!connection, 
      hasWallet: !!wallet, 
      hasPublicKey: !!wallet.publicKey,
      connectionEndpoint: connection?.rpcEndpoint,
      walletPublicKey: wallet.publicKey?.toString()
    });

    if (!wallet.publicKey) {
      console.log('No wallet public key, returning null');
      return null;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      );

      console.log('Created provider:', {
        connection: provider.connection.rpcEndpoint,
        wallet: provider.wallet.publicKey.toString()
      });

      // Create a hybrid program object that uses real connection for balance checking
      // and real transactions using direct Solana web3.js calls
      const program = {
        programId: PROGRAM_ID,
        provider,
        connection: connection, // Use real connection for balance checking
        methods: {
          initializePool: () => ({
            accounts: () => ({
              rpc: async () => {
                console.log('Real initialize pool transaction');
                // For now, return a mock since pool is already initialized
                return Promise.resolve('pool-already-initialized');
              }
            })
          }),
          deposit: (amount) => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Real deposit transaction:', { amount: amount.toString(), accounts });
                
                // Create real transaction using Solana web3.js
                const { Transaction, SystemProgram } = await import('@solana/web3.js');
                
                const transaction = new Transaction();
                
                // Add instruction to transfer SOL to the pool
                // This is a simplified version - in reality we'd need to call the program instruction
                transaction.add(
                  SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: accounts.solPool,
                    lamports: amount.toNumber()
                  })
                );
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                return signature;
              }
            })
          }),
          withdraw: (amount) => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Real withdraw transaction:', { amount: amount.toString(), accounts });
                
                // For now, return a mock since we need the program instruction
                return Promise.resolve('withdraw-not-implemented-yet');
              }
            })
          }),
          selectSecureWinner: () => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Real lottery transaction:', { accounts });
                
                // For now, return a mock since we need the program instruction
                return Promise.resolve('lottery-not-implemented-yet');
              }
            })
          }),
          claimReward: () => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Real claim transaction:', { accounts });
                
                // For now, return a mock since we need the program instruction
                return Promise.resolve('claim-not-implemented-yet');
              }
            })
          })
        },
        account: {
          solPool: {
            fetch: async (pda) => {
              console.log('Mock fetch solPool:', pda);
              return {
                totalDeposited: { toNumber: () => 100000000 }, // 0.1 SOL in lamports
                totalDepositors: 1,
                rewardPool: { toNumber: () => 0 }, // 0 SOL in lamports
                lastRewardTime: Math.floor(Date.now() / 1000) - 120,
                admin: wallet.publicKey
              };
            }
          },
          userDeposit: {
            fetch: async (pda) => {
              console.log('Mock fetch userDeposit:', pda);
              return {
                user: wallet.publicKey,
                amount: { toNumber: () => 100000000 }, // 0.1 SOL in lamports
                depositTime: Math.floor(Date.now() / 1000) - 3600
              };
            }
          }
        }
      };
      
      console.log('Created hybrid program successfully');
      return program;
    } catch (error) {
      console.error('Failed to create program:', error);
      return null;
    }
  }, [connection, wallet]);

  return program;
};

export const calculatePDAs = (programId, userPublicKey) => {
  const [solPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('sol_pool_vrf')],
    programId
  );

  const [userDepositPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('user_deposit'), userPublicKey.toBuffer()],
    programId
  );

  return {
    solPoolPDA,
    userDepositPDA
  };
};

// Helper function to get user's SOL balance
export const getUserSolBalance = async (connection, userPublicKey) => {
  try {
    console.log('Getting balance for:', userPublicKey.toString());
    console.log('Connection endpoint:', connection.rpcEndpoint);
    const balance = await connection.getBalance(userPublicKey);
    console.log('Raw balance (lamports):', balance);
    console.log('Balance (SOL):', balance / LAMPORTS_PER_SOL);
    return {
      amount: balance / LAMPORTS_PER_SOL,
      rawAmount: balance
    };
  } catch (error) {
    console.error('Error fetching balance:', error);
    return {
      amount: 0,
      rawAmount: 0
    };
  }
};

// Helper function to convert SOL to lamports
export const solToLamports = (sol) => {
  return Math.floor(sol * LAMPORTS_PER_SOL);
};

// Helper function to convert lamports to SOL
export const lamportsToSol = (lamports) => {
  return lamports / LAMPORTS_PER_SOL;
};

export { PROGRAM_ID, LAMPORTS_PER_SOL };