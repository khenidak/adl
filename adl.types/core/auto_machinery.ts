import * as adltypes from './adl'


/*
 * AutoNormalized is an empty implementation of Normalizer. It is provided as a short cut to
 * to allow api designers to express that the entire api definition declaratively.
 *
 * Note: we have used the word Auto (not noop) so folks would not confuse it with a
 * normalizer that does nothing or cancels out the declarative constraints they have.
*/


export class AutoNormalizer<N extends adltypes.Normalized> implements adltypes.Normalizer<N> {
 Default(obj: N, errors: adltypes.errorList) { /* NOOP */ }
    Validate (old: N | undefined, newObject: N, errors: adltypes.errorList) { /* NOOP */ }
}


export class AutoVersioner<N extends adltypes.Normalized, V extends adltypes.Versioned> implements adltypes.Versioner<N,V>{
    // Normalize performs conversion from versioned api type => normalized api type
    Normalize(versioned: V, normalized: N, errors: adltypes.errorList) : void{ /* NOOP */ }
    // Convert performs conversion from normalized api type => versioned api type
    Convert(normalized: N, versioned: V, errors: adltypes.errorList): void { /* NOOP */ }
}
