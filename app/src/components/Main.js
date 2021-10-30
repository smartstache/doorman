import React, { useEffect, useState } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Box, Container, Grid } from "@material-ui/core";
import { preflightCommitment, programId, idl, connection } from "../utils/config";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import ConfigInfo from "./ConfigInfo";
import {Button} from "@mui/material";
import {CONFIG_ACCOUNT, getMintTokenVaultAddress, getMintTokenVaultAuthorityPDA, TREASURY, MINT } from "../utils/config";
const spl = require("@solana/spl-token");
const {
   ASSOCIATED_TOKEN_PROGRAM_ID,
   TOKEN_PROGRAM_ID,
   Token,
} = require("@solana/spl-token");


const anchor = require('@project-serum/anchor');
const { SystemProgram } = anchor.web3;


// const propTypes = {};
// const defaultProps = {};

export default function Main({ network }) {
   const wallet = useAnchorWallet();

   const [balance, setBalance] = useState();
   const [provider, setProvider] = useState();
   const [program, setProgram] = useState();
   const [payerTokenAccount, setPayerTokenAccount] = useState();
   const [hasTokenAccount, setHasTokenAccount] = useState(false);
   const [canMint, setCanMint] = useState(false);

   const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
            const provider = new Provider(connection, wallet, preflightCommitment);
            const program = new Program(idl, programId, provider);
            const associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
               ASSOCIATED_TOKEN_PROGRAM_ID,
               TOKEN_PROGRAM_ID,
               MINT,
               wallet.publicKey
            );
            let associatedTokenAccount = await provider.connection.getAccountInfo(associatedTokenAccountAddress);
            if (associatedTokenAccount == null) {
               setHasTokenAccount(false);
            } else {
               setHasTokenAccount(true);
            }
            anchor.setProvider(provider);
            setPayerTokenAccount(associatedTokenAccountAddress);
            setProgram(program);
            setProvider(provider);

            // todo: check whitelist for this wallet's address before setting canMint
            setCanMint(true);
         }
      })();
   }, [wallet]);

   async function createTokenAccount(mint, owner) {
      const token = new spl.Token(
         provider.connection,
         mint,
         TOKEN_PROGRAM_ID,
         provider.wallet.payer
      );
      let vault = await token.createAccount(owner);
      return vault;
   }



   const onMint = async () => {
      if (!canMint) {
         return;
      }
      try {
         setIsMinting(true);
         console.log("starting mint");
         if (provider && program) {

            // first see if the user has a token account
            let preInstructions = [];
            if (!hasTokenAccount) {
               console.log("adding instruction to create the mint token account... ");
               let createUserTokenAccountInstruction = Token.createAssociatedTokenAccountInstruction(
                  ASSOCIATED_TOKEN_PROGRAM_ID,
                  TOKEN_PROGRAM_ID,
                  MINT,
                  payerTokenAccount,
                  wallet.publicKey,
                  wallet.publicKey,
               );
               // let createUserTokenAccountTx = new anchor.web3.Transaction().add(createUserTokenAccountInstruction);
               // await provider.send(createUserTokenAccountTx);
               preInstructions = [createUserTokenAccountInstruction];
            } else {
               console.log("token account exists. not going to create");
            }

            let mintTokenVault = await getMintTokenVaultAddress();
            let mint_token_vault_authority_pda = await getMintTokenVaultAuthorityPDA();
            let tx = await program.rpc.purchaseMintToken({
               accounts: {
                  config: CONFIG_ACCOUNT,
                  mintTokenVault,
                  mintTokenVaultAuthority: mint_token_vault_authority_pda,
                  payer: wallet.publicKey,
                  treasury: TREASURY,
                  systemProgram: SystemProgram.programId,
                  payerMintAccount: payerTokenAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
               },
               instructions : preInstructions ? preInstructions : undefined
            });
            console.log("txid: ", tx);
            console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
         }
      } catch (error) {
         let message = error.msg || "Minting failed! Please try again!";
         if (!error.msg) {
            if (error.message.indexOf("0x138")) {
            } else if (error.message.indexOf("0x137")) {
               message = `SOLD OUT!`;
            } else if (error.message.indexOf("0x135")) {
               message = `Insufficient funds to mint. Please fund your wallet.`;
            }
         } else {
            if (error.code === 311) {
               message = `SOLD OUT!`;
               // setIsSoldOut(true);
            } else if (error.code === 312) {
               message = `Minting period hasn't started yet.`;
            }
         }
         // setAlertState({
         //    open: true,
         //    message,
         //    severity: "error",
         // });
      } finally {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
         }
         setIsMinting(false);
         // refreshDoormanConfig();
      }
   };


   return (
            <Container>
               <Grid container spacing={3}>
                  <Grid item xs={12}>
                     <div>
                        Wallet balance: {balance}
                     </div>
                  </Grid>
                  <Grid item xs={12}>
                     <ConfigInfo wallet={wallet} provider={provider} program={program}/>
                  </Grid>
                  <Grid item xs={12}>
                     <Button variant="contained" onClick={onMint}>Mint</Button>
                  </Grid>
               </Grid>
            </Container>
   );
}
