import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import doormanIdl from "./doorman.json";

const spl = require("@solana/spl-token");
const anchor = require('@project-serum/anchor');

const utf8 = anchor.utils.bytes.utf8;
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
export const programId = new anchor.web3.PublicKey(doormanIdl.metadata.address);


// the mint that's used across doorman + candymachine
export const MINT = new anchor.web3.PublicKey(process.env.REACT_APP_MINT);

// candy machine config
export const CANDYMACHINE_TREASURY = new anchor.web3.PublicKey(process.env.REACT_APP_CANDYMACHINE_TREASURY);
export const CANDYMACHINE_CONFIG = new anchor.web3.PublicKey(process.env.REACT_APP_CANDYMACHINE_CONFIG);

// doorman config
export const DOORMAN_CONFIG = new anchor.web3.PublicKey(process.env.REACT_APP_DOORMAN_CONFIG);
export const DOORMAN_TREASURY = new anchor.web3.PublicKey(process.env.REACT_APP_DOORMAN_TREASURY);

const DOORMAN_SEED = "doorman";
console.log("programId: ", programId);

(async () => {
   const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(DOORMAN_SEED))],
      programId
   );
   console.log("mint token vault: ", mint_token_vault_authority_pda);
})();

export const getMintTokenVaultAddress = async () => {
   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), MINT.toBuffer()],
      programId
   );
   return mintTokenVault;
}

export async function getMintTokenVaultAuthorityPDA() {
   const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(DOORMAN_SEED))],
      programId
   );
   return mint_token_vault_authority_pda;
}


/*
async function getProvider() {
   const connection = new Connection(network, preflightCommitment);
   const provider = new Provider(connection, wallet, preflightCommitment);
   return provider;
}

 */

