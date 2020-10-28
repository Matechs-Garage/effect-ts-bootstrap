import "@effect-ts/core/Operators"

import * as Arr from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Q from "@effect-ts/core/Effect/Queue"
import * as Ref from "@effect-ts/core/Effect/Ref"
import * as S from "@effect-ts/core/Effect/Stream"
import { flow, pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"
import * as O from "@effect-ts/system/Option"
import { transducer } from "@effect-ts/system/Stream/Transducer"
import * as fs from "fs"
import * as path from "path"

export function readFileStreamBuffer(path: string) {
  return new S.Stream<unknown, never, Buffer>(
    M.gen(function* ($) {
      const nodeStream = yield* $(
        T.effectTotal(() => fs.createReadStream(path))["|>"](
          M.makeExit((rs) =>
            T.effectTotal(() => {
              rs.close()
              console.debug("CLOSE CALLED")
            })
          )
        )
      )

      const queue = yield* $(
        Q.makeUnbounded<T.IO<O.Option<never>, [Buffer]>>()["|>"](
          M.makeExit((q) => q.shutdown)
        )
      )

      yield* $(
        T.effectTotal(() => {
          nodeStream.on("data", (chunk: Buffer) => {
            T.run(queue.offer(T.succeed([chunk])))
          })
          nodeStream.on("end", () => {
            T.run(queue.offer(T.fail(O.none)))
          })
          nodeStream.on("error", (err) => {
            T.run(queue.offer(T.die(err)))
          })
        })["|>"](
          M.makeExit(() =>
            T.effectTotal(() => {
              nodeStream.removeAllListeners()
            })
          )
        )
      )

      return queue.take["|>"](T.flatten)
    })
  )
}

const transduceMessages = transducer<unknown, never, Buffer, string, unknown>(
  M.gen(function* ($) {
    const leftover = yield* $(Ref.makeRef(""))

    return (o) =>
      T.gen(function* ($) {
        if (O.isSome(o)) {
          yield* $(
            leftover["|>"](
              Ref.update((l) => `${l}${Buffer.concat([...o.value]).toString("utf-8")}`)
            )
          )
        }

        const current = yield* $(leftover.get)

        if (current.length === 0) {
          return []
        }

        if (current.endsWith("\n")) {
          const output = current.split("\n")

          yield* $(leftover.set(""))

          return output
        }

        const split = current.split("\n")

        if (split.length === 1) {
          yield* $(leftover.set(split[0]))

          return []
        } else {
          yield* $(leftover.set(split[split.length - 1]))

          const init = Arr.init(split)

          if (O.isSome(init)) {
            return init.value
          }
        }

        return []
      })
  })
)

export const makeMessageQueue = (path: string) =>
  M.gen(function* ($) {
    const queue = yield* $(
      Q.makeUnbounded<O.Option<string>>()["|>"](M.makeExit((q) => q.shutdown))
    )

    yield* $(
      readFileStreamBuffer(path)
        ["|>"](S.aggregate(transduceMessages))
        ["|>"](S.chain(flow(O.some, queue.offer, S.fromEffect)))
        ["|>"](S.runDrain)
        ["|>"](T.tap(() => queue.offer(O.none)))
        ["|>"](T.interruptible)
        ["|>"](T.fork)
        ["|>"](M.makeExit((f) => F.interrupt(f)["|>"](T.andThen(F.join(f)))))
    )

    return { queue }
  })

export interface MessageQueue extends _A<ReturnType<typeof makeMessageQueue>> {}

export const MessageQueue = tag<MessageQueue>()

export const LiveMessageQueue = (path: string) =>
  L.fromManaged(MessageQueue)(makeMessageQueue(path))

export const program = T.gen(function* ($) {
  const { queue } = yield* $(MessageQueue)

  yield* $(
    T.effectTotal(() => {
      console.log("RUNNING")
    })
  )

  while (true) {
    const message = yield* $(queue.take)

    switch (message._tag) {
      case "None": {
        return
      }
      case "Some": {
        yield* $(
          T.effectTotal(() => {
            console.log(message.value)
          })
        )
      }
    }
  }
})

const cancel = pipe(
  program,
  T.provideSomeLayer(LiveMessageQueue(path.join(__dirname, "messages.log"))),
  T.runMain
)

process.on("SIGTERM", () => {
  cancel()
})

process.on("SIGINT", () => {
  cancel()
})
