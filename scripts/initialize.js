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
   provider,
   program
} = require("./config");


// config account: will need the public key for this guy
const configAccount = anchor.web3.Keypair.generate();

async function displayConfigAccount(message) {
   let accountData = await program.account.config.fetch(configAccount.publicKey);
   console.log(message + ": ", accountData);
}

async function performInit() {

   let mint = await createMint(provider, provider.wallet.publicKey, 0);

   let authorityMintAccount = await createTokenAccount(
      provider,
      mint.publicKey,
      provider.wallet.publicKey
   );

   await mint.mintTo(
      authorityMintAccount,
      provider.wallet.publicKey,
      [],
      10000,
   );

   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), mint.publicKey.toBuffer()],
      program.programId
   );

   // generate a treasury to send sol used to purchase the mint token to
   const treasury = anchor.web3.Keypair.generate();

   // config
   let costInSol = 0.5;
   let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * costInSol);
   let numMintTokens = new anchor.BN(300);                     // whitelist size = 300
   let goLiveDate = new anchor.BN((Date.now() / 1000));               // now
   let tx = await program.rpc.initialize(mintTokenVaultBump, numMintTokens, costInLamports, goLiveDate, {
      accounts: {
         config: configAccount.publicKey,
         treasury: treasury.publicKey,
         authority: provider.wallet.publicKey,
         mint: mint.publicKey,
         systemProgram: SystemProgram.programId,
         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
         tokenProgram: TOKEN_PROGRAM_ID,
         mintTokenVault,
         creatorMintAccount: authorityMintAccount
      },
      signers: [configAccount]
   });

   await displayConfigAccount("config account");

   console.log("\n\n\n");
   console.log(">>> config account to use: ", configAccount.publicKey.toBase58());
   console.log(">>> mint account to use: ", mint.publicKey.toBase58());
   console.log(">>> treasury to use: ", treasury.publicKey.toBase58());
   console.log("\n\n")

}

performInit();
