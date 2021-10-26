const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const assert = require("assert");
const { SystemProgram } = anchor.web3;
const splToken = require("@solana/spl-token");
// const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const serumCmn = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

const {
  TOKEN_PROGRAM_ID,
  getTokenAccount,
  createMint,
  createTokenAccount
} = require("../utils");

const {
  program,
  provider,
  DOORMAN_SEED
} = require("../scripts/config");

const {token} = require("@project-serum/common");

// const {createTokenAccountInstrs} = require("@project-serum/common");

describe('doorman', () => {

  const configAccount = anchor.web3.Keypair.generate();

  async function displayConfigAccount(message) {
    let accountData = await program.account.config.fetch(configAccount.publicKey);
    console.log(message + ": ", accountData);
  }

  it('Is initialized!', async () => {

    let mint = await createMint(provider, provider.wallet.publicKey, 0);

    let creatorMintAccount = await createTokenAccount(
       provider,
       mint.publicKey,
       provider.wallet.publicKey
    );

    // now the user token account has 1000 tokens
    await mint.mintTo(
       creatorMintAccount,
       provider.wallet.publicKey,
       [],
       10000,
    );

    const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
       [utf8.encode(DOORMAN_SEED), mint.publicKey.toBuffer()],         
       program.programId
    );

    const treasury = anchor.web3.Keypair.generate();

    let costInSol = 5;
    let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * costInSol);
    let numMintTokens = new anchor.BN(500);       // whitelist size = 500

    let goLiveDate = new anchor.BN((Date.now() + (1000 * 60 * 60 * 24) / 1000));   // tomorrow
    console.log("setting go live date to: ", goLiveDate);
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
        creatorMintAccount
      },
      signers: [configAccount]
    });

    console.log("initialize transaction signature", tx);
    await displayConfigAccount("account data after init");

    costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);   // new cost = 1 sol
    goLiveDate = new anchor.BN(Date.now() / 1000);                  // new date = now

    tx = await program.rpc.updateConfig(costInLamports, goLiveDate, {
      accounts: {
        config: configAccount.publicKey,
        authority: provider.wallet.publicKey,
      },
    });

    await displayConfigAccount("account data after update");


    let user = anchor.web3.Keypair.generate();
    // airdrop this fucker some sol
    await provider.connection.confirmTransaction(
       await provider.connection.requestAirdrop(user.publicKey, anchor.web3.LAMPORTS_PER_SOL * 100),
       "confirmed"
    );

    let rentExemptionLamports = await provider.connection.getMinimumBalanceForRentExemption(165);
    // let tokenAccountInstructions = await createTokenAccountInstrs(provider, anchor.web3.Keypair.generate().publicKey, mint, user.publicKey);
    // console.log('token account instructions: ', tokenAccountInstructions);

    let payerTokenAccount = await createTokenAccount(
       provider,
       mint.publicKey,
       provider.wallet.publicKey
    );

    // add an address to the whitelist
    tx = await program.rpc.addWhitelistAddress(provider.wallet.publicKey, {
      accounts: {
        config: configAccount.publicKey,
        authority: provider.wallet.publicKey
      }
    });

    // now we can mint!

    const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
       [Buffer.from(anchor.utils.bytes.utf8.encode("doorman"))],
       program.programId
    );

    tx = await program.rpc.purchaseMintToken({
      accounts: {
        config: configAccount.publicKey,
        mintTokenVault,
        mintTokenVaultAuthority: mint_token_vault_authority_pda,
        payer: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
        payerMintAccount: payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
      },
      // signers: [provider],
      // instructions: await createTokenAccountInstrs(provider, anchor.web3.Keypair.generate().publicKey, mint.publicKey, provider.wallet.publicKey)
    });

    console.log("purchaseMintToken transaction signature", tx);

    // check that our treasury now has 5 sol
    let treasuryBalance = await provider.connection.getBalance(treasury.publicKey);
    console.log("treasury balance: ", treasuryBalance);
    assert.ok(treasuryBalance === costInLamports.toNumber());

    // check that we got the mint token
    var tokenAmount = await provider.connection.getTokenAccountBalance(payerTokenAccount);
    console.log("mint token amount: ", tokenAmount);
    assert.ok(tokenAmount.value.uiAmount === 1);


    // check another purchase - will fail
    try {
      console.log("\n\n >>>>>>>> this mint call should fail since the address has been used >>>>> \n\n");
      tx = await program.rpc.purchaseMintToken({
        accounts: {
          config: configAccount.publicKey,
          mintTokenVault,
          mintTokenVaultAuthority: mint_token_vault_authority_pda,
          payer: provider.wallet.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
          payerMintAccount: payerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
        },
        // signers: [provider],
        // instructions: await createTokenAccountInstrs(provider, anchor.web3.Keypair.generate().publicKey, mint.publicKey, provider.wallet.publicKey)
      });
      assert.fail("shouldn't be able to purchase a mint token anymore")
    } catch (e) {
      // expected
    }


  });
});
