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
} = require("../jslib/utils");


const DOORMAN_SEED = "doorman";
const provider = anchor.Provider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Doorman;

const {token} = require("@project-serum/common");
const fs = require("fs");

// const {createTokenAccountInstrs} = require("@project-serum/common");

const BIG_WHITELIST_LEN = 500;
const DATETIME_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long'});

describe('doorman', () => {

  const configAccount = anchor.web3.Keypair.generate();
  const whitelistData = anchor.web3.Keypair.generate();

  console.log("whitelistData: ", whitelistData.secretKey);

  async function displayConfigAccount(message) {
    let accountData = await program.account.config.fetch(configAccount.publicKey);
    accountData.costInSol = accountData.costInLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL;
    accountData.whitelist = accountData.whitelist.toString();
    accountData.authority = accountData.authority.toString();
    accountData.treasury = accountData.treasury.toString();
    accountData.mintTokenVault = accountData.mintTokenVault.toString();
    accountData.goLiveDate = DATETIME_FORMAT.format(new Date(accountData.goLiveDate.toNumber() * 1000));
    console.log(message + ": ", accountData);
  }

  async function displayWhitelistAccount(message) {
    let accountData = await program.account.whitelist.fetch(whitelistData.publicKey);
    console.log(message + ": ", accountData);
  }

  it('Initializes Big Whitelist', async () => {

    const whitelistAccountSize = 8 + (32 * BIG_WHITELIST_LEN);

    console.log('whitelist data: ', whitelistData.publicKey.toString());
    console.log('whitelist data size: ', whitelistAccountSize);

    let mint = await createMint(provider, provider.wallet.publicKey, 0);

    let authorityMintAccount = await createTokenAccount(
       provider,
       mint.publicKey,
       provider.wallet.publicKey
    );

    // now the user token account has 1000 tokens
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

    const treasury = anchor.web3.Keypair.generate();

    let costInSol = 5;
    let costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * costInSol);
    let numMintTokens = new anchor.BN(500);       // whitelist size = 500

    let goLiveDate = new anchor.BN((Date.now() + (1000 * 60 * 60 * 24) / 1000));   // tomorrow
    console.log("setting go live date to: ", goLiveDate);

    let tx = await program.rpc.initialize(mintTokenVaultBump, numMintTokens, costInLamports, goLiveDate, {
      accounts: {
        whitelist: whitelistData.publicKey,
        config: configAccount.publicKey,
        treasury: treasury.publicKey,
        authority: provider.wallet.publicKey,
        mint: mint.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        mintTokenVault,
        authorityMintAccount
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

    console.log("initialize big transaction signature", tx);
    await displayConfigAccount("config data after init");

    // add another batch of tokens
    tx = await program.rpc.addMintTokens(numMintTokens, {
      accounts: {

        authority: provider.wallet.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        authorityMintAccount,
        mintTokenVault,
      },
    });

    console.log("Added more tokens: ", tx);



    // /* this works, just commenting out for now for testing
    // try updating config
    costInLamports = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);   // new cost = 1 sol
    const dateInPast = new Date('December 17, 1995 03:24:00');
    goLiveDate = new anchor.BN(dateInPast / 1000);                  // new date = now  (i put this date way in the past cause i shut my local validator on/off)

    tx = await program.rpc.updateConfig(costInLamports, goLiveDate, true, {
      accounts: {
        config: configAccount.publicKey,
        authority: provider.wallet.publicKey,
      },
    });
    await displayConfigAccount("account data after update");

     // */

    // load up the keys from the addy.txt file
    let addyfile = fs.readFileSync('./addys.txt', "utf8")

    let addys_split = addyfile.split('\n');

    let addys = [];
    const key3 = new anchor.web3.PublicKey("42NevAWA6A8m9prDvZRUYReQmhNC3NtSZQNFUppPJDRB");
    // loop here to set addy to be added to account to the variable.
    // for (let i = 0; i < addys_split.length; i++) {

    // generally, 30 was around the max whitelist size i could send at a time

    for (let i = 0; i < 5; i++) {
      if (addys_split[i] !== "") {
        // addys.push(new anchor.web3.PublicKey(addys_split[i]));
        addys.push(key3);
      }
    }

    console.log("adding " + addys.length + " addresses to whitelist");

    tx = await program.rpc.addWhitelistAddresses(addys, {
      accounts: {
        config: configAccount.publicKey,
        whitelist: whitelistData.publicKey,
        authority: provider.wallet.publicKey,
      },
    });
    console.log("add whitelist addresses tx: " + tx);

    await displayWhitelistAccount("whitelist data");

    tx = await program.rpc.addWhitelistAddresses(addys, {
      accounts: {
        config: configAccount.publicKey,
        whitelist: whitelistData.publicKey,
        authority: provider.wallet.publicKey,
      },
    });
    console.log("add whitelist addresses tx: " + tx);

    await displayWhitelistAccount("whitelist data #2");

    tx = await program.rpc.resetWhitelistCounter({
      accounts: {
        config: configAccount.publicKey,
        authority: provider.wallet.publicKey
      }
    });

    displayConfigAccount("counter should be 0");

    ///////////// now let's test the purchase

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

    // add this guy's address to the whitelist
    tx = await program.rpc.addWhitelistAddresses([provider.wallet.publicKey], {
      accounts: {
        config: configAccount.publicKey,
        whitelist: whitelistData.publicKey,
        authority: provider.wallet.publicKey,
      },
    });

    // now we can purchase a mint token

    const [mint_token_vault_authority_pda, _mint_token_vault_authority_bump] = await anchor.web3.PublicKey.findProgramAddress(
       [Buffer.from(anchor.utils.bytes.utf8.encode("doorman"))],
       program.programId
    );

    // we know our wallet's address is at index 0 cause we reset the counter
    tx = await program.rpc.purchaseMintToken(0, {
      accounts: {
        config: configAccount.publicKey,
        whitelist: whitelistData.publicKey,
        mintTokenVault,
        mintTokenVaultAuthority: mint_token_vault_authority_pda,
        payer: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
        payerMintAccount: payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
      },
    });

    console.log("purchaseMintToken transaction signature", tx);

    displayWhitelistAccount("first address should be the default address now");

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
      console.log("\n\n >>>>>>>> this mint call should fail since the address at the given index has been used >>>>> \n\n");
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
