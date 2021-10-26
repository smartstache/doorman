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

### Configuration

A doorman is set up with the following:
- a go live date
- a list of whitelisted addresses
- a cost in SOL for a mint token
- a treasury for the program to send the SOL to

### Setup

This is a standard [Anchor](https://github.com/project-serum/anchor) program so standard instructions apply.

The /scripts directory contains a bunch of scripts that can be run to test everything out on a running
solana-test-validator. Here's the steps to try it out:

- fire up a localnet: ```solana-test-validator```
- deploy: ```anchor deploy```
- initialize: ```anchor run initialize```
  - this will create a doorman with default settings + new token mint
- copy the 3 accounts that the initialize script spit out into the config.js file
- edit the add_address.js file with an address you'd like to put on the whitelist 
and add it: ```anchor run add-address```
- now update Anchor.toml and change the wallet to the address that was whitelisted
- run a test mint: ```anchor run test-mint```
  - this will deposit a mint token into an account owned by the wallet, and send the payed SOL to the treasury

Also worth noting is that you can run the tests against your running localnet validator instead of the test firing up its own using: ```anchor test --skip-local-validator```

### TODO
This still needs a ton of work. Here's a very incomplete list of things that I need to add. PRs super welcome:
- add multiple addresses at the same time
- current whitelist size is limited to around 300 atm. this is due to account size limitations when constructing
  an account the way I'm doing it with Anchor (10k)
- address removal
- better candy machine integration. use cpi to send the token to the candy machine instead of back to the user, who'll
  then need to execute a 2nd transaction
- a working sample app with candy machine integration
- easier mint token account creation for the payer ..?
- store bumps ..?
- switch back to PDA for config ..?

### Credits & Resources

- all the great examples from [Anchor](https://github.com/project-serum/anchor) 
- the source code in [Metaplex](https://github.com/metaplex-foundation/metaplex)
- good explanation of PDAs: https://www.brianfriel.xyz/understanding-program-derived-addresses/
- i straight lifted the mint token account/authority stuff from: https://hackmd.io/@ironaddicteddog/anchor_example_escrow




