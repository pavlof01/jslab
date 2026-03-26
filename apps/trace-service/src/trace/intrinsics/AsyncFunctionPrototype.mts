import { bootstrapPrototype } from './bootstrap.mts';
import type { Realm } from '../index.mts';

export function bootstrapAsyncFunctionPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
