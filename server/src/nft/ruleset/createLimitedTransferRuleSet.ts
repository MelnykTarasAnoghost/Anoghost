import {
  RuleSetRevisionV2,
  createOrUpdateWithBufferV1,
  findRuleSetPda,
  pubkeyListMatchV2,
} from '@metaplex-foundation/mpl-token-auth-rules';
import { generateSigner, publicKey, some, Umi } from '@metaplex-foundation/umi';

export async function createTransferRuleSet(
  umi: Umi,
  name: string,
  allowedWallets: string[]
) {
  const owner = umi.identity;
  const ruleSetPda = findRuleSetPda(umi, { owner: owner.publicKey, name });

  const revision: RuleSetRevisionV2 = {
    libVersion: 2,
    name,
    owner: owner.publicKey,
    operations: {
      Transfer: pubkeyListMatchV2('Destination', allowedWallets.map(w => publicKey(w))),
    },
  };

  await createOrUpdateWithBufferV1(umi, {
    payer: owner,
    ruleSetPda,
    // @ts-ignore
    ruleSetRevision: some(revision),
  }).sendAndConfirm(umi);

  return ruleSetPda;
}
