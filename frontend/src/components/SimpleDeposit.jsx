import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

const SimpleDeposit = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(0);

  // Get wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!connected || !publicKey) return;
      
      try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const walletBalance = await connection.getBalance(publicKey);
        setBalance(walletBalance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(0);
      }
    };

    fetchBalance();
  }, [connected, publicKey]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Starting deposit check:', { connected, publicKey: publicKey?.toString() });
    
    if (!connected) {
      setStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }
    
    if (!publicKey) {
      setStatus({ type: 'error', message: 'Public key not available' });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (depositAmount > balance) {
      setStatus({ type: 'error', message: 'Insufficient SOL balance' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting deposit process...');
      
      // Setup connection
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Calculate PDAs
      console.log('🔧 Calculating PDAs...');
      const [solPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_pool_vrf')],
        PROGRAM_ID
      );
      
      const [solVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_vault')],
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
      console.log('Sol Vault:', solVaultPDA.toString());
      console.log('User Deposit:', userDepositPDA.toString());
      
      // Convert SOL to lamports
      const amountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL);
      console.log('💰 Amount:', amountLamports, 'lamports');
      
      // Create instruction data
      const discriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]); // deposit discriminator
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(amountLamports), 0);
      const instructionData = Buffer.concat([discriminator, amountBuffer]);
      
      console.log('📝 Instruction data created:', instructionData.length, 'bytes');
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add SystemProgram transfer instruction (this actually moves the SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: solVaultPDA,
          lamports: amountLamports,
        })
      );
      
      // Add the deposit instruction (this updates the program state)
      transaction.add({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true }, // user
          { pubkey: solPoolPDA, isSigner: false, isWritable: true }, // sol_pool
          { pubkey: solVaultPDA, isSigner: false, isWritable: true }, // sol_vault
          { pubkey: userDepositPDA, isSigner: false, isWritable: true }, // user_deposit
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system_program
        ],
        data: instructionData
      });
      
      console.log('📦 Transaction created with', transaction.instructions.length, 'instructions');
      
      // Send transaction
      console.log('📡 Sending transaction...');
      console.log('🔧 PublicKey for signing:', publicKey.toString());
      
      // Use the wallet adapter's sendTransaction method
      const signature = await sendTransaction(transaction, connection);
      
      console.log('✅ Deposit successful!');
      
      setStatus({ 
        type: 'success', 
        message: `Successfully deposited ${amount} SOL! Transaction: ${signature}` 
      });
      setAmount('');
      
      // Refresh balance
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      
    } catch (error) {
      console.error('❌ Deposit failed:', error);
      setStatus({ 
        type: 'error', 
        message: `Deposit failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div style={{ 
        padding: '20px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px',
        backgroundColor: '#f7fafc'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#2d3748' }}>
          💳 Connect Wallet to Deposit
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to deposit SOL and participate in the VRF lottery.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #e2e8f0', 
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#2d3748' }}>
        💰 Deposit SOL
      </h2>
      
      {/* Balance Display */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#e6fffa', 
        borderRadius: '8px',
        border: '1px solid #81e6d9'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#234e52' }}>
          Your SOL Balance
        </h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
          {balance.toFixed(6)} SOL
        </div>
        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '5px' }}>
          Wallet: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: status.type === 'success' ? '#f0fff4' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#9ae6b4' : '#feb2b2'}`,
          color: status.type === 'success' ? '#22543d' : '#742a2a'
        }}>
          {status.message}
        </div>
      )}

      {/* Deposit Form */}
      <form onSubmit={handleDeposit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            color: '#4a5568' 
          }}>
            Amount (SOL)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to deposit"
            min="0.000000001"
            step="0.000000001"
            max={balance}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '16px',
              backgroundColor: 'white'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !amount || balance === 0}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#a0aec0' : '#4299e1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Depositing...
            </>
          ) : (
            '💰 Deposit SOL'
          )}
        </button>
      </form>

      {/* Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f7fafc', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#4a5568' }}>How it works:</h4>
        <ul style={{ color: '#718096', lineHeight: '1.6', margin: 0, paddingLeft: '20px' }}>
          <li>Deposit SOL to participate in the VRF lottery</li>
          <li>Your deposit amount determines your winning probability</li>
          <li>Larger deposits = higher chance of winning rewards</li>
          <li>Rewards are distributed through secure VRF selection</li>
        </ul>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SimpleDeposit;
