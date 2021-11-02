import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
   getPhantomWallet,
   getSolflareWallet,
   getSolletExtensionWallet,
   getSolletWallet,
} from '@solana/wallet-adapter-wallets';
import {
   WalletModalProvider,
   WalletDisconnectButton,
   WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

const Wallet = () => {
   // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
   const network = WalletAdapterNetwork.Devnet;

   // You can also provide a custom RPC endpoint
   const endpoint = useMemo(() => clusterApiUrl(network), [network]);

   // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking --
   // Only the wallets you configure here will be compiled into your application
   const wallets = useMemo(() => [
      getPhantomWallet(),
      getSolflareWallet(),
      getSolletWallet({ network }),
      getSolletExtensionWallet({ network }),
   ], [network]);

   return (
      <ConnectionProvider endpoint={endpoint}>
         <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
               <WalletMultiButton />
               <WalletDisconnectButton />
            </WalletModalProvider>
         </WalletProvider>
      </ConnectionProvider>
   );
};

export default Wallet;
