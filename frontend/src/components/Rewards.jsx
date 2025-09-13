import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRealProgram as useProgram, calculatePDAs, lamportsToSol } from '../utils/realProgram.jsx';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Trophy, Clock, Zap } from 'lucide-react';

const Rewards = () => {
  const { publicKey, connected } = useWallet();
  const program = useProgram();
  const [poolData, setPoolData] = useState({
    rewardPool: 0,
    lastRewardTime: 0,
    totalDepositors: 0
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [cooldownTime, setCooldownTime] = useState(0);

  const fetchPoolData = async () => {
    if (!connected || !program) return;

    try {
      const { solPoolPDA } = calculatePDAs(program.programId, publicKey);
      const data = await program.account.solPool.fetch(solPoolPDA);
      setPoolData({
        rewardPool: lamportsToSol(data.rewardPool.toNumber()),
        lastRewardTime: data.lastRewardTime,
        totalDepositors: data.totalDepositors
      });

      // Calculate cooldown
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSinceLastReward = currentTime - data.lastRewardTime;
      const cooldownSeconds = 60; // 1 minute cooldown
      setCooldownTime(Math.max(0, cooldownSeconds - timeSinceLastReward));
    } catch (error) {
      console.error('Failed to fetch pool data:', error);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchPoolData();
      // Update cooldown every second
      const interval = setInterval(() => {
        setCooldownTime(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  const runLottery = async () => {
    if (!connected || !program) {
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
      // Real lottery transaction
      const { solPoolPDA, userDepositPDA } = calculatePDAs(program.programId, publicKey);
      const tx = await program.methods.selectSecureWinner().accounts({
        admin: publicKey,
        solPool: solPoolPDA,
        userDeposit1: userDepositPDA,
        userDeposit2: userDepositPDA,
        userDeposit3: userDepositPDA,
        userDeposit4: userDepositPDA,
        recentBlockhashes: 'SysvarRecentB1ockHashes11111111111111111'
      }).rpc();

      setStatus({ 
        type: 'success', 
        message: `Lottery completed! Winner selected. Transaction: ${tx}` 
      });
      
      // Refresh pool data
      setTimeout(fetchPoolData, 2000);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `Lottery failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async () => {
    if (!connected || !program) {
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
      // Real claim transaction
      const { solPoolPDA } = calculatePDAs(program.programId, publicKey);
      
      const tx = await program.methods.claimReward().accounts({
        authority: publicKey,
        winner: publicKey,
        solPool: solPoolPDA,
        systemProgram: '11111111111111111111111111111111'
      }).rpc();

      setStatus({ 
        type: 'success', 
        message: `Successfully claimed ${poolData.rewardPool} SOL! Transaction: ${tx}` 
      });
      
      // Refresh pool data
      setTimeout(fetchPoolData, 2000);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `Claim failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="card">
        <h2>
          <Wallet className="w-6 h-6" />
          Connect Wallet for Rewards
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to participate in the VRF lottery and claim rewards.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <Trophy className="w-6 h-6" />
        VRF Lottery & Rewards
      </h2>

      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          padding: '15px', 
          background: '#f7fafc', 
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#4a5568' }}>
            <Trophy className="w-5 h-5 inline mr-2" />
            Current Reward Pool
          </h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>
            {poolData.rewardPool.toFixed(6)} SOL
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          background: '#f0fff4', 
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#22543d' }}>
            <Users className="w-5 h-5 inline mr-2" />
            Pool Statistics
          </h4>
          <p style={{ color: '#2f855a', marginBottom: '5px' }}>
            Total Depositors: <strong>{poolData.totalDepositors}</strong>
          </p>
          <p style={{ color: '#2f855a' }}>
            Last Lottery: <strong>{new Date(poolData.lastRewardTime * 1000).toLocaleString()}</strong>
          </p>
        </div>

        {cooldownTime > 0 && (
          <div style={{ 
            padding: '15px', 
            background: '#fef5e7', 
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #f6ad55'
          }}>
            <h4 style={{ marginBottom: '10px', color: '#c05621' }}>
              <Clock className="w-5 h-5 inline mr-2" />
              Cooldown Active
            </h4>
            <p style={{ color: '#dd6b20', fontSize: '1.1rem', fontWeight: '600' }}>
              Next lottery available in: {cooldownTime} seconds
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={runLottery} 
          className="btn btn-warning"
          disabled={loading || cooldownTime > 0 || poolData.totalDepositors === 0}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Running Lottery...
            </div>
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
          disabled={loading || poolData.rewardPool === 0}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Claiming...
            </div>
          ) : (
            <>
              <Trophy className="w-5 h-5" />
              Claim Rewards
            </>
          )}
        </button>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#e6fffa', 
        borderRadius: '8px',
        border: '1px solid #81e6d9'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#234e52' }}>How VRF Lottery Works:</h4>
        <ul style={{ color: '#2c7a7b', lineHeight: '1.6' }}>
          <li><strong>Secure Randomness:</strong> Uses multiple entropy sources (time, slot, epoch, pool data)</li>
          <li><strong>Weighted Selection:</strong> Larger deposits have higher winning probability</li>
          <li><strong>Fair Distribution:</strong> Each lottery adds 1 SOL to the reward pool</li>
          <li><strong>Cooldown Period:</strong> 1 minute between lottery runs</li>
          <li><strong>Winner Claims:</strong> Selected winner can claim the entire reward pool</li>
        </ul>
      </div>
    </div>
  );
};

export default Rewards;