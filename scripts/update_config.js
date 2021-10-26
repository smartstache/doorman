const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;

const {
   CONFIG_ACCOUNT,
   provider,
   program,
   showConfig
} = require("./config");

async function updateConfig() {

   let costInSol = 0.5
   let goLiveDate = (Date.now() - 5500000) / 1000;                                  // now
   let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * costInSol);

   let tx = await program.rpc.updateConfig(costInLamports, new anchor.BN(goLiveDate), {
      accounts: {
         config: CONFIG_ACCOUNT,
         authority: provider.wallet.publicKey,
      },
   });

   console.log("\n\nconfig updated");
   console.log(">> cost in sol should be: ", costInSol);
   console.log(">> go live date should be: ", new Date(goLiveDate * 1000));


   await showConfig();
}

updateConfig();
