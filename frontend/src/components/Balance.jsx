import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRealProgram as useProgram, calculatePDAs, getUserSolBalance, lamportsToSol } from '../utils/realProgram.jsx';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, DollarSign, Users, Trophy } from 'lucide-react';

const Balance = () => {
  const { publicKey, connected } = useWallet();
  const program = useProgram();
  const [balances, setBalances] = useState({
    userDeposit: 0,
    poolTotal: 0,
    totalDepositors: 0,
    rewardPool: 0,
    walletBalance: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalances = async () => {
    if (!connected || !program) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch pool data
      const { solPoolPDA } = calculatePDAs(program.programId, publicKey);
      const poolData = await program.account.solPool.fetch(solPoolPDA);
      
      // Fetch user deposit data
      const { userDepositPDA } = calculatePDAs(program.programId, publicKey);
      let userDepositAmount = 0;
      try {
        const userDepositData = await program.account.userDeposit.fetch(userDepositPDA);
        userDepositAmount = lamportsToSol(userDepositData.amount.toNumber());
      } catch (error) {
        // User deposit account doesn't exist yet
        userDepositAmount = 0;
      }

      // Fetch wallet's SOL balance
      const walletBalance = await getUserSolBalance(program.connection, publicKey);

      setBalances({
        userDeposit: userDepositAmount,
        poolTotal: lamportsToSol(poolData.totalDeposited.toNumber()),
        totalDepositors: poolData.totalDepositors,
        rewardPool: lamportsToSol(poolData.rewardPool.toNumber()),
        walletBalance: walletBalance.amount
      });
    } catch (error) {
      setError(`Failed to fetch balances: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchBalances();
      // Refresh every 30 seconds
      const interval = setInterval(fetchBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="card">
        <h2>
          <Wallet className="w-6 h-6" />
          Connect Wallet to View Balance
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to view your deposit balance and pool statistics.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <DollarSign className="w-6 h-6" />
        Balance & Pool Status
      </h2>

      {error && (
        <div className="status error">
          {error}
        </div>
      )}

      <div className="balance-display">
        <div className="balance-item">
          <h3>Wallet Balance</h3>
          <div className="amount">
            {loading ? '...' : balances.walletBalance.toFixed(6)}
          </div>
          <div className="label">SOL Available</div>
        </div>

        <div className="balance-item">
          <h3>Your Deposit</h3>
          <div className="amount">
            {loading ? '...' : balances.userDeposit.toFixed(6)}
          </div>
          <div className="label">SOL in Pool</div>
        </div>

        <div className="balance-item">
          <h3>Total Pool</h3>
          <div className="amount">
            {loading ? '...' : balances.poolTotal.toFixed(6)}
          </div>
          <div className="label">SOL</div>
        </div>

        <div className="balance-item">
          <h3>Total Depositors</h3>
          <div className="amount">
            {loading ? '...' : balances.totalDepositors}
          </div>
          <div className="label">Participants</div>
        </div>

        <div className="balance-item">
          <h3>Reward Pool</h3>
          <div className="amount">
            {loading ? '...' : balances.rewardPool.toFixed(6)}
          </div>
          <div className="label">SOL Available</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={fetchBalances} 
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Refreshing...
            </div>
          ) : (
            'Refresh Balance'
          )}
        </button>
      </div>

      {balances.userDeposit > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#f0fff4', 
          borderRadius: '8px',
          border: '1px solid #9ae6b4'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#22543d' }}>
            <Trophy className="w-5 h-5 inline mr-2" />
            Your Winning Probability
          </h4>
          <p style={{ color: '#2f855a', fontSize: '1.1rem', fontWeight: '600' }}>
            {balances.poolTotal > 0 
              ? `${((balances.userDeposit / balances.poolTotal) * 100).toFixed(2)}%`
              : '0%'
            }
          </p>
          <p style={{ color: '#38a169', fontSize: '0.9rem', marginTop: '5px' }}>
            Based on your deposit amount relative to total pool
          </p>
        </div>
      )}
    </div>
  );
};

export default Balance;