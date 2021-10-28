import {PublicKey, clusterApiUrl, Connection} from "@solana/web3.js";
import { getPhantomWallet } from "@solana/wallet-adapter-wallets";
import * as anchor from "@project-serum/anchor";
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// export const preflightCommitment = "processed";
// export const programID = new PublicKey(idl.metadata.address);
// export const wallets = [getPhantomWallet()];


import doormanIdl from "./doorman.json";

const localnet = "http://127.0.0.1:8899/";
// const devnet = clusterApiUrl("devnet");
// const mainnet = clusterApiUrl("mainnet-beta");


// set this to one of the nets above
export const endpoint = localnet;

// match this to the endpoint. there's no adapter for local, so default to dev. Can be set to 'devnet', 'testnet', or 'mainnet-beta'
export const network = WalletAdapterNetwork.Devnet;

export const preflightCommitment = "processed";
export const connection = new anchor.web3.Connection(endpoint);


export const idl = doormanIdl;
export const programId = doormanIdl.metadata.address;

export const CONFIG_ACCOUNT = new anchor.web3.PublicKey(process.env.REACT_APP_DOORMAN_CONFIG);

// export const doormanConfig = new PublicKey(process.env.REACT_APP_DOORMAN_CONFIG);

/*
async function getProvider() {
   const connection = new Connection(network, preflightCommitment);
   const provider = new Provider(connection, wallet, preflightCommitment);
   return provider;
}

 */

