const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../jslib/utils");

const {
   DOORMAN_SEED,
   DOORMAN_CONFIG,
   MINT,
   WHITELIST_ADDRESS,
   program,
   provider
} = require("./config");

async function addAddress() {

   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), MINT.toBuffer()],
      program.programId
   );

   let payerTokenAccount = await createTokenAccount(
      provider,
      MINT,
      provider.wallet.publicKey
   );

   let tx = await program.rpc.addWhitelistAddress(WHITELIST_ADDRESS, {
      accounts: {
         config: DOORMAN_CONFIG,
         authority: provider.wallet.publicKey
      }
   });

   console.log("\n\n >> added allowed address: ", WHITELIST_ADDRESS.toBase58());

}

addAddress();
