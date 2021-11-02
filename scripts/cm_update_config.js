const anchor = require('@project-serum/anchor');

const {
   CANDYMACHINE_PROGRAM,
   CANDYMACHINE_ID,
   provider
} = require("./config");

async function loadCandyProgram() {
   // @ts-ignore
   // const solConnection = new web3.Connection(web3.clusterApiUrl(env));
   // const solConnection = getSolConnection(env);
   // const walletWrapper = new anchor.Wallet(walletKeyPair);
   // const provider = new anchor.Provider(solConnection, walletWrapper, {
   //    preflightCommitment: 'recent',
   // });
   const idl = await anchor.Program.fetchIdl(CANDYMACHINE_PROGRAM, provider);

   let program = new anchor.Program(idl, CANDYMACHINE_PROGRAM, provider);
   const state = await program.account.candyMachine.fetch(CANDYMACHINE_ID);
   state.authority = state.authority.toBase58();
   state.wallet = state.wallet.toBase58();
   state.tokenMint = state.tokenMint.toBase58();
   state.config = state.config.toBase58();
   console.log("candymachine state: ", state);
   return program;
}


async function updateCandyMachine() {

   let COST_IN_SOL = 0.5;

   const anchorProgram = await loadCandyProgram();
   let goLiveDate = (Date.now() - 55555500000) / 1000;                                  // in the past
   let lamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * COST_IN_SOL);

   const tx = await anchorProgram.rpc.updateCandyMachine(
      lamports ? new anchor.BN(lamports) : null,
      goLiveDate ? new anchor.BN(goLiveDate) : null,
      {
         accounts: {
            candyMachine: CANDYMACHINE_ID,
            authority: provider.wallet.publicKey,
         },
      },
   );

   console.log("\n\n >> updated candy machine: ", tx);

}

updateCandyMachine();
