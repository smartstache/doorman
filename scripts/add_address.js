const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;
const fs = require("fs");

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../jslib/utils");

const {
   DOORMAN_SEED,
   DOORMAN_CONFIG,
   MINT,
   program,
   provider
} = require("./config");

async function addAddress() {

   // the address that should get added to the whitelist
   //const whitelistAddress = new anchor.web3.PublicKey('s42MvA8XdPV5u5KeCkR2caMwdm24xYjXLupjdrtswJ4');
   var addy;
   var addy_split;
   //read in the file with our addresses
   addy = fs.readFileSync('./addys.txt', "utf8")

   addy_split = addy.split('\n');
   console.log('after split: ', addy_split.length); //return here how many addresses you have

   // loop here to set addy to be added to account to the variable.
   for (let i = 0; i < addy_split.length; i++) {
      addy = new anchor.web3.PublicKey(addy_split[i]);
      //console.log('new addy to append: ', addy);
      whitelistAddress = addy;
      //console.log("\n\n >> added allowed address: ", whitelistAddress.toBase58());

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

      //console.log("added allowed address: ", whitelistAddress);
      console.log("added allowed address: ", whitelistAddress.toBase58());
      //console.log("\n\n >> added allowed address: ", WHITELIST_ADDRESS.toBase58());
   }
}

addAddress();
