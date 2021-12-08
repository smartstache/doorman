const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;

const {
   DOORMAN_CONFIG,
   provider,
   program,
   showConfig,
   DOORMAN_INITIALIZOR_TOKEN_ACCOUNT
} = require("./config");
const {TOKEN_PROGRAM_ID} = require("../jslib/utils");
const spl = require("@solana/spl-token");
const {BN} = require("@project-serum/anchor");


async function showMintTokenVaultBalance(mint, mintTokenVault) {

   const mintToken = new spl.Token(
      provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      // provider.wallet.payer
   );

   let doormanMintTokenAccountInfo = await mintToken.getAccountInfo(mintTokenVault);
   console.log("mint token balance in " + mintTokenVault.toBase58() + ": " + doormanMintTokenAccountInfo.amount.toNumber());
}

async function updateConfig() {

   const numMintTokens = new BN(5);

   let config = await showConfig();
   let authorityMintAccount = DOORMAN_INITIALIZOR_TOKEN_ACCOUNT;

   console.log("pre-reload balance");
   await showMintTokenVaultBalance(config.mint, config.mintTokenVault);

   // add another batch of tokens
   tx = await program.rpc.addMintTokens(numMintTokens, {
      accounts: {
         config: DOORMAN_CONFIG,
         authority: provider.wallet.publicKey,
         mint: config.mint,
         tokenProgram: TOKEN_PROGRAM_ID,
         authorityMintAccount,
         mintTokenVault: config.mintTokenVault,
      },
   });

   console.log("re-reload balance");
   await showMintTokenVaultBalance(config.mint, config.mintTokenVault);
}

updateConfig();
