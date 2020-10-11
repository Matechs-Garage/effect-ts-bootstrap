import * as O from "@effect-ts/core/Classic/Option"
import * as S from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, make, opaque } from "@effect-ts/morphic"
import { decoder } from "@effect-ts/morphic/Decoder"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { fail } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"

import { validation } from "./validation"

export const commonErrorIds = {
  bad_id_format: "bad_id_format"
}

const Id_ = make((F) =>
  F.interface({
    id: F.bigint({
      conf: {
        [DecoderURI]: (_) => ({
          decode: (u) =>
            pipe(
              _.decode(u),
              S.catchAll(() =>
                fail([
                  {
                    actual: u,
                    id: commonErrorIds.bad_id_format,
                    name: "id",
                    message: "id should be a big integer encoded as a string"
                  }
                ])
              )
            )
        })
      }
    })
  })
)

export interface Id extends AType<typeof Id_> {}
export interface IdRaw extends EType<typeof Id_> {}

export const Id = opaque<IdRaw, Id>()(Id_)

export const commonErrors = (_: DecodingError) =>
  _.id != null && _.id in commonErrorIds && _.message != null && _.message.length > 0
    ? O.some(_.message)
    : O.none

export const encodeId = encoder(Id).encode
export const decodeId = decoder(Id).decode
export const validateId = validation(Id, commonErrors)

const Common_ = make((F) =>
  F.interface({
    createdAt: F.date({
      conf: {
        [DecoderURI]: (_) => ({
          decode: (u) => (u instanceof Date ? S.succeed(u) : _.decode(u))
        })
      }
    })
  })
)

export interface Common extends AType<typeof Common_> {}
export interface CommonRaw extends EType<typeof Common_> {}

export const Common = opaque<CommonRaw, Common>()(Common_)
