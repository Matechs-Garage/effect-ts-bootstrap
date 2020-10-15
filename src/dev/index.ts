import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import { CryptoLive, PBKDF2ConfigLive } from "../crypto"
import * as HTTP from "../http"
import { App } from "../program"
import { LiveBar } from "../program/Bar"
import { LiveFoo } from "../program/Foo"
import { TestContainersLive } from "./containers"

const Bootstrap = pipe(
  L.allPar(HTTP.Live, LiveFoo, LiveBar),
  L.using(CryptoLive),
  L.using(
    L.allPar(
      HTTP.config({
        host: "0.0.0.0",
        port: 8081
      }),
      PBKDF2ConfigLive
    )
  ),
  L.using(TestContainersLive("dev"))
)

// main function (unsafe)
function main() {
  return pipe(App, T.provideSomeLayer(Bootstrap), T.runMain)
}

const cancel = main()

// cancel execution on sigterm
process.on("SIGTERM", () => {
  cancel()
})

// cancel execution on ctrl+c
process.on("SIGINT", () => {
  cancel()
})
