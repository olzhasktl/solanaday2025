import React, { useState } from 'react';
import { WalletContextProvider } from './utils/wallet.jsx';
import SimpleDeposit from './components/SimpleDeposit';
import Balance from './components/Balance';
import FreshRewards from './components/FreshRewards';
import FreshWithdraw from './components/FreshWithdraw';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, DollarSign, Trophy, Minus, Menu, X } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('deposit');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: DollarSign },
    { id: 'balance', label: 'Balance', icon: Wallet },
    { id: 'rewards', label: 'Rewards', icon: Trophy },
    { id: 'withdraw', label: 'Withdraw', icon: Minus },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'deposit':
        return <SimpleDeposit />;
      case 'balance':
        return <Balance />;
      case 'rewards':
        return <FreshRewards />;
      case 'withdraw':
        return <FreshWithdraw />;
      default:
        return <Deposit />;
    }
  };

  return (
    <WalletContextProvider>
      <div className="container">
        <header className="header">
          <h1>🎲 Solana VRF Lottery</h1>
          <p>Deposit SOL, participate in secure VRF lottery, and win rewards!</p>
        </header>

        {/* Desktop Navigation */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <nav style={{ display: 'flex', gap: '10px' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn ${activeTab === tab.id ? 'btn-secondary' : ''}`}
                    style={{
                      background: activeTab === tab.id 
                        ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' 
                        : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                      color: activeTab === tab.id ? 'white' : '#4a5568'
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div style={{ 
          display: 'none', 
          marginBottom: '20px'
        }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Menu</h3>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn"
                style={{ padding: '8px' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
            
            {mobileMenuOpen && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`btn ${activeTab === tab.id ? 'btn-secondary' : ''}`}
                      style={{
                        background: activeTab === tab.id 
                          ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' 
                          : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                        color: activeTab === tab.id ? 'white' : '#4a5568',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
                
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <WalletMultiButton />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {renderActiveComponent()}

        {/* Footer */}
        <footer style={{ 
          textAlign: 'center', 
          marginTop: '40px', 
          padding: '20px',
          color: 'white',
          opacity: 0.8
        }}>
          <p>Built with Solana, Anchor, and React</p>
          <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>
            Secure VRF lottery system on Devnet
          </p>
        </footer>
      </div>
    </WalletContextProvider>
  );
};

export default App;
