import React, { useEffect, useState } from "react";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Box, Container, Grid } from "@material-ui/core";
import { preflightCommitment, programId, idl, connection } from "../utils/config";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import ConfigInfo from "./ConfigInfo";


const anchor = require('@project-serum/anchor');


// const propTypes = {};

// const defaultProps = {};

export default function Main({ network }) {
   const wallet = useAnchorWallet();

   const [balance, setBalance] = useState();
   const [provider, setProvider] = useState();
   const [program, setProgram] = useState();

   // init the wallets & connections and stuff
   useEffect(() => {
      (async () => {
         if (wallet) {
            const balance = await connection.getBalance(wallet.publicKey);
            setBalance(balance / anchor.web3.LAMPORTS_PER_SOL);
            const provider = new Provider(connection, wallet, preflightCommitment);
            const program = new Program(idl, programId, provider);
            setProgram(program);
            setProvider(provider);
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
                        Wallet balance: {balance}
                     </div>
                  </Grid>
                  <Grid item xs={12}>
                     <ConfigInfo wallet={wallet} provider={provider} program={program}/>
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
