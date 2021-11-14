const anchor = require('@project-serum/anchor');
const utf8 = anchor.utils.bytes.utf8;
const { SystemProgram } = anchor.web3;
const fs = require("fs");

const {
   TOKEN_PROGRAM_ID,
   createMint,
   createTokenAccount,
} = require("../jslib/utils");

const {
   DOORMAN_SEED,
   DOORMAN_WHITELIST,
   DOORMAN_CONFIG,
   MINT,
   program,
   provider
} = require("./config");

const MAX_ADDRESS_PER_ADD = 30;

async function displayWhitelistAccount(message) {
   let whitelist = await program.account.whitelist.fetch(DOORMAN_WHITELIST);
   console.log(message + ":\n", whitelist);
}

async function addAddresses() {

   // the address that should get added to the whitelist
   //const whitelistAddress = new anchor.web3.PublicKey('s42MvA8XdPV5u5KeCkR2caMwdm24xYjXLupjdrtswJ4');
   var addys;
   //read in the file with our addresses
   addys = fs.readFileSync('./addys.txt', "utf8")

   addys = addys.split('\n');

   // chunk and add
   var i,j, temporary, chunk = MAX_ADDRESS_PER_ADD;
   for (i = 0,j = addys.length; i < j; i += chunk) {
      temporary = addys.slice(i, i + chunk);

      let addressesToAdd = [];
      for (let addy of temporary){
         addy = addy.trim();
         if (addy !== "") {
            addressesToAdd.push(new anchor.web3.PublicKey(addy));
         }
      }

      // add this chunk of addresses
      tx = await program.rpc.addWhitelistAddresses(addressesToAdd, {
         accounts: {
            config: DOORMAN_CONFIG,
            whitelist: DOORMAN_WHITELIST,
            authority: provider.wallet.publicKey,
         },
      });

      console.log("added " + temporary.length + " whitelist addresses: " + tx);
   }

   displayWhitelistAccount("whitelist: \n");
}

addAddresses();
