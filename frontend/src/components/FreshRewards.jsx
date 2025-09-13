import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Trophy, Clock, Zap, Users } from 'lucide-react';

const PROGRAM_ID = new PublicKey('3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE');

const FreshRewards = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [poolData, setPoolData] = useState({
    rewardPool: 0,
    lastRewardTime: 0,
    totalDepositors: 0,
    totalDeposited: 0
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Fetch pool data
  useEffect(() => {
    const fetchPoolData = async () => {
      if (!connected || !publicKey) return;

      try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // Get pool data
        const [solPoolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('sol_pool_vrf')],
          PROGRAM_ID
        );
        
        const accountInfo = await connection.getAccountInfo(solPoolPDA);
        if (accountInfo && accountInfo.data) {
          const data = accountInfo.data;
          
          // Parse pool data structure (with discriminator):
          // discriminator: u64 (8 bytes) - skip this
          // total_deposited: u64 (8 bytes)
          // total_depositors: u32 (4 bytes) 
          // last_reward_time: i64 (8 bytes)
          // reward_pool: u64 (8 bytes)
          // admin: Pubkey (32 bytes)
          
          if (data.length >= 68) { // 8 + 8 + 4 + 8 + 8 + 32 = 68 bytes
            const totalDeposited = data.readBigUInt64LE(8);  // Skip discriminator
            const totalDepositors = data.readUInt32LE(16);   // Skip discriminator + total_deposited
            const lastRewardTime = data.readBigInt64LE(20); // Skip discriminator + total_deposited + total_depositors
            const rewardPool = data.readBigUInt64LE(28);    // Skip discriminator + total_deposited + total_depositors + last_reward_time
            
            setPoolData({
              rewardPool: Number(rewardPool) / LAMPORTS_PER_SOL,
              lastRewardTime: Number(lastRewardTime),
              totalDepositors: totalDepositors,
              totalDeposited: Number(totalDeposited) / LAMPORTS_PER_SOL
            });
            
            // Calculate cooldown
            const currentTime = Math.floor(Date.now() / 1000);
            const timeSinceLastReward = currentTime - Number(lastRewardTime);
            const cooldownSeconds = 60; // 1 minute cooldown
            setCooldownTime(Math.max(0, cooldownSeconds - timeSinceLastReward));
            
            console.log('📊 Pool data fetched:', {
              rewardPool: Number(rewardPool) / LAMPORTS_PER_SOL,
              totalDepositors,
              lastRewardTime: Number(lastRewardTime),
              totalDeposited: Number(totalDeposited) / LAMPORTS_PER_SOL
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch pool data:', error);
      }
    };

    if (connected) {
      fetchPoolData();
      
      // Update cooldown every second
      const interval = setInterval(() => {
        setCooldownTime(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  const runLottery = async () => {
    if (!connected || !publicKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (poolData.totalDepositors === 0) {
      setStatus({ type: 'error', message: 'No depositors available for lottery' });
      return;
    }

    if (cooldownTime > 0) {
      setStatus({ type: 'error', message: `Please wait ${cooldownTime} seconds before running lottery again` });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting VRF lottery...');
      
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Calculate PDAs
      const [solPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_pool_vrf')],
        PROGRAM_ID
      );
      
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_deposit'), publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log('📊 PDAs:', {
        solPool: solPoolPDA.toString(),
        userDeposit: userDepositPDA.toString()
      });
      
      // Create instruction data for selectSecureWinner
      const instructionData = Buffer.alloc(8);
      // SelectSecureWinner discriminator: [42, 174, 44, 215, 218, 3, 61, 122]
      const discriminator = [42, 174, 44, 215, 218, 3, 61, 122];
      instructionData.set(discriminator, 0);
      
      console.log('📝 Instruction data:', Array.from(instructionData));
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add selectSecureWinner instruction
      transaction.add({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: solPoolPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: new PublicKey('SysvarRecentB1ockHashes11111111111111111111'), isSigner: false, isWritable: false }
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
      console.log('📡 Sending lottery transaction...');
      const signature = await sendTransaction(transaction, connection);
      
      console.log('✅ Lottery transaction sent:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      console.log('🎉 Lottery completed!');
      
      setStatus({ 
        type: 'success', 
        message: `VRF Lottery completed! Winner selected. Transaction: ${signature}` 
      });
      
      // Refresh pool data after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Lottery failed:', error);
      
      let errorMessage = 'Lottery failed';
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

  const claimReward = async () => {
    if (!connected || !publicKey) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    if (poolData.rewardPool === 0) {
      setStatus({ type: 'error', message: 'No rewards available to claim' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting reward claim...');
      
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      // Calculate PDAs
      const [solPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_pool_vrf')],
        PROGRAM_ID
      );
      
      console.log('📊 PDAs:', {
        solPool: solPoolPDA.toString()
      });
      
      // Create instruction data for claimReward
      const instructionData = Buffer.alloc(8);
      // ClaimReward discriminator: [149, 95, 181, 242, 94, 90, 158, 162]
      const discriminator = [149, 95, 181, 242, 94, 90, 158, 162];
      instructionData.set(discriminator, 0);
      
      console.log('📝 Instruction data:', Array.from(instructionData));
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add claimReward instruction
      transaction.add({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: solPoolPDA, isSigner: false, isWritable: true },
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
      console.log('📡 Sending claim transaction...');
      const signature = await sendTransaction(transaction, connection);
      
      console.log('✅ Claim transaction sent:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      console.log('🎉 Reward claimed!');
      
      setStatus({ 
        type: 'success', 
        message: `Successfully claimed ${poolData.rewardPool.toFixed(4)} SOL! Transaction: ${signature}` 
      });
      
      // Refresh pool data after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Claim failed:', error);
      
      let errorMessage = 'Claim failed';
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

  if (!connected) {
    return (
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <Trophy className="w-6 h-6" style={{ marginRight: '8px' }} />
          Connect Wallet for Rewards
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to participate in the VRF lottery and claim rewards.
        </p>
        <div style={{ textAlign: 'center' }}>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <Trophy className="w-6 h-6" style={{ marginRight: '8px' }} />
        VRF Lottery & Rewards
      </h2>

      {/* Status Message */}
      {status && (
        <div className={`status ${status.type}`} style={{ marginBottom: '20px' }}>
          {status.message}
        </div>
      )}

        {/* Reward Pool */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)', 
            borderRadius: '12px',
            border: '1px solid #f59e0b',
            marginBottom: '15px'
          }}>
            <h3 style={{ 
              marginBottom: '10px', 
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              <Trophy className="w-5 h-5" style={{ marginRight: '8px' }} />
              Current Reward Pool
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#78350f' }}>
              {poolData.rewardPool.toFixed(6)} SOL
            </div>
          </div>
        </div>

        {/* Pool Statistics */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
            borderRadius: '12px',
            border: '1px solid #10b981',
            marginBottom: '15px'
          }}>
            <h3 style={{ 
              marginBottom: '15px', 
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              <Users className="w-5 h-5" style={{ marginRight: '8px' }} />
              Pool Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#047857', marginBottom: '5px' }}>Total Depositors</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#064e3b' }}>{poolData.totalDepositors}</p>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#047857', marginBottom: '5px' }}>Total Deposited</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#064e3b' }}>{poolData.totalDeposited.toFixed(4)} SOL</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#047857', marginBottom: '5px' }}>Last Lottery</p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#064e3b' }}>
                {poolData.lastRewardTime > 0 
                  ? new Date(poolData.lastRewardTime * 1000).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Cooldown Timer */}
        {cooldownTime > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              padding: '20px', 
              background: 'linear-gradient(135deg, #fed7aa 0%, #fecaca 100%)', 
              borderRadius: '12px',
              border: '1px solid #f59e0b',
              marginBottom: '15px'
            }}>
              <h3 style={{ 
                marginBottom: '10px', 
                color: '#c2410c',
                display: 'flex',
                alignItems: 'center',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                <Clock className="w-5 h-5" style={{ marginRight: '8px' }} />
                Cooldown Active
              </h3>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#9a3412' }}>
                Next lottery available in: {cooldownTime} seconds
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={runLottery} 
            className="btn btn-warning"
            style={{ 
              flex: '1',
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading || cooldownTime > 0 || poolData.totalDepositors === 0}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                Running Lottery...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Run VRF Lottery
              </>
            )}
          </button>

          <button 
            onClick={claimReward} 
            className="btn btn-secondary"
            style={{ 
              flex: '1',
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading || poolData.rewardPool === 0}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                Claiming...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5" />
                Claim Rewards
              </>
            )}
          </button>
        </div>

        {/* How It Works */}
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
          borderRadius: '12px',
          border: '1px solid #3b82f6'
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#1e40af',
            fontSize: '18px',
            fontWeight: '600'
          }}>How VRF Lottery Works:</h3>
          <ul style={{ color: '#1e3a8a', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>🔒 Secure Randomness:</span>
              Uses multiple entropy sources (time, slot, epoch, pool data)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>⚖️ Weighted Selection:</span>
              Larger deposits have higher winning probability
            </li>
            <li style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>💰 Fair Distribution:</span>
              Each lottery adds 1 SOL to the reward pool
            </li>
            <li style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>⏰ Cooldown Period:</span>
              1 minute between lottery runs
            </li>
            <li style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px' }}>🏆 Winner Claims:</span>
              Selected winner can claim the entire reward pool
            </li>
          </ul>
        </div>
      </div>
  );
};

export default FreshRewards;
