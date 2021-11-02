
const anchor = require('@project-serum/anchor');
const { SystemProgram } = anchor.web3;

const {
   createTokenAccount,
} = require("../jslib/utils");

const {
   MINT,
   DOORMAN_CONFIG,
   DOORMAN_TREASURY,
   DOORMAN_SEED,
   program,
   provider,
   getMintTokenVaultAddress
} = require("./config");

const {
   ASSOCIATED_TOKEN_PROGRAM_ID,
   TOKEN_PROGRAM_ID,
   Token,
} = require("@solana/spl-token");

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new anchor.web3.PublicKey(
   'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

const findAssociatedTokenAddress = async (walletAddress, tokenMintAddress) => {
   anchor.web3.SystemProgram.
   return (await anchor.web3.PublicKey.findProgramAddress(
      [
         walletAddress.toBuffer(),
         TOKEN_PROGRAM_ID.toBuffer(),
         tokenMintAddress.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
   ))[0];
}


async function doPurchase() {

   let payerTokenAccount = await createTokenAccount(
      provider,
      MINT,
      provider.wallet.publicKey
   );

   console.log("\n payer token account: " + payerTokenAccount.toBase58());

   let mintTokenVault = await getMintTokenVaultAddress();
   const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(DOORMAN_SEED))],
      program.programId
   );

   /*
   // create the user's token account
   let createUserUsdcInstr = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      userUsdc,
      program.provider.wallet.publicKey,
      program.provider.wallet.publicKey,
   )
   let createUserUsdcTrns = new anchor.web3.Transaction().add(createUserUsdcInstr);
   await provider.send(createUserUsdcTrns);
   let associatedTokenAddress = await findAssociatedTokenAddress(provider.wallet.publicKey, MINT_ACCOUNT);
    */

   let tx = await program.rpc.purchaseMintToken({
      accounts: {
         config: DOORMAN_CONFIG,
         mintTokenVault,
         mintTokenVaultAuthority: mint_token_vault_authority_pda,
         payer: provider.wallet.publicKey,
         treasury: DOORMAN_TREASURY,
         systemProgram: SystemProgram.programId,
         payerMintAccount: payerTokenAccount,
         // payerMintAccount: associatedTokenAddress,
         tokenProgram: TOKEN_PROGRAM_ID,
         clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
      },
      // instructions: await createTokenAccountInstrs(provider, anchor.web3.Keypair.generate().publicKey, mint.publicKey, provider.wallet.publicKey)
   });

   console.log("\n\n >> purchased mint token. deposited token in payer's token account: ", payerTokenAccount.toBase58());
}

doPurchase();
