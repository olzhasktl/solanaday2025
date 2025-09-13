import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRealProgram as useProgram, calculatePDAs, lamportsToSol, solToLamports } from '../utils/realProgram.jsx';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Minus, AlertTriangle } from 'lucide-react';

const Withdraw = () => {
  const { publicKey, connected } = useWallet();
  const program = useProgram();
  const [userDeposit, setUserDeposit] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchUserDeposit = async () => {
    if (!connected || !program) return;

    try {
      const { userDepositPDA } = calculatePDAs(program.programId, publicKey);
      const userDepositData = await program.account.userDeposit.fetch(userDepositPDA);
      setUserDeposit(lamportsToSol(userDepositData.amount.toNumber()));
    } catch (error) {
      console.error('Failed to fetch user deposit:', error);
      setUserDeposit(0);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchUserDeposit();
    }
  }, [connected, publicKey]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!connected || !program) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (amount > userDeposit) {
      setStatus({ type: 'error', message: 'Withdrawal amount exceeds your deposit' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Convert SOL to lamports
      const withdrawAmountRaw = solToLamports(amount);
      
      // Calculate PDAs
      const { solPoolPDA, userDepositPDA } = calculatePDAs(program.programId, publicKey);
      
      // Real transaction call to the deployed program
      const tx = await program.methods.withdraw(withdrawAmountRaw).accounts({
        user: publicKey,
        solPool: solPoolPDA,
        userDeposit: userDepositPDA,
        systemProgram: '11111111111111111111111111111111',
      }).rpc();

      setStatus({ 
        type: 'success', 
        message: `Successfully withdrew ${amount} SOL! Transaction: ${tx}` 
      });
      setWithdrawAmount('');
      
      // Refresh user deposit
      setTimeout(fetchUserDeposit, 2000);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `Withdrawal failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawAll = () => {
    if (userDeposit > 0) {
      setWithdrawAmount(userDeposit.toString());
    }
  };

  if (!connected) {
    return (
      <div className="card">
        <h2>
          <Wallet className="w-6 h-6" />
          Connect Wallet to Withdraw
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to withdraw your deposited SOL.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <Minus className="w-6 h-6" />
        Withdraw SOL
      </h2>

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f7fafc', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#4a5568' }}>
          Your Current Deposit
        </h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
          {userDeposit.toFixed(6)} SOL
        </div>
      </div>

      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      {userDeposit === 0 ? (
        <div style={{ 
          padding: '20px', 
          background: '#fef5e7', 
          borderRadius: '8px',
          border: '1px solid #f6ad55',
          textAlign: 'center'
        }}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-orange-500" />
          <h4 style={{ marginBottom: '10px', color: '#c05621' }}>
            No Deposit Found
          </h4>
          <p style={{ color: '#dd6b20' }}>
            You don't have any SOL deposited in the pool. Make a deposit first to participate in the VRF lottery.
          </p>
        </div>
      ) : (
        <form onSubmit={handleWithdraw}>
          <div className="form-group">
            <label htmlFor="withdrawAmount">Withdrawal Amount (SOL)</label>
            <input
              type="number"
              id="withdrawAmount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              min="0.000000001"
              max={userDeposit}
              step="0.000000001"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              type="submit" 
              className="btn btn-danger"
              disabled={loading || !withdrawAmount}
            >
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Withdrawing...
                </div>
              ) : (
                <>
                  <Minus className="w-5 h-5" />
                  Withdraw SOL
                </>
              )}
            </button>

            <button 
              type="button" 
              onClick={handleWithdrawAll}
              className="btn btn-secondary"
              disabled={loading || userDeposit === 0}
            >
              Withdraw All
            </button>
          </div>
        </form>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#fef2f2', 
        borderRadius: '8px',
        border: '1px solid #feb2b2'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#742a2a' }}>
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          Important Notes
        </h4>
        <ul style={{ color: '#c53030', lineHeight: '1.6' }}>
          <li>Withdrawing reduces your winning probability in the VRF lottery</li>
          <li>You can withdraw any amount up to your total deposit</li>
          <li>Withdrawals are processed immediately on the blockchain</li>
          <li>You can always deposit more SOL to increase your chances</li>
        </ul>
      </div>
    </div>
  );
};

export default Withdraw;