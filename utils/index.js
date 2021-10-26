const spl = require("@solana/spl-token");
const anchor = require("@project-serum/anchor");
const serumCmn = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

// TODO: remove this constant once @project-serum/serum uses the same version
//       of @solana/web3.js as anchor (or switch packages).
const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
   TokenInstructions.TOKEN_PROGRAM_ID.toString()
);

// Our own sleep function.
function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTokenAccount(provider, addr) {
   return await serumCmn.getTokenAccount(provider, addr);
}

async function createMint(provider, authority, numDecimals) {
   if (authority === undefined) {
      authority = provider.wallet.publicKey;
   }
   const mint = await spl.Token.createMint(
      provider.connection,
      provider.wallet.payer,
      authority,
      null,
      numDecimals,
      TOKEN_PROGRAM_ID
   );
   return mint;
}

async function createTokenAccount(provider, mint, owner) {
   const token = new spl.Token(
      provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      provider.wallet.payer
   );
   let vault = await token.createAccount(owner);
   return vault;
}

async function createTokenAccountInstrs(
   provider,
   newAccountPubkey,
   mint,
   owner,
   lamports
) {
   if (lamports === undefined) {
      lamports = await provider.connection.getMinimumBalanceForRentExemption(165);
   }
   return [
      anchor.web3.SystemProgram.createAccount({
         fromPubkey: provider.wallet.publicKey,
         newAccountPubkey,
         space: 165,
         lamports,
         programId: TOKEN_PROGRAM_ID,
      }),
      TokenInstructions.initializeAccount({
         account: newAccountPubkey,
         mint,
         owner,
      }),
   ];
}

module.exports = {
   TOKEN_PROGRAM_ID,
   sleep,
   getTokenAccount,
   createTokenAccount,
   createMint,
   createTokenAccountInstrs,
};
