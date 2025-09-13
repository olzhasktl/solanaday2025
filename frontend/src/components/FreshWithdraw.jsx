import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

const FreshWithdraw = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [depositBalance, setDepositBalance] = useState(0);

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!connected || !publicKey) {
        setWalletBalance(0);
        setDepositBalance(0);
        return;
      }

      try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // Get wallet balance
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
        
        // Get deposit balance from program
        const [userDepositPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('user_deposit'), publicKey.toBuffer()],
          PROGRAM_ID
        );
        
        const accountInfo = await connection.getAccountInfo(userDepositPDA);
        if (accountInfo && accountInfo.data && accountInfo.data.length >= 48) {
          // Parse user deposit data structure:
          // discriminator: u64 (8 bytes)
          // user: Pubkey (32 bytes)
          // amount: u64 (8 bytes) - at offset 40
          const depositAmount = accountInfo.data.readBigUInt64LE(40); // Skip discriminator + user
          setDepositBalance(Number(depositAmount) / LAMPORTS_PER_SOL);
        } else {
          setDepositBalance(0);
        }
        
      } catch (error) {
        console.error('Failed to fetch balances:', error);
        setWalletBalance(0);
        setDepositBalance(0);
      }
    };

    fetchBalances();
  }, [connected, publicKey]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!connected || !publicKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet' });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (withdrawAmount > depositBalance) {
      setStatus({ type: 'error', message: `Cannot withdraw more than ${depositBalance.toFixed(4)} SOL` });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting fresh withdraw...');
      
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Calculate PDAs
      const [solPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_pool_vrf')],
        PROGRAM_ID
      );
      
      const [solVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_vault')],
        PROGRAM_ID
      );
      
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_deposit'), publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log('📊 PDAs:', {
        solPool: solPoolPDA.toString(),
        solVault: solVaultPDA.toString(),
        userDeposit: userDepositPDA.toString()
      });
      
      // Convert to lamports
      const amountLamports = Math.floor(withdrawAmount * LAMPORTS_PER_SOL);
      console.log('💰 Withdrawing:', amountLamports, 'lamports');
      
      // Create instruction data
      const instructionData = Buffer.alloc(16);
      // Withdraw discriminator: [183, 18, 70, 156, 148, 109, 161, 34]
      const discriminator = [183, 18, 70, 156, 148, 109, 161, 34];
      instructionData.set(discriminator, 0);
      instructionData.writeBigUInt64LE(BigInt(amountLamports), 8);
      
      console.log('📝 Instruction data:', Array.from(instructionData));
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add withdraw instruction
      transaction.add({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: solPoolPDA, isSigner: false, isWritable: true },
          { pubkey: solVaultPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
      
      // Get recent blockhash and set fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log('📦 Transaction ready:', {
        instructions: transaction.instructions.length,
        blockhash: blockhash,
        feePayer: publicKey.toString()
      });
      
      // Send transaction
      console.log('📡 Sending transaction...');
      const signature = await sendTransaction(transaction, connection);
      
      console.log('✅ Transaction sent:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      console.log('🎉 Withdraw successful!');
      
      setStatus({ 
        type: 'success', 
        message: `Successfully withdrew ${withdrawAmount} SOL! Transaction: ${signature}` 
      });
      
      // Clear form and refresh balances
      setAmount('');
      
      // Refresh balances
      const newWalletBalance = await connection.getBalance(publicKey);
      setWalletBalance(newWalletBalance / LAMPORTS_PER_SOL);
      
      // Refresh deposit balance
      const newAccountInfo = await connection.getAccountInfo(userDepositPDA);
      if (newAccountInfo && newAccountInfo.data && newAccountInfo.data.length >= 48) {
        const newDepositAmount = newAccountInfo.data.readBigUInt64LE(40); // Skip discriminator + user
        setDepositBalance(Number(newDepositAmount) / LAMPORTS_PER_SOL);
      } else {
        setDepositBalance(0);
      }
      
    } catch (error) {
      console.error('❌ Withdraw failed:', error);
      
      let errorMessage = 'Withdrawal failed';
      if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({ 
        type: 'error', 
        message: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px' }}>Withdraw SOL</h2>
      
      {!connected ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#718096', marginBottom: '20px' }}>Connect your wallet to withdraw</p>
          <WalletMultiButton />
        </div>
      ) : (
        <>
          {/* Balance Display */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              padding: '15px', 
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
              borderRadius: '8px',
              border: '1px solid #10b981',
              marginBottom: '15px'
            }}>
              <p style={{ fontSize: '14px', color: '#047857', marginBottom: '5px' }}>Wallet Balance</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#064e3b' }}>{walletBalance.toFixed(4)} SOL</p>
            </div>
            
            <div style={{ 
              padding: '15px', 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
              borderRadius: '8px',
              border: '1px solid #3b82f6'
            }}>
              <p style={{ fontSize: '14px', color: '#1e40af', marginBottom: '5px' }}>Deposited Amount</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a' }}>{depositBalance.toFixed(4)} SOL</p>
              <p style={{ fontSize: '12px', color: '#1d4ed8' }}>Available for withdrawal</p>
            </div>
          </div>
            
          {/* Withdraw Form */}
          <form onSubmit={handleWithdraw} style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Amount to Withdraw (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max={depositBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: depositBalance <= 0 ? '#f9fafb' : 'white'
                }}
                placeholder="0.0"
                disabled={depositBalance <= 0}
                required
              />
              {depositBalance > 0 && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Max: {depositBalance.toFixed(4)} SOL
                </p>
              )}
            </div>
            
            <button
              type="submit"
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                opacity: (loading || !amount || parseFloat(amount) <= 0 || depositBalance <= 0) ? 0.5 : 1
              }}
              disabled={loading || !amount || parseFloat(amount) <= 0 || depositBalance <= 0}
            >
              {loading ? 'Withdrawing...' : 
               depositBalance <= 0 ? 'No Deposits Available' : 
               'Withdraw SOL'}
            </button>
          </form>
            
          {/* Status Message */}
          {status && (
            <div className={`status ${status.type}`} style={{ marginBottom: '20px' }}>
              {status.message}
            </div>
          )}
          
          {/* Refresh Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                fontSize: '14px',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Refresh Balances
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FreshWithdraw;
