import * as O from "@effect-ts/core/Classic/Option"
import { flow, pipe } from "@effect-ts/core/Function"
import type { TypeOf } from "@effect-ts/core/Newtype"
import { newtype, typeDef } from "@effect-ts/core/Newtype"
import * as S from "@effect-ts/core/Sync"
import * as I from "@effect-ts/monocle/Iso"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, FastCheckURI, make, opaque } from "@effect-ts/morphic"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { fail } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

import { Common, commonErrorIds, Id } from "./common"
import { validation } from "./validation"

export const userErrorIds = {
  ...commonErrorIds,
  email_length: "email_length",
  email_shape: "email_shape",
  user_id_negative: "user_id_negative"
}

const Email_ = typeDef<string>()("Email")
export interface Email extends TypeOf<typeof Email_> {}
export const Email = newtype<Email>()(Email_)

const EmailField_ = make((F) =>
  F.interface({
    email: F.newtypeIso(
      I.newtype<Email>(),
      F.string({
        conf: {
          [FastCheckURI]: (_, { module: fc }) =>
            fc.emailAddress().filter((_) => _.length > 0 && _.length <= 255),
          [DecoderURI]: (_) => ({
            validate: (u, c) =>
              pipe(
                _.validate(u, c),
                S.chain((s) =>
                  s.length > 0 && s.length <= 255
                    ? /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
                        s
                      )
                      ? S.succeed(s)
                      : fail([
                          {
                            id: userErrorIds.email_shape,
                            name: "email",
                            message: "email doesn't match the required pattern",
                            context: {
                              ...c,
                              actual: s
                            }
                          }
                        ])
                    : fail([
                        {
                          id: userErrorIds.email_length,
                          name: "email",
                          message: "email should be between 0 and 255 characters long",
                          context: {
                            ...c,
                            actual: s
                          }
                        }
                      ])
                )
              )
          })
        }
      })
    )
  })
)

export interface EmailField extends AType<typeof EmailField_> {}
export interface EmailFieldRaw extends EType<typeof EmailField_> {}

export const EmailField = opaque<EmailFieldRaw, EmailField>()(EmailField_)

const CreateUser_ = make((F) => F.intersection(EmailField(F))())

export interface CreateUser extends AType<typeof CreateUser_> {}
export interface CreateUserRaw extends EType<typeof CreateUser_> {}

export const CreateUser = opaque<CreateUserRaw, CreateUser>()(CreateUser_)

const User_ = make((F) => F.intersection(Id(F), EmailField(F), Common(F))())

export interface User extends AType<typeof User_> {}
export interface UserRaw extends EType<typeof User_> {}

export const User = opaque<UserRaw, User>()(User_)

export const decodeUser = strictDecoder(User).decode
export const encodeUser = encoder(User).encode
export const encodeCreateUser = encoder(CreateUser).encode
export const decodeCreateUser = strictDecoder(CreateUser).decode

export const userErrors = (_: DecodingError) =>
  _.id != null && _.id in userErrorIds && _.message != null && _.message.length > 0
    ? O.some(_.message)
    : O.none

export const validateUser = validation(User, userErrors)
export const validateCreateUser = validation(CreateUser, userErrors)

export const UserIdField = make((F) =>
  F.interface({
    userId: F.number({
      conf: {
        [FastCheckURI]: (_, { module: fc }) => fc.integer(1, 1000000),
        [DecoderURI]: (_) => ({
          validate: (u, c) =>
            pipe(
              _.validate(u, c),
              S.chain((s) =>
                s > 0
                  ? S.succeed(s)
                  : fail([
                      {
                        id: userErrorIds.user_id_negative,
                        name: "userId",
                        message: "userId should be positive",
                        context: {
                          ...c,
                          actual: s
                        }
                      }
                    ])
              )
            )
        })
      }
    })
  })
)
