import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { addAuthMiddleware, addRegistration } from "../api"
import { CryptoLive, PBKDF2ConfigLive } from "../crypto"
import { DbLive, PgClient, PgPoolLive, TestMigration, withPoolClient } from "../db"
import { TestContainersLive } from "../dev/containers"
import { PgConfigTest } from "../dev/db"
import * as HTTP from "../http"
import { CredentialPersistenceLive } from "../persistence/credential"
import { TransactionsLive } from "../persistence/transactions"
import { UserPersistenceLive } from "../persistence/user"

export const addHome = HTTP.addRoute((r) => r.req.url === "/")(({ res }) =>
  T.gen(function* (_) {
    const { client } = yield* _(PgClient("main"))

    const result = yield* _(
      T.fromPromiseDie(() =>
        client.query(
          "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
          ["users"]
        )
      )
    )

    return result.rows
  })
    ["|>"](withPoolClient("main"))
    ["|>"](T.result)
    ["|>"](
      T.chain((ex) =>
        T.effectTotal(() => {
          res.end(JSON.stringify(ex))
        })
      )
    )
)

export const Main = pipe(
  HTTP.create,
  addHome,
  addRegistration,
  addAuthMiddleware,
  HTTP.drain
)

export const CryptoMain = CryptoLive["<<<"](PBKDF2ConfigLive)

export const PersistenceMain = TransactionsLive["<+<"](
  UserPersistenceLive["+++"](CredentialPersistenceLive)
)

export const DbMain = DbLive("main")
  ["<<<"](TestMigration("main"))
  ["<+<"](PgPoolLive("main"))
  ["<<<"](PgConfigTest("main")("dev"))
  ["<<<"](TestContainersLive("dev"))

export const ServerConfigMain = HTTP.serverConfig({
  host: "0.0.0.0",
  port: 8081
})

export const ServerMain = HTTP.LiveHTTP["<<<"](ServerConfigMain)

export const BootstrapMain = PersistenceMain["<+<"](DbMain)
  ["+++"](ServerMain)
  ["<<<"](CryptoMain)

// main function (unsafe)
export function main() {
  return Main["|>"](T.provideSomeLayer(BootstrapMain))["|>"](T.runMain)
}
