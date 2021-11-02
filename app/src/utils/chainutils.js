import { TOKEN_PROGRAM_ID,   ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
const TokenInstructions = require("@project-serum/serum").TokenInstructions;
const anchor = require("@project-serum/anchor");

const spl = require("@solana/spl-token");


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

export const createAssociatedTokenAccountInstruction = (
   associatedTokenAddress,
   payer,
   walletAddress,
   splTokenMintAddress
) => {
   const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
         pubkey: anchor.web3.SystemProgram.programId,
         isSigner: false,
         isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
         pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
         isSigner: false,
         isWritable: false,
      },
   ];
   return new anchor.web3.TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from([]),
   });
}


export const getUnixTs = () => {
   return new Date().getTime() / 1000;
};

