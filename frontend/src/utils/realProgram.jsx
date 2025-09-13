import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

// Program ID from your deployed program
const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

// Instruction discriminators from the IDL
const INSTRUCTION_DISCRIMINATORS = {
  deposit: [242, 35, 198, 137, 82, 225, 242, 182],
  withdraw: [183, 18, 70, 156, 148, 109, 161, 34],
  initializePool: [175, 175, 109, 31, 13, 152, 155, 237],
  selectSecureWinner: [102, 6, 61, 18, 1, 218, 243, 78],
  claimReward: [149, 95, 181, 242, 94, 90, 158, 162]
};

export const useRealProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    try {
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      );

      return {
        programId: PROGRAM_ID,
        provider,
        connection: connection,
        methods: {
          deposit: (amount) => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Deposit accounts received:', accounts);
                console.log('Creating real deposit transaction:', { amount: amount.toString(), accounts });
                
                const transaction = new Transaction();
                
                // Add the deposit instruction
                const depositInstruction = {
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // user
                    { pubkey: new PublicKey(accounts.solPool), isSigner: false, isWritable: true }, // sol_pool
                    { pubkey: new PublicKey(accounts.userDeposit), isSigner: false, isWritable: true }, // user_deposit
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
                  ],
                  data: (() => {
                    const buffer = Buffer.alloc(8 + 8); // discriminator + amount
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[0], 0);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[1], 1);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[2], 2);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[3], 3);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[4], 4);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[5], 5);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[6], 6);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.deposit[7], 7);
                    
                    // Write amount as u64 little endian
                    const amountValue = amount.toNumber ? amount.toNumber() : amount;
                    buffer.writeBigUInt64LE(BigInt(amountValue), 8);
                    
                    return buffer;
                  })()
                };
                
                transaction.add(depositInstruction);
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('Deposit transaction successful:', signature);
                return signature;
              }
            })
          }),
          
          withdraw: (amount) => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Creating real withdraw transaction:', { amount: amount.toString(), accounts });
                
                const transaction = new Transaction();
                
                // Add the withdraw instruction
                const withdrawInstruction = {
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // user
                    { pubkey: new PublicKey(accounts.solPool), isSigner: false, isWritable: true }, // sol_pool
                    { pubkey: new PublicKey(accounts.userDeposit), isSigner: false, isWritable: true }, // user_deposit
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
                  ],
                  data: (() => {
                    const buffer = Buffer.alloc(8 + 8); // discriminator + amount
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[0], 0);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[1], 1);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[2], 2);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[3], 3);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[4], 4);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[5], 5);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[6], 6);
                    buffer.writeUInt8(INSTRUCTION_DISCRIMINATORS.withdraw[7], 7);
                    
                    // Write amount as u64 little endian
                    const amountValue = amount.toNumber ? amount.toNumber() : amount;
                    buffer.writeBigUInt64LE(BigInt(amountValue), 8);
                    
                    return buffer;
                  })()
                };
                
                transaction.add(withdrawInstruction);
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('Withdraw transaction successful:', signature);
                return signature;
              }
            })
          }),
          
          selectSecureWinner: () => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Creating real lottery transaction:', { accounts });
                
                const transaction = new Transaction();
                
                // Add the select_secure_winner instruction
                const lotteryInstruction = {
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // admin
                    { pubkey: new PublicKey(accounts.solPool), isSigner: false, isWritable: true }, // sol_pool
                    { pubkey: new PublicKey(accounts.userDeposit1), isSigner: false, isWritable: false }, // user_deposit1
                    { pubkey: new PublicKey(accounts.userDeposit2), isSigner: false, isWritable: false }, // user_deposit2
                    { pubkey: new PublicKey(accounts.userDeposit3), isSigner: false, isWritable: false }, // user_deposit3
                    { pubkey: new PublicKey(accounts.userDeposit4), isSigner: false, isWritable: false }, // user_deposit4
                    { pubkey: new PublicKey('SysvarRecentB1ockHashes11111111111111111'), isSigner: false, isWritable: false }, // recent_blockhashes
                  ],
                  data: Buffer.from(INSTRUCTION_DISCRIMINATORS.selectSecureWinner)
                };
                
                transaction.add(lotteryInstruction);
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('Lottery transaction successful:', signature);
                return signature;
              }
            })
          }),
          
          claimReward: () => ({
            accounts: (accounts) => ({
              rpc: async () => {
                console.log('Creating real claim transaction:', { accounts });
                
                const transaction = new Transaction();
                
                // Add the claim_reward instruction
                const claimInstruction = {
                  programId: PROGRAM_ID,
                  keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // authority
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // winner
                    { pubkey: new PublicKey(accounts.solPool), isSigner: false, isWritable: true }, // sol_pool
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
                  ],
                  data: Buffer.from(INSTRUCTION_DISCRIMINATORS.claimReward)
                };
                
                transaction.add(claimInstruction);
                
                // Send transaction
                const signature = await connection.sendTransaction(transaction, [wallet]);
                await connection.confirmTransaction(signature);
                
                console.log('Claim transaction successful:', signature);
                return signature;
              }
            })
          })
        },
        
        account: {
          solPool: {
            fetch: async (pda) => {
              console.log('Fetching real solPool data:', pda);
              try {
                const accountInfo = await connection.getAccountInfo(pda);
                if (!accountInfo) {
                  throw new Error('SolPool account not found');
                }
                
                // Parse the account data (simplified - in reality you'd need proper deserialization)
                const data = accountInfo.data;
                if (!data || data.length < 68) {
                  throw new Error('Invalid account data length');
                }
                
                const totalDeposited = data.readBigUInt64LE(8); // Skip discriminator
                const totalDepositors = data.readUInt32LE(16);
                const lastRewardTime = data.readBigInt64LE(20);
                const rewardPool = data.readBigUInt64LE(28);
                
                return {
                  totalDeposited: { toNumber: () => Number(totalDeposited) },
                  totalDepositors,
                  lastRewardTime: { toNumber: () => Number(lastRewardTime) },
                  rewardPool: { toNumber: () => Number(rewardPool) },
                  admin: new PublicKey(data.slice(36, 68))
                };
              } catch (error) {
                console.error('Error fetching solPool:', error);
                // Return mock data as fallback
                return {
                  totalDeposited: { toNumber: () => 100000000 },
                  totalDepositors: 1,
                  rewardPool: { toNumber: () => 0 },
                  lastRewardTime: Math.floor(Date.now() / 1000) - 120,
                  admin: wallet.publicKey
                };
              }
            }
          },
          
          userDeposit: {
            fetch: async (pda) => {
              console.log('Fetching real userDeposit data:', pda);
              try {
                const accountInfo = await connection.getAccountInfo(pda);
                if (!accountInfo) {
                  return {
                    user: wallet.publicKey,
                    amount: { toNumber: () => 0 },
                    depositTime: 0
                  };
                }
                
                // Parse the account data (simplified)
                const data = accountInfo.data;
                if (!data || data.length < 56) {
                  throw new Error('Invalid userDeposit data length');
                }
                
                const user = new PublicKey(data.slice(8, 40));
                const amount = data.readBigUInt64LE(40);
                const depositTime = data.readBigInt64LE(48);
                
                return {
                  user,
                  amount: { toNumber: () => Number(amount) },
                  depositTime: { toNumber: () => Number(depositTime) }
                };
              } catch (error) {
                console.error('Error fetching userDeposit:', error);
                return {
                  user: wallet.publicKey,
                  amount: { toNumber: () => 0 },
                  depositTime: 0
                };
              }
            }
          }
        }
      };
      
      console.log('Created real program successfully');
      return program;
    } catch (error) {
      console.error('Failed to create real program:', error);
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
