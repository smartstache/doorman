import React, { useEffect, useState } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { preflightCommitment, programId, idl, connection, DOORMAN_CONFIG } from "../utils/config";
import {Button, Card, CardActionArea, CardActions, CardContent, Grid, Paper} from "@mui/material";
import { styled } from '@mui/material/styles';

const anchor = require('@project-serum/anchor');

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long'});

export default function DoormanConfigInfo({ wallet, provider, program }) {

   const [configInfo, setConfigInfo] = useState({
      cost: null
   });
   const [onWhitelist, setOnWhitelist] = useState(false);
   // const [program, setProgram] = useState();

   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (program) {
            let accountData = await program.account.config.fetch(DOORMAN_CONFIG);
            accountData.costInSol = accountData.costInLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL;
            accountData.authority = accountData.authority.toString();
            accountData.treasury = accountData.treasury.toString();
            accountData.mintTokenVault = accountData.mintTokenVault.toString();
            accountData.goLiveDate = dateTimeFormat.format(new Date(accountData.goLiveDate.toNumber() * 1000));
            console.log("\n >> config account data: ", accountData);
            for (let address of accountData.addresses) {
               if (address.equals(wallet.publicKey)) {
                  setOnWhitelist(true);
                  break;
               }
            }
            setConfigInfo(accountData);
         }
      })();
   }, [program]);



   return (
      <Card sx={{ maxWidth: 612}}>
         <CardActionArea>
            <CardContent>
               <Grid container spacing={2}>
                  <Grid item xs={12}>
                     {onWhitelist && <b>Your address is on the whitelist!</b>}
                     {!onWhitelist && <b>Your address is not on the whitelist.</b>}
                  </Grid>
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
               </Grid>
            </CardContent>
         </CardActionArea>
      </Card>
   );
}
