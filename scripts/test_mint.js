const anchor = require('@project-serum/anchor');
const { SystemProgram } = anchor.web3;

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../utils");

const {
   CONFIG_ACCOUNT,
   MINT_ACCOUNT,
   TREASURY,
   DOORMAN_SEED,
   program,
   provider,
   getMintTokenVaultAddress
} = require("./config");




async function performMint() {

   let payerTokenAccount = await createTokenAccount(
      provider,
      MINT_ACCOUNT,
      provider.wallet.publicKey
   );

   console.log("\n payer token account: " + payerTokenAccount.toBase58());

   let mintTokenVault = await getMintTokenVaultAddress();
   const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(DOORMAN_SEED))],
      program.programId
   );

   let tx = await program.rpc.purchaseMintToken({
      accounts: {
         config: CONFIG_ACCOUNT,
         mintTokenVault,
         mintTokenVaultAuthority: mint_token_vault_authority_pda,
         payer: provider.wallet.publicKey,
         treasury: TREASURY,
         systemProgram: SystemProgram.programId,
         payerMintAccount: payerTokenAccount,
         tokenProgram: TOKEN_PROGRAM_ID,
         clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
      },
      // instructions: await createTokenAccountInstrs(provider, anchor.web3.Keypair.generate().publicKey, mint.publicKey, provider.wallet.publicKey)
   });

   console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
}

performMint();
