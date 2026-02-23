import { Descriptor, Value } from '../value.mts';
import { X } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { DefinePropertyOrThrow } from '../index.mts';
import type { Realm } from '../index.mts';

export function bootstrapGeneratorFunctionPrototype(realmRec: Realm) {
  const generatorPrototype = realmRec.Intrinsics['%GeneratorFunction.prototype.prototype%'];

  const generator = bootstrapPrototype(realmRec, [
    ['prototype', generatorPrototype, undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'GeneratorFunction');

  X(DefinePropertyOrThrow(generatorPrototype, Value('constructor'), Descriptor({
    Value: generator,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%GeneratorFunction.prototype%'] = generator;
}
