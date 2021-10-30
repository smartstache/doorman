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
   DOORMAN_TREASURY,
   program,
   provider
} = require("./config");

//// ====== CONFIG ===== //////

// the address that should get added to the whitelist
// const whitelistAddress = new anchor.web3.PublicKey('79nLYswTuZWvtM136CuBn8FjDL84FM1Mr3yEhGf6KpPB');
// id2
const whitelistAddress = new anchor.web3.PublicKey('ER8fVYtNV1jp7ANhub6CE8EgmunwKq73qPC9k12akzTt');


//// ====== CONFIG ===== //////

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

   let tx = await program.rpc.addWhitelistAddress(whitelistAddress, {
      accounts: {
         config: DOORMAN_CONFIG,
         authority: provider.wallet.publicKey
      }
   });

   console.log("\n\n >> added allowed address: ", whitelistAddress.toBase58());

}

addAddress();
