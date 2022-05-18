const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;

const {
   CONFIG_ACCOUNT,
   MINT,
   getMintTokenVaultAddress,
   provider,
   program,
   showConfig,
   DOORMAN_WHITELIST
} = require("./config");
const {PublicKey} = require("@solana/web3.js");


async function printConfig() {

   let config = await showConfig();

   let mint = await provider.connection.getAccountInfo(MINT);
   mint.owner = mint.owner.toBase58();
   console.log("\n >> mint account: ", mint);

   let mintTokenVaultAddress = config.mintTokenVault;
   console.log(">> mint token vault address: ", mintTokenVaultAddress.toBase58());

   let mintTokenVault = await provider.connection.getAccountInfo(mintTokenVaultAddress);
   mintTokenVault.owner = mintTokenVault.owner.toBase58();
   console.log("\n >> mint token vault: ", mintTokenVault.to);

   let whitelist = await program.account.whitelist.fetch(DOORMAN_WHITELIST);
   let addresses = whitelist.addresses;
   let formatted = [];
   for (let address of addresses) {
      formatted.push(address.toBase58());
   }
   let num = 0;
   for (let addy of addresses) {
      if (!addy.equals(PublicKey.default)) {
         console.log(num + ": " + addy.toBase58());
      }
      num++;
   }

}

printConfig();
