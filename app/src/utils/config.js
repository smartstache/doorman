import {PublicKey, clusterApiUrl, Connection} from "@solana/web3.js";
import { getPhantomWallet } from "@solana/wallet-adapter-wallets";
// import idl from "../../../target/idl/doorman.json";
import {Provider} from "@project-serum/anchor";

// export const preflightCommitment = "processed";
// export const programID = new PublicKey(idl.metadata.address);
// export const wallets = [getPhantomWallet()];



const localnet = "http://127.0.0.1:8899";
const devnet = clusterApiUrl("devnet");
// const mainnet = clusterApiUrl("mainnet-beta");
export const network = devnet;


// export const doormanConfig = new PublicKey(process.env.REACT_APP_DOORMAN_CONFIG);

/*
async function getProvider() {
   const connection = new Connection(network, preflightCommitment);
   const provider = new Provider(connection, wallet, preflightCommitment);
   return provider;
}

 */

