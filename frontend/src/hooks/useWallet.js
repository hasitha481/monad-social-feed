import { useState, useEffect, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';

// Monad testnet configuration
const MONAD_TESTNET = {
  chainId: '0x279f',
  chainName: 'Monad Testnet',
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

const EXPECTED_CHAIN_ID = '0x279f';
const EXPECTED_CHAIN_DECIMAL = 10143;

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [networkWarning, setNetworkWarning] = useState('');

  // Validate network
  const validateNetwork = useCallback((chainId) => {
    const isValid = chainId === EXPECTED_CHAIN_ID;
    setCurrentChainId(chainId);
    setIsCorrectNetwork(isValid);
    
    if (!isValid && chainId) {
      setNetworkWarning(`Wrong network. Please switch to Monad Testnet (Chain ID: ${EXPECTED_CHAIN_DECIMAL})`);
    } else {
      setNetworkWarning('');
    }
    
    console.log('Network validation:', {
      current: chainId,
      expected: EXPECTED_CHAIN_ID,
      isValid
    });
    
    return isValid;
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    console.log('Disconnecting wallet...');
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setCurrentChainId(null);
    setIsCorrectNetwork(false);
    setNetworkWarning('');
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setNetworkWarning('');
      
      const ethereum = await detectEthereumProvider();
      
      if (!ethereum) {
        const message = 'Please install MetaMask to use this app!';
        setNetworkWarning(message);
        alert(message);
        return false;
      }

      console.log('Starting wallet connection...');

      // Get current chain ID
      const currentChainId = await ethereum.request({ method: 'eth_chainId' });
      console.log('Current chain ID:', currentChainId);
      
      // Check network
      const isOnCorrectNetwork = validateNetwork(currentChainId);
      
      if (!isOnCorrectNetwork) {
        console.log('Wrong network detected, attempting to switch...');
        
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: EXPECTED_CHAIN_ID }],
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newChainId = await ethereum.request({ method: 'eth_chainId' });
          console.log('After switch, chain ID:', newChainId);
          
          if (!validateNetwork(newChainId)) {
            throw new Error('Network switch failed');
          }
          
        } catch (switchError) {
          console.log('Switch error:', switchError);
          
          if (switchError.code === 4902) {
            console.log('Adding Monad Testnet to MetaMask...');
            try {
              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [MONAD_TESTNET],
              });
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const finalChainId = await ethereum.request({ method: 'eth_chainId' });
              if (!validateNetwork(finalChainId)) {
                throw new Error('Failed to add network');
              }
              
            } catch (addError) {
              console.error('Error adding Monad testnet:', addError);
              const message = 'Please manually add Monad Testnet to MetaMask';
              setNetworkWarning(message);
              alert(message);
              return false;
            }
          } else if (switchError.code === 4001) {
            const message = 'Please switch to Monad Testnet to use this app';
            setNetworkWarning(message);
            alert(message);
            return false;
          } else {
            const message = 'Failed to switch to Monad Testnet. Please switch manually.';
            setNetworkWarning(message);
            alert(message);
            return false;
          }
        }
      }

      // Request account access
      console.log('Requesting account access...');
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      console.log('Account connected:', accounts[0]);

      // Set up provider and signer
      const web3Provider = new ethers.BrowserProvider(ethereum);
      const web3Signer = await web3Provider.getSigner();

      // Final validation
      const finalChainId = await ethereum.request({ method: 'eth_chainId' });
      const finalValidation = validateNetwork(finalChainId);
      
      if (!finalValidation) {
        console.error('Final validation failed');
        const message = `Still on wrong network. Expected: ${EXPECTED_CHAIN_DECIMAL}`;
        setNetworkWarning(message);
        alert(message);
        return false;
      }

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Signer);
      setIsConnected(true);
      setNetworkWarning('');

      console.log('Wallet connected successfully to Monad Testnet');
      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        const message = 'Connection rejected. Please try again.';
        setNetworkWarning(message);
        alert(message);
      } else {
        const message = `Connection failed: ${error.message}`;
        setNetworkWarning(message);
        alert(message);
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateNetwork]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    console.log('Accounts changed:', accounts);
    
    if (!accounts || accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  }, [disconnect]);

  // Handle chain changes
  const handleChainChanged = useCallback((chainId) => {
    console.log('Chain changed to:', chainId);
    validateNetwork(chainId);
    
    // Reload page for chain changes (recommended by MetaMask)
    window.location.reload();
  }, [validateNetwork]);

  // Check existing connection
  const checkConnection = useCallback(async () => {
    try {
      const ethereum = await detectEthereumProvider();
      if (ethereum && ethereum.selectedAddress) {
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        console.log('Existing connection found on chain:', chainId);
        
        setAccount(ethereum.selectedAddress);
        
        if (validateNetwork(chainId)) {
          const web3Provider = new ethers.BrowserProvider(ethereum);
          const web3Signer = await web3Provider.getSigner();
          setProvider(web3Provider);
          setSigner(web3Signer);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }, [validateNetwork]);

  // Switch to Monad testnet manually
  const switchToMonadTestnet = useCallback(async () => {
    try {
      setIsLoading(true);
      setNetworkWarning('Switching network...');
      
      const ethereum = await detectEthereumProvider();
      if (!ethereum) {
        setNetworkWarning('MetaMask not found');
        return;
      }

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: EXPECTED_CHAIN_ID }],
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newChainId = await ethereum.request({ method: 'eth_chainId' });
      validateNetwork(newChainId);
      
    } catch (error) {
      console.error('Manual switch failed:', error);
      if (error.code === 4902) {
        try {
          const ethereum = await detectEthereumProvider();
          if (ethereum) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [MONAD_TESTNET],
            });
          }
        } catch (addError) {
          setNetworkWarning('Failed to add network. Please add manually.');
        }
      } else {
        setNetworkWarning('Failed to switch network. Please try manually.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [validateNetwork]);

  // Format address
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Setup event listeners
  useEffect(() => {
    checkConnection();
    
    const setupEventListeners = async () => {
      const ethereum = await detectEthereumProvider();
      if (ethereum) {
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
      }
    };
    
    setupEventListeners();
    
    // Cleanup
    return () => {
      detectEthereumProvider().then(ethereum => {
        if (ethereum && ethereum.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
        }
      });
    };
  }, [checkConnection, handleAccountsChanged, handleChainChanged]);

  return {
    account,
    provider,
    signer,
    isConnected,
    isLoading,
    currentChainId,
    isCorrectNetwork,
    networkWarning,
    connectWallet,
    disconnect,
    formatAddress,
    switchToMonadTestnet,
    expectedChainId: EXPECTED_CHAIN_DECIMAL,
  };
};