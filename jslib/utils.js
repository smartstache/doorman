const spl = require("@solana/spl-token");
const anchor = require("@project-serum/anchor");
const serumCmn = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
const {
   TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

async function getTokenAccount(provider, addr) {
   return await serumCmn.getTokenAccount(provider, addr);
}

async function createMint(provider, authority, numDecimals) {
   if (authority === undefined) {
      authority = provider.wallet.publicKey;
   }
   return await spl.Token.createMint(
      provider.connection,
      provider.wallet.payer,
      authority,
      null,
      numDecimals,
      TOKEN_PROGRAM_ID
   );
}

async function createTokenAccount(provider, mint, owner) {
   const token = new spl.Token(
      provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      provider.wallet.payer
   );
   return await token.createAccount(owner);
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
   getTokenAccount,
   createTokenAccount,
   createMint,
   createTokenAccountInstrs,
};
