### Overview

Doorman is a Solana program created to enable a whitelist of allowed address access to a candy machine.

It works as follows:
- create a new mint
- set up a separate candy machine for the whitelist, which is configured to accept the new mint token instead of SOL
- set up a doorman with a vault containing the mint tokens
- add whitelist addresses to the doorman's list
- a user can now pay SOL for a mint token, which can then be used in the candy machine
- when this happens, the address is removed from the whitelist


### Status

This project is currently just a proof of concept. It's not even alpha and certainly not deployed anywhere yet. 
Use at your own risk.

Apologies if this documentation is incomplete. Reach out to me on Twitter if you have any questions, comments, suggestions, etc: @silostack

Alternatively, come hang out in the Kaizen Corps #dev-chat Discord channel. I'm there all day: https://discord.gg/UE7JMaybGf

### Configuration

A doorman is set up with the following:
- a go live date
- a list of whitelisted addresses
- a cost in SOL for a mint token
- a treasury for the program to send the SOL to

### Setup (just doorman)

This is a standard [Anchor](https://github.com/project-serum/anchor) program so standard instructions apply.

The /scripts directory contains a bunch of scripts that can be run to test everything out on a running
solana-test-validator. Here's the steps to try it out:

- fire up a localnet: ```solana-test-validator```
- deploy: ```anchor deploy```
- initialize: ```anchor run initialize```
  - this will create a doorman with default settings + new token mint
- copy the 3 accounts that the initialize script spit out into the config.js file
- edit the add_addresses.js file with an address you'd like to put on the whitelist 
and add it: ```anchor run add-address```
- now update Anchor.toml and change the wallet to the address that was whitelisted
- run a test mint: ```anchor run test-mint```
  - this will deposit a mint token into an account owned by the wallet, and send the payed SOL to the treasury

Also worth noting is that you can run the tests against your running localnet validator instead of the test firing up its own using: ```anchor test --skip-local-validator```

### Full Setup w/Candy Machine

Here's the full list of steps to set up a candy machine + doorman on devnet.

- create a mint: ```spl-token create-token --decimals 0```
  - save the mint address (e.g. BNbYgmELT2o1VbGcg5vq7EK2AWL7UmLe9dhizMdGy8Pg)
- create a token account for it: ```spl-token create-account BNbYgmELT2o1VbGcg5vq7EK2AWL7UmLe9dhizMdGy8Pg```
  - save the account (e.g. 4a3G1MUiAUvssZWbHG9WyM2GZXLyZstVp4nQkwRLP7aP)
- mint some tokens into the account: ```spl-token mint BNbYgmELT2o1VbGcg5vq7EK2AWL7UmLe9dhizMdGy8Pg 10000 ```
- now go through steps to set up your candy machine, making sure to specify the mint + spl token account that you just created, when executing the create_candy_machine command
  - save the candy machine id (this is what the create_candy_machine command spits out; the candy machine pubkey)
  - save the candy machine config address (this can be found in the .cache/devnet-temp file that gets created; it's the "config" pubkey)
- go into doorman, and update the following fields in .env with the ones you just saved above:
    - REACT_APP_CANDYMACHINE_CONFIG == the 'config' key from the candy machine config file
    - REACT_APP_CANDYMACHINE_ID == the candy machine public key you got when executing the create_candy_machine command (also found as the candyMachineAddress in the candy machine config file)
    - REACT_APP_MINT == the mint you created
    - CANDYMACHINE_INITIALIZOR_TOKEN_ACCOUNT == the token account that was created, containing a bunch of minting coins
    - REACT_APP_CANDYMACHINE_TREASURY == the token account you created (or a different one), this is where the CM will store the tokens that are used to purchase an NFT
- get ready to initialize your doorman
  - make sure you've checked Anchor.toml so that you're using the appropriate cluster + authority/keypair you used when setting up the candy machine
  - set the REACT_APP_DOORMAN_TREASURY in .env to the wallet that will contain the SOL when whitelisted users purchase their mint token
- now initialize doorman: ```anchor run initialize```
  - save the config account to use and enter it into .env as REACT_APP_DOORMAN_CONFIG
  - save the whitelist account public key as REACT_APP_DOORMAN_WHITELIST in .env
- if you want, you can update doorman's config: ```anchor run update-config```
- add any addresses you'd like to whitelist to the addy.txt file and run: ```anchor run add-addresses```
- update app/src/utils/config.js to use devnet
- now fire up the /app: ```yarn start```
- if the wallet you're connecting with has been properly added, you should see the message "Your address is on the whitelist!"
- click the "purchase mint token" button to purchase a minting token with SOL
- then click the "mint" button to mint an nft using the token you just purchased


### TODO
This still needs a ton of work. Here's a very incomplete list of things that I need to add. PRs super welcome:
- add multiple addresses at the same time
- current whitelist size is limited to around 300 atm. this is due to account size limitations when constructing
  an account the way I'm doing it with Anchor (10k)
- address removal
- add a button to perform the purchase + mint in a single transaction  
- easier mint token account creation for the payer ..?
- store bumps ..?
- switch back to PDA for config ..?
- consolidate the config for the anchor scripts into .env or something
- fix up the UI so it doesn't look like ass ..?

### Help

Would love some help on this. I know there's already a lot of devs out there looking for on-chain whitelist capability.
And of course... tips are always appreciated: 7VyBHkyQw266uF5RfBTHAeuCWt8bSV12Xp8jfPsgj7fa


### Credits & Resources

- all the great examples from [Anchor](https://github.com/project-serum/anchor) 
- the source code in [Metaplex](https://github.com/metaplex-foundation/metaplex)
- good explanation of PDAs: https://www.brianfriel.xyz/understanding-program-derived-addresses/
- i straight lifted the mint token account/authority stuff from: https://hackmd.io/@ironaddicteddog/anchor_example_escrow
- https://github.com/exiled-apes/candy-machine-mint was a great starter
- help from https://github.com/hogyzen12 



