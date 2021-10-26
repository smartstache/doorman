
const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;

const DOORMAN_SEED = "doorman";

// populate these with the output from the initialize_doorman command
const CONFIG_ACCOUNT = new anchor.web3.PublicKey('AB5RSNVvB7VhBTcSXexZBnZEb5MzAcgvsQk5sqVgTYd2');
const MINT_ACCOUNT =  new anchor.web3.PublicKey('AUp9iBSbTvRQQxtb6tTzaFeDUiYYfQjbqDAdcrQnV4Yz');
const TREASURY =  new anchor.web3.PublicKey('4jffLXVLS2yXa1DwATwDaah8eAvAGZdvKShm9ezvn693');


async function getMintTokenVaultAddress() {
   const [mintTokenVault, mintTokenVaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode(DOORMAN_SEED), MINT_ACCOUNT.toBuffer()],
      program.programId
   );
   return mintTokenVault;
}

const provider = anchor.Provider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Doorman;

async function showConfig() {

   let accountData = await program.account.config.fetch(CONFIG_ACCOUNT);
   accountData.costInLamports = accountData.costInLamports.toString();
   accountData.authority = accountData.authority.toString();
   accountData.treasury = accountData.treasury.toString();
   accountData.mintTokenVault = accountData.mintTokenVault.toString();
   accountData.goLiveDate = new Date(accountData.goLiveDate.toNumber() * 1000);
   console.log("\n >> config account data: ", accountData);

}


module.exports = {
   DOORMAN_SEED,
   CONFIG_ACCOUNT,
   MINT_ACCOUNT,
   TREASURY,
   getMintTokenVaultAddress,
   provider,
   program,
   showConfig
};
