import * as O from "@effect-ts/core/Classic/Option"
import * as S from "@effect-ts/core/Classic/Sync"
import { flow } from "@effect-ts/core/Function"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, FastCheckURI, make, opaque } from "@effect-ts/morphic"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { fail } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

import { Common, commonErrorIds, Id } from "./common"
import { validation } from "./validation"

export const credentialErrorIds = {
  ...commonErrorIds,
  password_length: "password_length"
}

const CreateCredential_ = make((F) =>
  F.interface({
    email: F.string({
      conf: {
        [FastCheckURI]: (_, { module: fc }) =>
          fc.string({ minLength: 8, maxLength: 32 }),
        [DecoderURI]: (_) => ({
          decode: flow(
            _.decode,
            S.chain((s) =>
              s.length > 8 && s.length <= 32
                ? S.succeed(s)
                : fail([
                    {
                      actual: s,
                      id: credentialErrorIds.password_length,
                      name: "password",
                      message: "password should be have between 8 and 32 characters"
                    }
                  ])
            )
          )
        })
      }
    })
  })
)

export interface CreateCredential extends AType<typeof CreateCredential_> {}
export interface CreateCredentialRaw extends EType<typeof CreateCredential_> {}

export const CreateCredential = opaque<CreateCredentialRaw, CreateCredential>()(
  CreateCredential_
)

const CredentialHash_ = make((F) =>
  F.interface({
    password: F.string(),
    salt: F.string()
  })
)

export interface CredentialHash extends AType<typeof CredentialHash_> {}
export interface CredentialHashRaw extends EType<typeof CredentialHash_> {}

export const CredentialHash = opaque<CredentialHashRaw, CredentialHash>()(
  CredentialHash_
)

const Credential_ = make((F) => F.intersection([Id(F), CredentialHash(F), Common(F)]))

export interface Credential extends AType<typeof Credential_> {}
export interface CredentialRaw extends EType<typeof Credential_> {}

export const Credential = opaque<CredentialRaw, Credential>()(Credential_)

export const decodecredential = strictDecoder(Credential).decode
export const encodecredential = encoder(Credential).encode
export const encodeCreatecredential = encoder(CreateCredential).encode
export const decodeCreatecredential = strictDecoder(CreateCredential).decode

export const credentialErrors = (_: DecodingError) =>
  _.id != null &&
  _.id in credentialErrorIds &&
  _.message != null &&
  _.message.length > 0
    ? O.some(_.message)
    : O.none

export const validateCredential = validation(Credential, credentialErrors)

export const validateCreatecredential = validation(CreateCredential, credentialErrors)