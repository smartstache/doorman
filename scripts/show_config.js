const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;

const {
   CONFIG_ACCOUNT,
   MINT,
   getMintTokenVaultAddress,
   provider,
   program,
   showConfig
} = require("./config");


async function printConfig() {

   await showConfig();

   let mint = await provider.connection.getAccountInfo(MINT);
   mint.owner = mint.owner.toBase58();
   console.log("\n >> mint account: ", mint);

   let mintTokenVaultAddress = await getMintTokenVaultAddress();
   console.log(">> mint token vault address: ", mintTokenVaultAddress.toBase58());

   let mintTokenVault = await provider.connection.getAccountInfo(mintTokenVaultAddress);
   mintTokenVault.owner = mintTokenVault.owner.toBase58();
   console.log("\n >> mint token vault: ", mintTokenVault);
}

printConfig();
