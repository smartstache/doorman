import React, { useEffect, useState } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Box, Container, Grid } from "@material-ui/core";
import { preflightCommitment, programId, idl, connection, CONFIG_ACCOUNT } from "../utils/config";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
const anchor = require('@project-serum/anchor');

export default function ConfigInfo({ wallet, provider, program }) {

   const [configInfo, setConfigInfo] = useState({
      cost: null
   });
   // const [program, setProgram] = useState();

   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (program) {
            let accountData = await program.account.config.fetch(CONFIG_ACCOUNT);
            accountData.costInLamports = accountData.costInLamports.toString();
            accountData.authority = accountData.authority.toString();
            accountData.treasury = accountData.treasury.toString();
            accountData.mintTokenVault = accountData.mintTokenVault.toString();
            accountData.goLiveDate = new Date(accountData.goLiveDate.toNumber() * 1000);
            console.log("\n >> config account data: ", accountData);
            setConfigInfo(accountData);
         }
      })();
   }, [wallet]);

   // Initialize the program if this is the first time its launched
   // async function initializeVoting() {
   //    const provider = await getProvider();
   //    const program = new Program(idl, programID, provider);
   //    try {
   //       await program.rpc.initialize(new BN(voteAccountBump), {
   //          accounts: {
   //             user: provider.wallet.publicKey,
   //             voteAccount: voteAccount,
   //             systemProgram: web3.SystemProgram.programId,
   //          },
   //       });
   //       const account = await program.account.votingState.fetch(voteAccount);
   //       setBalance({
   //          crunchy: account.crunchy?.toNumber(),
   //          smooth: account.smooth?.toNumber(),
   //       });
   //       enqueueSnackbar("Vote account initialized", { variant: "success" });
   //    } catch (error) {
   //       console.log("Transaction error: ", error);
   //       console.log(error.toString());
   //       enqueueSnackbar(`Error: ${error.toString()}`, { variant: "error" });
   //    }
   // }


   return (
      <Box height="100%" display="flex" flexDirection="column">
         <Box flex="1 0 auto">
            <Container>
               <Grid container spacing={3}>
                  <Grid item xs={12}>
                     <div>
                     </div>
                  </Grid>
                  <Grid item xs={12}>
                  </Grid>
                  <Grid item xs={6}>
                  </Grid>
                  <Grid item xs={6}>
                  </Grid>
                  <Grid item xs={12}>
                  </Grid>
               </Grid>
            </Container>
         </Box>
      </Box>
   );
}
