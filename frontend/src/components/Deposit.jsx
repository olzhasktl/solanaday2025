import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDirectProgram as useProgram, calculatePDAs, getUserSolBalance, solToLamports } from '../utils/directProgram.jsx';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Plus } from 'lucide-react';

const Deposit = () => {
  const { publicKey, connected } = useWallet();
  const program = useProgram();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch wallet balance when component mounts or wallet changes
  React.useEffect(() => {
    const fetchWalletBalance = async () => {
      console.log('useEffect triggered:', { connected, program: !!program, publicKey: publicKey?.toString() });
      
      if (!connected || !program) {
        console.log('Not connected or no program, skipping balance fetch');
        return;
      }
      
      try {
        console.log('Fetching balance for:', publicKey.toString());
        const balance = await getUserSolBalance(program.connection, publicKey);
        console.log('Balance fetched:', balance);
        setWalletBalance(balance.amount);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();
  }, [connected, program, publicKey]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!connected || !program) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    if (depositAmount > walletBalance) {
      setStatus({ type: 'error', message: 'Insufficient SOL balance' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Convert SOL to lamports
      const depositAmountRaw = solToLamports(depositAmount);
      
      // Calculate PDAs
      const { solPoolPDA, userDepositPDA } = calculatePDAs(program.programId, publicKey);
      
      // Real transaction call to the deployed program
      const tx = await program.methods.deposit(depositAmountRaw).accounts({
        user: publicKey,
        solPool: solPoolPDA,
        userDeposit: userDepositPDA,
        systemProgram: '11111111111111111111111111111111',
      }).rpc();

      setStatus({ 
        type: 'success', 
        message: `Successfully deposited ${amount} SOL! Transaction: ${tx}` 
      });
      setAmount('');
      
      // Refresh wallet balance
      const balance = await getUserSolBalance(program.connection, publicKey);
      setWalletBalance(balance.amount);
    } catch (error) {
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
      <div className="card">
        <h2>
          <Wallet className="w-6 h-6" />
          Connect Wallet to Deposit
        </h2>
        <p style={{ marginBottom: '20px', color: '#718096' }}>
          Connect your Solana wallet to deposit SOL and participate in the VRF lottery.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <Plus className="w-6 h-6" />
        Deposit SOL
      </h2>
      
      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Wallet Balance Display */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f7fafc', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ color: '#4a5568', margin: 0 }}>
            Your SOL Balance
          </h4>
          <button 
            onClick={async () => {
              if (program && publicKey) {
                try {
                  console.log('Manual refresh clicked');
                  console.log('Program connection:', program.connection.rpcEndpoint);
                  console.log('Public key:', publicKey.toString());
                  
                  // Test direct connection
                  const directConnection = new (await import('@solana/web3.js')).Connection('https://api.devnet.solana.com', 'confirmed');
                  const directBalance = await directConnection.getBalance(publicKey);
                  console.log('Direct connection balance:', directBalance / 1000000000, 'SOL');
                  
                  const balance = await getUserSolBalance(program.connection, publicKey);
                  setWalletBalance(balance.amount);
                } catch (error) {
                  console.error('Manual refresh failed:', error);
                }
              }
            }}
            style={{
              padding: '5px 10px',
              fontSize: '0.8rem',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
          {walletBalance.toFixed(6)} SOL
        </div>
        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '5px' }}>
          Wallet: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
        </div>
        {walletBalance === 0 && (
          <p style={{ color: '#e53e3e', fontSize: '0.9rem', marginTop: '10px' }}>
            ⚠️ No SOL balance found. You need SOL to participate.
          </p>
        )}
      </div>

      <form onSubmit={handleDeposit}>
        <div className="form-group">
          <label htmlFor="amount">Amount (SOL)</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to deposit"
            min="0.000000001"
            step="0.000000001"
            max={walletBalance}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn"
          disabled={loading || !amount || walletBalance === 0}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Depositing...
            </div>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Deposit SOL
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f7fafc', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '10px', color: '#4a5568' }}>How it works:</h4>
        <ul style={{ color: '#718096', lineHeight: '1.6' }}>
          <li>Deposit SOL to participate in the VRF lottery</li>
          <li>Your deposit amount determines your winning probability</li>
          <li>Larger deposits = higher chance of winning rewards</li>
          <li>Rewards are distributed through secure VRF selection</li>
        </ul>
      </div>

      {walletBalance === 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#fef5e7', 
          borderRadius: '8px',
          border: '1px solid #f6ad55'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#c05621' }}>
            🚀 Need SOL on Devnet?
          </h4>
          <p style={{ color: '#dd6b20', marginBottom: '10px' }}>
            To participate in the lottery, you need SOL tokens on Solana Devnet:
          </p>
          <ol style={{ color: '#dd6b20', lineHeight: '1.6', paddingLeft: '20px' }}>
            <li><strong>Get SOL:</strong> Use a Devnet faucet to get SOL for deposits and transaction fees</li>
            <li><strong>Deposit:</strong> Once you have SOL, you can deposit to participate!</li>
            <li><strong>Win Rewards:</strong> Participate in the VRF lottery to win SOL rewards</li>
          </ol>
          <p style={{ color: '#c05621', fontSize: '0.9rem', marginTop: '10px' }}>
            💡 <strong>Tip:</strong> Make sure your wallet is set to Devnet network!
          </p>
        </div>
      )}
    </div>
  );
};

export default Deposit;