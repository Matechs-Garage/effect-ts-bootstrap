import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as R from "../router"
import { accessBarM } from "./Bar"
import { accessFooM } from "./Foo"

export const home = R.route(({ req, res }, next) =>
  req.url === "/"
    ? accessFooM((foo) =>
        T.delay(200)(
          T.effectTotal(() => {
            res.end(foo)
          })
        )
      )
    : next
)

export const bar = R.route(({ req, res }, next) =>
  req.url === "/bar"
    ? accessBarM((bar) =>
        T.delay(200)(
          T.effectTotal(() => {
            res.end(bar)
          })
        )
      )
    : next
)

export function middle<R>(routes: R.Routes<R>) {
  return pipe(
    routes,
    R.middleware((cont) => (request, next) =>
      request.req.url === "/middle"
        ? T.effectTotal(() => {
            request.res.end("Middle!")
          })
        : cont(request, next)
    )
  )
}

export const Live = pipe(R.init, home, bar, middle, R.run, L.fromRawEffect)
