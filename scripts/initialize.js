const {
   DOORMAN_SEED,
   provider,
   program,
   MINT,
   DOORMAN_TREASURY,
   CANDYMACHINE_INITIALIZOR_TOKEN_ACCOUNT
} = require("./config");

const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../jslib/utils");


/////// ----- CONFIG ----- ///////

// set this to false to use the mint given in .env
const CREATE_NEW_MINT = false;
const CREATE_NEW_TREASURY = false;
const COST_IN_SOL = 0.5;
const NUM_MINT_TOKENS = 300;        // whitelist size. note: 300 is about the current limit for now (see rust program for why)
const GO_LIVE_DATE = new Date() / 1000;      // now

/////// ----- CONFIG ----- ///////

// config account: will need the public key for this guy
const configAccount = anchor.web3.Keypair.generate();
const whitelistData = anchor.web3.Keypair.generate();

async function displayConfigAccount(message) {
   let accountData = await program.account.config.fetch(configAccount.publicKey);
   console.log(message + ": ", accountData);
}

async function performInit() {

   var mintKey = null;
   var initializorMintTokenAccount = null;
   if (CREATE_NEW_MINT) {
      let mint = await createMint(provider, provider.wallet.publicKey, 0);

      // this will be the initializor's token vault
      initializorMintTokenAccount = await createTokenAccount(
         provider,
         mint.publicKey,
         provider.wallet.publicKey
      );

      await mint.mintTo(
         initializorMintTokenAccount,
         provider.wallet.publicKey,
         [],
         NUM_MINT_TOKENS * 2,          // mint a bunch
      );
      mintKey = mint.publicKey;
   } else {
      mintKey = MINT;
      initializorMintTokenAccount = CANDYMACHINE_INITIALIZOR_TOKEN_ACCOUNT;
   }

   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), mintKey.toBuffer()],
      program.programId
   );

   let treasuryKey = null;
   if (CREATE_NEW_TREASURY) {
      // generate a treasury to send sol used to purchase the mint token to
      treasuryKey = anchor.web3.Keypair.generate().publicKey;
      // treasuryKey = treasury.publicKey;
   } else {
      treasuryKey = DOORMAN_TREASURY
   }

   // config
   let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * COST_IN_SOL);
   let numMintTokens = new anchor.BN(NUM_MINT_TOKENS);
   let goLiveDate = new anchor.BN(GO_LIVE_DATE);               // now

   const whitelistAccountSize = 8 + (32 * 500);  // up to 500 addresses

   let tx = await program.rpc.initialize(mintTokenVaultBump, numMintTokens, costInLamports, goLiveDate, {
      accounts: {
         whitelist: whitelistData.publicKey,
         config: configAccount.publicKey,
         treasury: treasuryKey,
         authority: provider.wallet.publicKey,
         mint: mintKey,
         systemProgram: SystemProgram.programId,
         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
         tokenProgram: TOKEN_PROGRAM_ID,
         mintTokenVault,
         authorityMintAccount: initializorMintTokenAccount
      },
      signers: [configAccount, whitelistData],
      instructions: [
         anchor.web3.SystemProgram.createAccount({
            fromPubkey: program.provider.wallet.publicKey,
            lamports:
               await program.provider.connection.getMinimumBalanceForRentExemption(
                  whitelistAccountSize
               ),
            newAccountPubkey: whitelistData.publicKey,
            programId: program.programId,
            space: whitelistAccountSize,
         }),
      ],
   });

   await displayConfigAccount("config account");

   console.log("\n\n\n");
   console.log(">>> config account to use: ", configAccount.publicKey.toBase58());
   console.log(">>> mint account to use: ", mintKey.toBase58());
   console.log(">>> treasury to use: ", treasuryKey.toBase58());
   console.log(">>> whitelist account public key: ", whitelistData.publicKey);
   console.log(">>> whitelist account secret key: ", whitelistData.secretKey);
   console.log("\n\n")

}

performInit();
