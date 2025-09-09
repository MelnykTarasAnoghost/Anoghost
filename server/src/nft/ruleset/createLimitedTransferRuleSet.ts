import {
  RuleSetRevisionV2,
  createOrUpdateWithBufferV1,
  findRuleSetPda,
  pubkeyListMatchV2,
} from '@metaplex-foundation/mpl-token-auth-rules';
import {
  publicKey,
  Umi,
  Pda,
  Signer,
} from '@metaplex-foundation/umi';

export async function createTransferRuleSet(
  umi: Umi,
  name: string,
  allowedWallets: string[]
): Promise<Pda> {
  const owner: Signer = umi.identity; 

  const ruleSetAccountPda: Pda = findRuleSetPda(umi, { owner: owner.publicKey, name });
  console.log(`RuleSet PDA for "${name}": ${ruleSetAccountPda.toString()}`);

  const revisionPayload: RuleSetRevisionV2 = {
    libVersion: 2,
    name,
    owner: owner.publicKey,
    operations: {
      Transfer: pubkeyListMatchV2(
        'Destination',
        allowedWallets.map(w => publicKey(w))
      ),
    },
  };

  console.log('Passing this revision payload to createOrUpdateWithBufferV1:', JSON.stringify(revisionPayload, (key, value) =>
    (typeof value === 'object' && value !== null && typeof value.toString === 'function' && (value.constructor.name === 'PublicKey' || value.constructor.name === 'Pda'))
      ? value.toString()
      : (typeof value === 'bigint' ? value.toString() : value)
  , 2));

  try {
    const txBuilder = createOrUpdateWithBufferV1(umi, {
      payer: owner,
      ruleSetRevision: revisionPayload,
      ruleSetName: name
    });

    const result = await txBuilder.sendAndConfirm(umi);
    // @ts-ignore
    console.log(ruleSetAccountPda)
    return ruleSetAccountPda;

  } catch (error) {
    console.error(`Failed to create/update RuleSet "${name}":`, error);
    if (!(error instanceof Error)) {
      console.error('Full error object:', error);
    }
    throw new Error(`Failed to create/update rule set "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}
