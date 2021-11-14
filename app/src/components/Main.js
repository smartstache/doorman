import React, { useEffect, useState, useMemo } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Box, Container, Grid } from "@material-ui/core";
import {
   preflightCommitment,
   programId,
   idl,
   connection,
   CANDYMACHINE_ID,
   TX_TIMEOUT,
   DOORMAN_CONFIG,
   DOORMAN_TREASURY,
   MINT,
   getMintTokenVaultAuthorityPDA,
   getMintTokenVaultAddress, DOORMAN_WHITELIST
} from "../utils/config";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import DoormanConfigInfo from "./DoormanConfigInfo";
import {Alert, Button, Snackbar} from "@mui/material";
import CandyMachineConfigInfo from "./CandyMachineConfigInfo";
import {getCandyMachineState, mintOneToken} from "../utils/candyutils";
import {awaitTransactionSignatureConfirmation, sendTransactionWithRetry} from "../utils/connection";

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

   const [alertState, setAlertState] = useState({
      open: false,
      message: '',
      severity: undefined,
   });

   const [solBalance, setSolBalance] = useState();
   const [mintTokenBalance, setMintTokenBalance] = useState(0);
   const [provider, setProvider] = useState();
   const [program, setProgram] = useState();

   // doorman stuff
   const [payerTokenAccount, setPayerTokenAccount] = useState();
   const [hasTokenAccount, setHasTokenAccount] = useState(false);
   const [canPurchase, setCanPurchase] = useState(false);
   const [isPurchasing, setIsPurchasing] = useState(false);
   const [whitelistAddressIndex, setWhitelistAddressIndex] = useState(-1);


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
               await refreshMintTokenBalance(associatedTokenAccountAddress);
            }

            setCanPurchase(true);

            // fetch the whitelist and see if this user's wallet is somewhere in there
            let whitelist = await program.account.whitelist.fetch(DOORMAN_WHITELIST);
            console.log("whitelist: ", whitelist);
            console.log("wallet: ", wallet.publicKey.toString());
            let userkey = wallet.publicKey;
            for (let x = 0; x < whitelist.addresses.length; x++) {
               if (userkey.equals(whitelist.addresses[x])) {
                  console.log("found address on whitelist at index: ", x)
                  setWhitelistAddressIndex(x);
                  break;
               }
            }
         }
      })();
   }, [wallet]);

   async function refreshMintTokenBalance(tokenAccount) {
      let checkaddress = tokenAccount || payerTokenAccount;
      if (checkaddress) {
         let mintToken = new Token(
            connection,
            MINT,
            TOKEN_PROGRAM_ID,
            wallet.publicKey
         );
         let payerMintTokenAccountInfo = await mintToken.getAccountInfo(checkaddress);
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

   useEffect(refreshMintTokenBalance, [
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

   // combine the 2 actions in a single transaction
   const onPurchaseAndMint = async () => {
      if (!canPurchase) {
         return;
      }
      try {
         setIsPurchasing(true);
         console.log("starting mint");
         if (provider && program) {

            // first see if the user has a token account
            let premintInstructions = [];
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
               premintInstructions = [createUserTokenAccountInstruction];
            } else {
               console.log("token account exists. not going to create");
            }

            let mintTokenVault = await getMintTokenVaultAddress();
            let mint_token_vault_authority_pda = await getMintTokenVaultAuthorityPDA();

            const purchaseMintIx =
               await program.instruction.purchaseMintToken(whitelistAddressIndex, {
                  accounts: {
                     config: DOORMAN_CONFIG,
                     whitelist: DOORMAN_WHITELIST,
                     mintTokenVault,
                     mintTokenVaultAuthority: mint_token_vault_authority_pda,
                     payer: wallet.publicKey,
                     treasury: DOORMAN_TREASURY,
                     systemProgram: SystemProgram.programId,
                     payerMintAccount: payerTokenAccount,
                     tokenProgram: TOKEN_PROGRAM_ID,
                     clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
                  }
               });
               console.log("instruction program Id: ", purchaseMintIx.programId.toBase58());
            premintInstructions.push(
               purchaseMintIx
            );

            /*  this works ---> just a mint token purchase
            let tx = await sendTransactionWithRetry(
               connection,
               wallet,
               premintInstructions,
               [],
            );
            console.log(">>>> TX >>> ", tx);
             */

            console.log("purchase + mint premintInstructions: ", premintInstructions);
            const mintTxId = await mintOneToken(
               candyMachine,
               wallet.publicKey,
               premintInstructions
            );

            console.log("Mint tx id: ", mintTxId);
            await awaitConfirmation(mintTxId, "Congratulations! Mint succeeded!", "Mint failed! Try again ..?");

            console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
            await refreshMintTokenBalance();
         }
      } catch (error) {
         console.log("problem with purchase + mint", error);
         let message = error.msg || "Purchase failed! Please make sure doors are open and your wallet is on the whitelist.";
         if (error.msg) {
            if (error.message.indexOf("0x12c")) {
               message = "Your address is not on the whitelist!";
            }
         }
         console.log("mint token purchase error: ", message);
         setAlertState({
            open: true,
            message,
            severity: "error",
         });
      } finally {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setSolBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
         }
         setIsPurchasing(false);
         // refreshDoormanConfig();
      }

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


            let txId = await program.rpc.purchaseMintToken(whitelistAddressIndex, {
               accounts: {
                  config: DOORMAN_CONFIG,
                  whitelist: DOORMAN_WHITELIST,
                  mintTokenVault,
                  mintTokenVaultAuthority: mint_token_vault_authority_pda,
                  payer: provider.wallet.publicKey,
                  treasury: DOORMAN_TREASURY,
                  systemProgram: SystemProgram.programId,
                  payerMintAccount: payerTokenAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
               },
               instructions : preInstructions ? preInstructions : undefined
            });


            console.log("purchase txid: ", txId);
            console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
            await awaitConfirmation(txId, "You've got a minting token!", "Failed to buy a minting token. Are you on the whitelist?");
            await refreshMintTokenBalance();
         }
      } catch (error) {
         let message = error.msg || "Purchase failed! Please make sure doors are open and your wallet is on the whitelist.";
         if (error.msg) {
            if (error.message.indexOf("0x12c")) {
               message = "Your address is not on the whitelist!";
            }
         }
         console.log("mint token purchase error: ", message);
         setAlertState({
            open: true,
            message,
            severity: "error",
         });
      } finally {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setSolBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
         }
         setIsPurchasing(false);
         // refreshDoormanConfig();
      }
   };

   const awaitConfirmation = async (txId, successMessage, failMessage) => {
      const status = await awaitTransactionSignatureConfirmation(
         txId,
         TX_TIMEOUT,
         connection,
         "singleGossip",
         false
      );

      if (!status?.err) {
         setAlertState({
            open: true,
            message: successMessage,
            severity: "success",
         });
      } else {
         setAlertState({
            open: true,
            message: failMessage,
            severity: "error",
         });
      }
   }

   const onMint = async () => {
      try {
         setIsMinting(true);
         if (wallet && candyMachine?.program) {
            const mintTxId = await mintOneToken(
               candyMachine,
               wallet.publicKey,
            );

            console.log("Mint tx id: ", mintTxId);

            await awaitConfirmation(mintTxId, "Congratulations! Mint succeeded!", "Mint failed! Try again ..?");

         }
      } catch (error) {
         let message = error.msg || "Minting failed! Please try again!";
         if (error.msg) {
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

         setAlertState({
            open: true,
            message,
            severity: "error",
         });
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
                     <DoormanConfigInfo wallet={wallet} provider={provider} program={program} />
                  </Grid>
                  <Grid item xs={12}>
                     {whitelistAddressIndex >= 0 && <h2>Your address is on the whitelist!</h2>}
                     {whitelistAddressIndex < 0 && <h2>Sorry, your address is NOT on the whitelist.</h2>}
                  </Grid>
                  <Grid item xs={4}>
                     <Button variant="contained" onClick={onPurchase}>Purchase Mint Token (step 1/2)</Button>
                  </Grid>
                  <Grid item xs={8}>
                     Mint Tokens In Wallet: {mintTokenBalance}
                  </Grid>
                  <Grid item xs={12}>
                     <Button variant="contained" onClick={onPurchaseAndMint}>Purchase Mint Token + Mint (single step)</Button>
                  </Grid>
                  <Grid item xs={12}>
                     <h2>Candy Machine Info</h2>
                  </Grid>
                  <Grid item xs={4}>
                     {provider && <CandyMachineConfigInfo itemsAvailable={itemsAvailable} itemsRemaining={itemsRemaining} itemsRedeemed={itemsRedeemed}/>}
                  </Grid>
                  <Grid item xs={4}>
                     <Button variant="contained" onClick={onMint}>Mint (step 2/2)</Button>
                  </Grid>
               </Grid>
               <Snackbar
                  open={alertState.open}
                  autoHideDuration={6000}
                  onClose={() => setAlertState({ ...alertState, open: false })}
               >
                  <Alert
                     onClose={() => setAlertState({ ...alertState, open: false })}
                     severity={alertState.severity}
                  >
                     {alertState.message}
                  </Alert>
               </Snackbar>
            </Container>
   );
}
