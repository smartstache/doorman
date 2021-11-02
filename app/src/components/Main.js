import React, { useEffect, useState, useMemo } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Box, Container, Grid } from "@material-ui/core";
import { preflightCommitment, programId, idl, connection, CANDYMACHINE_ID, CANDYMACHINE_PROGRAM, CANDYMACHINE_CONFIG, CANDYMACHINE_TREASURY } from "../utils/config";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import DoormanConfigInfo from "./DoormanConfigInfo";
import {Button} from "@mui/material";
import {DOORMAN_CONFIG, getMintTokenVaultAddress, getMintTokenVaultAuthorityPDA, DOORMAN_TREASURY, MINT } from "../utils/config";
import CandyMachineConfigInfo from "./CandyMachineConfigInfo";
import {getCandyMachineState, mintOneToken} from "../utils/candyutils";
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
   const anchorWallet = useMemo(() => {
      if (
         !wallet ||
         !wallet.publicKey ||
         !wallet.signAllTransactions ||
         !wallet.signTransaction
      ) {
         return;
      }

      return {
         publicKey: wallet.publicKey,
         signAllTransactions: wallet.signAllTransactions,
         signTransaction: wallet.signTransaction,
      };
   }, [wallet]);

   const [solBalance, setSolBalance] = useState();
   const [mintTokenBalance, setMintTokenBalance] = useState(0);
   const [provider, setProvider] = useState();
   const [program, setProgram] = useState();

   // doorman stuff
   const [payerTokenAccount, setPayerTokenAccount] = useState();
   const [hasTokenAccount, setHasTokenAccount] = useState(false);
   const [canPurchase, setCanPurchase] = useState(false);
   const [isPurchasing, setIsPurchasing] = useState(false);

   // candy machine related stuff
   const [isActive, setIsActive] = useState(false); // true when countdown completes
   const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
   const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
   const [itemsAvailable, setItemsAvailable] = useState(0);
   const [itemsRedeemed, setItemsRedeemed] = useState(0);
   const [itemsRemaining, setItemsRemaining] = useState(0);
   const [startDate, setStartDate] = useState(new Date());
   const [candyMachine, setCandyMachine] = useState();


   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setSolBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
            const provider = new Provider(connection, wallet, preflightCommitment);
            const program = new Program(idl, programId, provider);
            anchor.setProvider(provider);
            setProgram(program);
            setProvider(provider);
            const associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
               ASSOCIATED_TOKEN_PROGRAM_ID,
               TOKEN_PROGRAM_ID,
               MINT,
               wallet.publicKey
            );
            // check if the payer's token account exists or not
            let associatedTokenAccount = await provider.connection.getAccountInfo(associatedTokenAccountAddress);
            setPayerTokenAccount(associatedTokenAccountAddress);
            if (associatedTokenAccount == null) {
               setHasTokenAccount(false);
            } else {
               setHasTokenAccount(true);
               await refreshMintTokenBalance();
            }

            // todo: check whitelist for this wallet's address before setting canMint
            setCanPurchase(true);
         }
      })();
   }, [wallet]);

   async function refreshMintTokenBalance() {
      if (payerTokenAccount) {
         let mintToken = new Token(
            connection,
            MINT,
            TOKEN_PROGRAM_ID,
            wallet.publicKey
         );
         let payerMintTokenAccountInfo = await mintToken.getAccountInfo(payerTokenAccount);
         console.log("payer mint token account: ", payerMintTokenAccountInfo.address.toBase58());
         setMintTokenBalance(payerMintTokenAccountInfo.amount.toNumber());
      }
   }

   const refreshCandyMachineState = () => {
      (async () => {
         if (!wallet || !provider) return;

         try {
            const cndy = await getCandyMachineState(
               anchorWallet,
               CANDYMACHINE_ID,
               connection,
            );
            setCandyMachine(cndy);
            setItemsAvailable(cndy.state.itemsAvailable);
            setItemsRemaining(cndy.state.itemsRemaining);
            setItemsRedeemed(cndy.state.itemsRedeemed);
            setIsSoldOut(cndy.state.isSoldOut);
            setStartDate(cndy.state.goLiveDate);
         } catch (e) {
            console.log('Problem getting candy machine state');
            console.log(e);
         }
      })();
   };

   useEffect(refreshCandyMachineState, [
      wallet,
      provider
   ]);


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



   const onPurchase = async () => {
      if (!canPurchase) {
         return;
      }
      try {
         setIsPurchasing(true);
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
                  config: DOORMAN_CONFIG,
                  mintTokenVault,
                  mintTokenVaultAuthority: mint_token_vault_authority_pda,
                  payer: wallet.publicKey,
                  treasury: DOORMAN_TREASURY,
                  systemProgram: SystemProgram.programId,
                  payerMintAccount: payerTokenAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
               },
               instructions : preInstructions ? preInstructions : undefined
            });
            console.log("purchase txid: ", tx);
            console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
            refreshMintTokenBalance();
         }
      } catch (error) {
         let message = error.msg || "Purchase failed! Please make sure doors are open and your wallet is on the whitelist.";
         if (!error.msg) {
            if (error.message.indexOf("0x12c")) {
               message = "Your address is not on the whitelist!";
            }
         }
         console.log("mint token purchase error: ", message);
         // setAlertState({
         //    open: true,
         //    message,
         //    severity: "error",
         // });
      } finally {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setSolBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
         }
         setIsPurchasing(false);
         // refreshDoormanConfig();
      }
   };

   const onMint = async () => {
      try {
         setIsMinting(true);
         if (wallet && candyMachine?.program) {
            const mintTxId = await mintOneToken(
               candyMachine,
               wallet.publicKey,
            );

            console.log("Mint tx id: ", mintTxId);

            /* todo: deal with status later

            const status = await awaitTransactionSignatureConfirmation(
               mintTxId,
               props.txTimeout,
               props.connection,
               "singleGossip",
               false
            );

            if (!status?.err) {
               setAlertState({
                  open: true,
                  message: "Congratulations! Mint succeeded!",
                  severity: "success",
               });
            } else {
               setAlertState({
                  open: true,
                  message: "Mint failed! Please try again!",
                  severity: "error",
               });
            }

             */
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
               setIsSoldOut(true);
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
            setSolBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
         }
         setIsMinting(false);
         refreshCandyMachineState();
      }
   };


   return (
            <Container>
               <Grid container spacing={3}>
                  <Grid item xs={12}>
                     <div>
                        Wallet Balance: {solBalance} SOL
                     </div>
                  </Grid>
                  <Grid item xs={12}>
                     <h2>Doorman Info</h2>
                  </Grid>
                  <Grid item xs={12}>
                     <DoormanConfigInfo wallet={wallet} provider={provider} program={program}/>
                  </Grid>
                  <Grid item xs={4}>
                     <Button variant="contained" onClick={onPurchase}>Purchase Mint Token</Button>
                  </Grid>
                  <Grid item xs={8}>
                     Mint Tokens In Wallet: {mintTokenBalance}
                  </Grid>
                  <Grid item xs={12}>
                     <h2>Candy Machine Info</h2>
                  </Grid>
                  <Grid item xs={4}>
                     {provider && <CandyMachineConfigInfo itemsAvailable={itemsAvailable} itemsRemaining={itemsRemaining} itemsRedeemed={itemsRedeemed}/>}
                  </Grid>
                  <Grid item xs={4}>
                     <Button variant="contained" onClick={onMint}>Mint</Button>
                  </Grid>
               </Grid>
            </Container>
   );
}
