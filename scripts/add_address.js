const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../utils");

const {
   DOORMAN_SEED,
   CONFIG_ACCOUNT,
   MINT_ACCOUNT,
   TREASURY,
   program,
   provider
} = require("./config");

// the address that should get added to the whitelist
const whitelistAddress = new anchor.web3.PublicKey('ER8fVYtNV1jp7ANhub6CE8EgmunwKq73qPC9k12akzTt');

async function addAddress() {

   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), MINT_ACCOUNT.toBuffer()],
      program.programId
   );

   let payerTokenAccount = await createTokenAccount(
      provider,
      MINT_ACCOUNT,
      provider.wallet.publicKey
   );

   let tx = await program.rpc.addWhitelistAddress(whitelistAddress, {
      accounts: {
         config: CONFIG_ACCOUNT,
         authority: provider.wallet.publicKey
      }
   });

   console.log("\n\n >> added allowed address: ", whitelistAddress.toBase58());

}

addAddress();
