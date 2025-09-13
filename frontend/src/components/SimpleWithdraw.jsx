import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

const SimpleWithdraw = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(0);
  const [depositData, setDepositData] = useState(null);

  // Fetch user's SOL balance and deposit data
  useEffect(() => {
    const fetchData = async () => {
      if (!connected || !publicKey) {
        setBalance(0);
        setDepositData(null);
        return;
      }

      try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // Fetch wallet balance
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        setBalance(solBalance);
        console.log('💰 Wallet balance fetched:', { amount: solBalance, rawAmount: balance });
        
        // Fetch user deposit data from program
        const [userDepositPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('user_deposit'), publicKey.toBuffer()],
          PROGRAM_ID
        );
        
        try {
          const accountInfo = await connection.getAccountInfo(userDepositPDA);
          if (accountInfo && accountInfo.data) {
            // Parse the deposit data (assuming it's a simple structure)
            // The data should contain: amount (8 bytes) + timestamp (8 bytes) + user (32 bytes)
            const data = accountInfo.data;
            if (data.length >= 8) {
              const depositAmount = data.readBigUInt64LE(0);
              const depositSol = Number(depositAmount) / LAMPORTS_PER_SOL;
              
              setDepositData({
                amount: depositSol,
                rawAmount: Number(depositAmount),
                account: userDepositPDA.toString()
              });
              console.log('📊 Deposit data fetched:', { amount: depositSol, rawAmount: Number(depositAmount) });
            } else {
              setDepositData(null);
              console.log('📊 No deposit data found (account exists but no data)');
            }
          } else {
            setDepositData(null);
            console.log('📊 No deposit account found');
          }
        } catch (depositError) {
          console.log('📊 Failed to fetch deposit data:', depositError.message);
          setDepositData(null);
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch data:', error);
        setBalance(0);
        setDepositData(null);
      }
    };

    fetchData();
  }, [connected, publicKey]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Starting withdrawal check:', { connected, publicKey: publicKey?.toString() });
    
    if (!connected) {
      setStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }
    
    if (!publicKey) {
      setStatus({ type: 'error', message: 'Public key not available' });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (!depositData || depositData.amount <= 0) {
      setStatus({ type: 'error', message: 'No deposits found. Please deposit first.' });
      return;
    }

    if (withdrawAmount > depositData.amount) {
      setStatus({ type: 'error', message: `Insufficient deposit balance. You can withdraw up to ${depositData.amount.toFixed(4)} SOL` });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting withdrawal process...');
      
      // Setup connection
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Calculate PDAs
      console.log('🔧 Calculating PDAs...');
      const [solPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_pool_vrf')],
        PROGRAM_ID
      );
      
      console.log('🔧 Converting publicKey to buffer...');
      const publicKeyBuffer = publicKey.toBuffer();
      console.log('🔧 PublicKey buffer length:', publicKeyBuffer.length);
      
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_deposit'), publicKeyBuffer],
        PROGRAM_ID
      );
      
      console.log('📊 PDAs calculated:');
      console.log('Sol Pool:', solPoolPDA.toString());
      console.log('User Deposit:', userDepositPDA.toString());
      
      // Convert amount to lamports
      const amountLamports = Math.floor(withdrawAmount * LAMPORTS_PER_SOL);
      console.log('💰 Amount:', amountLamports, 'lamports');
      
      // Create instruction data for withdraw (discriminator + amount)
      const instructionData = Buffer.alloc(16);
      // Withdraw discriminator from IDL: [183, 18, 70, 156, 148, 109, 161, 34]
      const withdrawDiscriminator = [183, 18, 70, 156, 148, 109, 161, 34];
      instructionData.set(withdrawDiscriminator, 0);
      instructionData.writeBigUInt64LE(BigInt(amountLamports), 8);
      
      console.log('📝 Instruction data created:', instructionData.length, 'bytes');
      
      // Create transaction
      const transaction = new Transaction();
      transaction.add({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: solPoolPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
      
      console.log('📦 Transaction created with', transaction.instructions.length, 'instructions');
      
      // Send transaction
      console.log('📡 Sending transaction...');
      console.log('🔧 PublicKey for signing:', publicKey.toString());
      
      // Debug transaction before sending
      console.log('🔍 Transaction details:');
      console.log('- Instructions count:', transaction.instructions.length);
      console.log('- Recent blockhash:', transaction.recentBlockhash);
      console.log('- Fee payer:', transaction.feePayer?.toString());
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log('🔧 Transaction prepared with blockhash:', blockhash);
      
      // Use the wallet adapter's sendTransaction method
      const signature = await sendTransaction(transaction, connection);
      
      console.log('✅ Withdrawal successful!');
      
      setStatus({ 
        type: 'success', 
        message: `Successfully withdrew ${withdrawAmount} SOL! Transaction: ${signature}` 
      });
      
      // Clear form and refresh data
      setAmount('');
      
      // Refresh wallet balance
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      
      // Refresh deposit data
      const [userDepositPDARefresh] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_deposit'), publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      try {
        const accountInfo = await connection.getAccountInfo(userDepositPDARefresh);
        if (accountInfo && accountInfo.data && accountInfo.data.length >= 8) {
          const depositAmount = accountInfo.data.readBigUInt64LE(0);
          const depositSol = Number(depositAmount) / LAMPORTS_PER_SOL;
          setDepositData({
            amount: depositSol,
            rawAmount: Number(depositAmount),
            account: userDepositPDARefresh.toString()
          });
        } else {
          setDepositData(null);
        }
      } catch (error) {
        setDepositData(null);
      }
      
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      
      // More detailed error handling
      let errorMessage = 'Unknown error occurred';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString) {
        errorMessage = error.toString();
      }
      
      // Check for specific error types
      if (error.name === 'WalletSendTransactionError') {
        errorMessage = 'Wallet transaction failed. Please check your connection and try again.';
      } else if (error.name === 'TransactionError') {
        errorMessage = 'Transaction failed on blockchain. Please check your deposit balance.';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient funds for transaction.';
      } else if (error.message.includes('blockhash')) {
        errorMessage = 'Blockhash expired. Please try again.';
      }
      
      setStatus({ 
        type: 'error', 
        message: `Withdrawal failed: ${errorMessage}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Withdraw SOL</h2>
        
        {!connected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Connect your wallet to withdraw</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            <div className="mb-4 space-y-2">
              <div>
                <p className="text-sm text-gray-600">Wallet SOL Balance:</p>
                <p className="text-lg font-semibold text-green-600">{balance.toFixed(4)} SOL</p>
              </div>
              
              {depositData ? (
                <div>
                  <p className="text-sm text-gray-600">Deposited Amount:</p>
                  <p className="text-lg font-semibold text-blue-600">{depositData.amount.toFixed(4)} SOL</p>
                  <p className="text-xs text-gray-500">Available for withdrawal</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">Deposited Amount:</p>
                  <p className="text-lg font-semibold text-gray-400">0.0000 SOL</p>
                  <p className="text-xs text-gray-500">No deposits found</p>
                </div>
              )}
            </div>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Withdraw (SOL)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max={depositData?.amount || 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  disabled={!depositData || depositData.amount <= 0}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0 || !depositData || depositData.amount <= 0}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Withdrawing...' : (!depositData || depositData.amount <= 0) ? 'No Deposits Available' : 'Withdraw SOL'}
              </button>
            </form>
            
            {status && (
              <div className={`mt-4 p-3 rounded-md ${
                status.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {status.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleWithdraw;
