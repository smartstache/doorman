## Minor

  - Make sure to use `Signer` over `#[account(mut, signer)]...AccountInfo<'info>,`. Happens in some places not others. We have the same problem, was hard to find them all.
  - You can use `Program<'info, System>`, and `Program<'info, Token>` instead of `#[account(address = system_program::ID)]`
  - Use `constraint = ` instead of strings
  - Should the config program account be at a PDA of `mint` for easy lookup?
  - Config is mut in PurchaseMintToken, but probably doesn't need to be.
  - The whitelist check could be done with a `has_one`
  - Same goes for checking for mint_token_vault on config

## Medium

  - The authority on mint token vault should be a pda including the mint_token_vault address. This limits the blast radius if there's any kind of other bug where you can send yourself tokens from someone else's vault.
  - The creator of the doorman does not have to be the mint authority, but there can only be one doorman per mint (because of the pda on mint_token_vault). Not sure if this is a problem, but someone could frontrun.

## Major

   Didn't find anything here. Good work!