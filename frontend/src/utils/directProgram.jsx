import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

// Program ID
const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

export const useDirectProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    console.log('✅ Creating direct program (no Anchor)');
    
    return {
      programId: PROGRAM_ID,
      connection: connection,
      methods: {
        deposit: (amount) => ({
          accounts: (accounts) => ({
            rpc: async () => {
              console.log('🚀 Creating direct deposit transaction');
              console.log('Amount:', amount.toString());
              console.log('Accounts:', {
                user: accounts.user.toString(),
                solPool: accounts.solPool.toString(),
                userDeposit: accounts.userDeposit.toString()
              });
              
              try {
                // Create instruction data: discriminator + amount
                const discriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]); // deposit discriminator
                const amountBuffer = Buffer.alloc(8);
                const amountValue = amount.toNumber ? amount.toNumber() : amount;
                amountBuffer.writeBigUInt64LE(BigInt(amountValue), 0);
                
                const instructionData = Buffer.concat([discriminator, amountBuffer]);
                
                // Create transaction
                const transaction = new Transaction();
                
                // Add the program instruction
                transaction.add({
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: accounts.user, isSigner: true, isWritable: true },
                    { pubkey: accounts.solPool, isSigner: false, isWritable: true },
                    { pubkey: accounts.userDeposit, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
                  ],
                  data: instructionData
                });
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('✅ Direct deposit successful:', signature);
                return signature;
                
              } catch (error) {
                console.error('❌ Direct deposit failed:', error);
                throw error;
              }
            }
          })
        }),
        
        withdraw: (amount) => ({
          accounts: (accounts) => ({
            rpc: async () => {
              console.log('🚀 Creating direct withdraw transaction');
              
              try {
                // Create instruction data: discriminator + amount
                const discriminator = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]); // withdraw discriminator
                const amountBuffer = Buffer.alloc(8);
                const amountValue = amount.toNumber ? amount.toNumber() : amount;
                amountBuffer.writeBigUInt64LE(BigInt(amountValue), 0);
                
                const instructionData = Buffer.concat([discriminator, amountBuffer]);
                
                // Create transaction
                const transaction = new Transaction();
                
                // Add the program instruction
                transaction.add({
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: accounts.user, isSigner: true, isWritable: true },
                    { pubkey: accounts.solPool, isSigner: false, isWritable: true },
                    { pubkey: accounts.userDeposit, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
                  ],
                  data: instructionData
                });
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('✅ Direct withdraw successful:', signature);
                return signature;
                
              } catch (error) {
                console.error('❌ Direct withdraw failed:', error);
                throw error;
              }
            }
          })
        }),
        
        selectSecureWinner: () => ({
          accounts: (accounts) => ({
            rpc: async () => {
              console.log('🚀 Creating direct lottery transaction');
              
              try {
                // Create instruction data: discriminator only
                const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 243, 78]); // select_secure_winner discriminator
                
                // Create transaction
                const transaction = new Transaction();
                
                // Add the program instruction
                transaction.add({
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: accounts.admin, isSigner: true, isWritable: true },
                    { pubkey: accounts.solPool, isSigner: false, isWritable: true },
                    { pubkey: accounts.userDeposit1, isSigner: false, isWritable: false },
                    { pubkey: accounts.userDeposit2, isSigner: false, isWritable: false },
                    { pubkey: accounts.userDeposit3, isSigner: false, isWritable: false },
                    { pubkey: accounts.userDeposit4, isSigner: false, isWritable: false },
                    { pubkey: new PublicKey('SysvarRecentB1ockHashes11111111111111111'), isSigner: false, isWritable: false }
                  ],
                  data: discriminator
                });
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('✅ Direct lottery successful:', signature);
                return signature;
                
              } catch (error) {
                console.error('❌ Direct lottery failed:', error);
                throw error;
              }
            }
          })
        }),
        
        claimReward: () => ({
          accounts: (accounts) => ({
            rpc: async () => {
              console.log('🚀 Creating direct claim transaction');
              
              try {
                // Create instruction data: discriminator only
                const discriminator = Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]); // claim_reward discriminator
                
                // Create transaction
                const transaction = new Transaction();
                
                // Add the program instruction
                transaction.add({
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: accounts.authority, isSigner: true, isWritable: true },
                    { pubkey: accounts.winner, isSigner: true, isWritable: true },
                    { pubkey: accounts.solPool, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
                  ],
                  data: discriminator
                });
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('✅ Direct claim successful:', signature);
                return signature;
                
              } catch (error) {
                console.error('❌ Direct claim failed:', error);
                throw error;
              }
            }
          })
        })
      },
      
      // Mock account fetching for now
      account: {
        solPool: {
          fetch: async (pda) => {
            console.log('🔍 Fetching solPool (mock):', pda.toString());
            return {
              totalDeposited: { toNumber: () => 0 },
              totalDepositors: 0,
              rewardPool: { toNumber: () => 0 },
              lastRewardTime: 0,
              admin: wallet.publicKey
            };
          }
        },
        userDeposit: {
          fetch: async (pda) => {
            console.log('🔍 Fetching userDeposit (mock):', pda.toString());
            return {
              user: wallet.publicKey,
              amount: { toNumber: () => 0 },
              depositTime: 0
            };
          }
        }
      }
    };
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

export const getUserSolBalance = async (connection, userPublicKey) => {
  try {
    const balance = await connection.getBalance(userPublicKey);
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

export const solToLamports = (sol) => {
  return Math.floor(sol * LAMPORTS_PER_SOL);
};

export const lamportsToSol = (lamports) => {
  return lamports / LAMPORTS_PER_SOL;
};

export { PROGRAM_ID, LAMPORTS_PER_SOL };
