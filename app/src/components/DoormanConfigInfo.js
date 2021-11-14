import React, { useEffect, useState } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import {
   preflightCommitment,
   programId,
   idl,
   connection,
   DOORMAN_CONFIG,
   DOORMAN_WHITELIST,
   MINT
} from "../utils/config";
import {Button, Card, CardActionArea, CardActions, CardContent, Grid, Paper} from "@mui/material";
import { styled } from '@mui/material/styles';
const {
   ASSOCIATED_TOKEN_PROGRAM_ID,
   TOKEN_PROGRAM_ID,
   Token,
} = require("@solana/spl-token");

const anchor = require('@project-serum/anchor');

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long'});

export default function DoormanConfigInfo({ wallet, provider, program }) {

   const [configInfo, setConfigInfo] = useState({
      cost: null
   });
   const [tokensLeft, setTokensLeft] = useState(-1);


   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (program) {
            let accountData = await program.account.config.fetch(DOORMAN_CONFIG);
            const mintTokenVault = accountData.mintTokenVault;
            accountData.costInSol = accountData.costInLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL;
            accountData.whitelist = accountData.whitelist.toString();
            accountData.authority = accountData.authority.toString();
            accountData.treasury = accountData.treasury.toString();
            accountData.mintTokenVault = accountData.mintTokenVault.toString();
            accountData.goLiveDate = dateTimeFormat.format(new Date(accountData.goLiveDate.toNumber() * 1000));
            console.log("\n >> config account data: ", accountData);
            setConfigInfo(accountData);

            // see how many mint tokens are left in doorman's vault
            const mintToken = new Token(
               connection,
               MINT,
               TOKEN_PROGRAM_ID,
               wallet.publicKey
            );

            let doormanMintTokenAccountInfo = await mintToken.getAccountInfo(mintTokenVault);
            setTokensLeft(doormanMintTokenAccountInfo.amount.toNumber());

         }
      })();
   }, [program]);


   return (
      <Card sx={{ maxWidth: 612}}>
         <CardActionArea>
            <CardContent>
               <Grid container spacing={2}>
                  <Grid item xs={3}>
                     Doors Open:
                  </Grid>
                  <Grid item xs={9}>
                     {configInfo.goLiveDate}
                  </Grid>
                  <Grid item xs={4}>
                     Mint Token Price:
                  </Grid>
                  <Grid item xs={8}>
                     {configInfo.costInSol} SOL
                  </Grid>
                  <Grid item xs={4}>
                     Mint Tokens Left:
                  </Grid>
                  <Grid item xs={8}>
                     {tokensLeft > 0 && <span>{tokensLeft}</span>}
                     {tokensLeft === 0 && <span>Sold Out!</span>}
                     {tokensLeft < 0 && <span>Initializing...</span>}
                  </Grid>
               </Grid>
            </CardContent>
         </CardActionArea>
      </Card>
   );
}
