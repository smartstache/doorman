const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;

const {
   DOORMAN_CONFIG,
   provider,
   program,
   showConfig
} = require("./config");

async function updateConfig() {

   let costInSol = 0.001;
   let goLiveDate = (Date.now() - 55555500000) / 1000;                                  // in the past
   let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * costInSol);
   let whitelistEnabled = true;

   let tx = await program.rpc.updateConfig(costInLamports, new anchor.BN(goLiveDate), whitelistEnabled, {
      accounts: {
         config: DOORMAN_CONFIG,
         authority: provider.wallet.publicKey,
      },
   });

   console.log("\n\nconfig updated");
   console.log(">> cost in sol should be: ", costInSol);
   console.log(">> go live date should be: ", new Date(goLiveDate * 1000));


   await showConfig();
}

updateConfig();
