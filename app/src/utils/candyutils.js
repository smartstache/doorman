import { CANDYMACHINE_ID, CANDYMACHINE_PROGRAM, TOKEN_METADATA_PROGRAM, connection } from "./config";
import { createAssociatedTokenAccountInstruction } from "./chainutils";
import { sendTransactionWithRetry } from "./connection";

const {
   ASSOCIATED_TOKEN_PROGRAM_ID,
   TOKEN_PROGRAM_ID,
   Token,
   MintLayout
} = require("@solana/spl-token");

const anchor = require("@project-serum/anchor");

export const getCandyMachineState = async (
   anchorWallet,                                         // anchor.Wallet,
   candyMachineId,
   connection,
) => {                                                          // Promise<CandyMachineAccount> => {
   const provider = new anchor.Provider(connection, anchorWallet, {
      preflightCommitment: 'recent',
   });

   const idl = await anchor.Program.fetchIdl(CANDYMACHINE_PROGRAM, provider);

   const program = new anchor.Program(idl, CANDYMACHINE_PROGRAM, provider);

   const state = await program.account.candyMachine.fetch(candyMachineId);
   const itemsAvailable = state.data.itemsAvailable.toNumber();
   const itemsRedeemed = state.itemsRedeemed.toNumber();
   const itemsRemaining = itemsAvailable - itemsRedeemed;

   let cmState = {
      id: candyMachineId,
      program,
      state: {
         itemsAvailable,
         itemsRedeemed,
         itemsRemaining,
         isSoldOut: itemsRemaining === 0,
         goLiveDate: 0,
         treasury: state.wallet,
         tokenMint: state.tokenMint,
         config: state.config,
         price: state.data.price,
         isActive: false
      },
   };

   if (state.data.goLiveDate) {
      cmState.state.goLiveDate = state.data.goLiveDate;
      cmState.state.isActive = state.data.goLiveDate.toNumber() < new Date().getTime() / 1000;
   }

   console.log("cm state: ", cmState);

   return cmState;
};

const getMetadata = async (mint) => {
   return (
      await anchor.web3.PublicKey.findProgramAddress(
         [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM.toBuffer(),
            mint.toBuffer(),
         ],
         TOKEN_METADATA_PROGRAM
      )
   )[0];
};

const getMasterEdition = async (mint) => {
   return (
      await anchor.web3.PublicKey.findProgramAddress(
         [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM.toBuffer(),
            mint.toBuffer(),
            Buffer.from("edition"),
         ],
         TOKEN_METADATA_PROGRAM
      )
   )[0];
};

