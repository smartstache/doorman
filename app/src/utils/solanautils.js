import { TOKEN_PROGRAM_ID,   ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
const anchor = require("@project-serum/anchor");

const spl = require("@solana/spl-token");

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new anchor.web3.PublicKey(
   'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

// create a token account
export const createTokenAccount = async (provider, mint, owner) => {
   const token = new spl.Token(
      provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      provider.wallet.payer
   );
   return await token.createAccount(owner);
}

export const createAssociatedTokenAccountInstruction = async (
   provider,
   newAccountPubkey,
   mint,
   owner
) => {
   let lamports = await provider.connection.getMinimumBalanceForRentExemption(165);

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