// associated token account
export const getAtaForMint = async (
   mint,
   buyer,
) => {
   return await anchor.web3.PublicKey.findProgramAddress(
      [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
   );
};

const getTokenWallet = async (wallet, mint) => {
   return (
      await anchor.web3.PublicKey.findProgramAddress(
         [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
         ASSOCIATED_TOKEN_PROGRAM_ID
      )
   )[0];
}

// this one is from metaplex's codebase
export const mintOneToken = async (
   candyMachine,                             // candy machine account
   payer,
   premintInstructions = null
) => {
   console.log("candy machine: ", candyMachine);
   const mint = anchor.web3.Keypair.generate();

   const userTokenAccountAddress = (
      await getAtaForMint(mint.publicKey, payer)
   )[0];

   const userPayingAccountAddress = (
      await getAtaForMint(candyMachine.state.tokenMint, payer)
   )[0];

   const candyMachineAddress = candyMachine.id;

   const remainingAccounts = [];
   const signers = [mint];
   const instructions = [];
   if (premintInstructions) {
      instructions.push(...premintInstructions);
   }
   const accountInstructions = [
      anchor.web3.SystemProgram.createAccount({
         fromPubkey: payer,
         newAccountPubkey: mint.publicKey,
         space: MintLayout.span,
         lamports:
            await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
               MintLayout.span,
            ),
         programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
         TOKEN_PROGRAM_ID,
         mint.publicKey,
         0,
         payer,
         payer,
      ),
      createAssociatedTokenAccountInstruction(
         userTokenAccountAddress,
         payer,
         payer,
         mint.publicKey,
      ),
      Token.createMintToInstruction(
         TOKEN_PROGRAM_ID,
         mint.publicKey,
         userTokenAccountAddress,
         payer,
         [],
         1,
      ),
   ];

   instructions.push(...accountInstructions);

   let tokenAccount;
   if (candyMachine.state.tokenMint) {
      const transferAuthority = anchor.web3.Keypair.generate();

      signers.push(transferAuthority);
      remainingAccounts.push({
         pubkey: userPayingAccountAddress,
         isWritable: true,
         isSigner: false,
      });
      remainingAccounts.push({
         pubkey: transferAuthority.publicKey,
         isWritable: false,
         isSigner: true,
      });

      instructions.push(
         Token.createApproveInstruction(
            TOKEN_PROGRAM_ID,
            userPayingAccountAddress,
            transferAuthority.publicKey,
            payer,
            [],
            candyMachine.state.price.toNumber(),
         ),
      );
   }
   const metadataAddress = await getMetadata(mint.publicKey);
   const masterEdition = await getMasterEdition(mint.publicKey);

   console.log("userPayingAccountAddress, token account address: ", userPayingAccountAddress.toBase58());
   console.log("candymachine.state.config: ", candyMachine.state.config.toBase58());
   console.log("candymachine address: ", candyMachineAddress.toBase58());
   console.log("wallet: ", candyMachine.state.treasury.toBase58());
   console.log("Mint: ", mint.publicKey.toBase58());
   console.log("Metadata: ", metadataAddress.toBase58());
   console.log("master edition: ", masterEdition.toBase58());
   console.log("mint authority, payer, updateAuthority: ", payer.toBase58());

   instructions.push(
      await candyMachine.program.instruction.mintNft({
         accounts: {
            config: candyMachine.state.config,
            candyMachine: candyMachineAddress,
            payer,
            wallet: candyMachine.state.treasury,
            mint: mint.publicKey,
            metadata: metadataAddress,
            masterEdition,
            mintAuthority: payer,
            updateAuthority: payer,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
         },
         remainingAccounts:
            remainingAccounts.length > 0 ? remainingAccounts : undefined,
      }),
   );

   if (tokenAccount) {
      instructions.push(
         Token.createRevokeInstruction(
            TOKEN_PROGRAM_ID,
            userPayingAccountAddress,
            payer,
            [],
         ),
      );
   }
   try {
      console.log("instructions to be executed: ", instructions);
      return (
         await sendTransactionWithRetry(
            candyMachine.program.provider.connection,
            candyMachine.program.provider.wallet,
            instructions,
            signers,
         )
      ).txid;
   } catch (e) {
      console.log(e);
   }
   return '-failed-';
};


/* -- this is from exiled apes candy-machine-mint
export const mintOneToken = async (candyMachine, config, payer, treasury, userTokenAccount) => {
   const mint = anchor.web3.Keypair.generate();
   const token = await getTokenWallet(payer, mint.publicKey);
   const {program} = candyMachine;
   const metadata = await getMetadata(mint.publicKey);
   const masterEdition = await getMasterEdition(mint.publicKey);
   const rent = await connection.getMinimumBalanceForRentExemption(165);

   // this is for minting with the mint token
   let remainingAccounts = [
      {
         pubkey: userTokenAccount,
         isWriteable: true,
         isSigner: false
      },
      {
         pubkey: payer,
         isWriteable: false,
         isSigner: true
      }
   ];

   console.log("config:", config);
   console.log("candyMachine:", candyMachine);
   console.log("payer:", payer);
   return await program.rpc.mintNft({
      accounts: {
         config,
         candyMachine: candyMachine.id,
         payer: payer,
         wallet: treasury,
         mint: mint.publicKey,
         metadata,
         masterEdition,
         mintAuthority: payer,
         updateAuthority: payer,
         tokenMetadataProgram: TOKEN_METADATA_PROGRAM,
         tokenProgram: TOKEN_PROGRAM_ID,
         systemProgram: anchor.web3.SystemProgram.programId,
         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
         clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      remainingAccounts,
      signers: [mint],
      instructions: [
         anchor.web3.SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mint.publicKey,
            space: 165,
            lamports: rent,
            programId: TOKEN_PROGRAM_ID,
         }),
         Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            payer,
            payer
         ),
         createAssociatedTokenAccountInstruction(
            token,
            payer,
            payer,
            mint.publicKey
         ),
         Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            token,
            payer,
            [],
            1
         ),
      ],
   });
}

 */
