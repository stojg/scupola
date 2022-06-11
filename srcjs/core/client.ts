import {
  MultiplayerClientAvatar,
  MultiplayerClientUser,
} from '@cryptovoxels/multiplayer-client/dist/cjs/internal/io/MultiplayerClientInput'
import { createMultiplayerClient } from '@cryptovoxels/multiplayer-client'
import * as messages from '@cryptovoxels/messages'
import { createConsoleLoggerEngine, createLogger } from '@cryptovoxels/util-logger'

const logger = createLogger(createConsoleLoggerEngine(console, 'info'))

export const createClient = (
  uuid: string,
  cb: () => MultiplayerClientAvatar,
  stateCallback: (msg: messages.Message.ServerStateMessage) => void
) => {
  const multiplayerWebSocketUrl = new URL('wss://mp-uat.crvox.com')
  // @ts-ignore
  const user: MultiplayerClientUser = {
    token: (): null => null,
    avatar: cb,
    parcel: (): null => null,
    uuid: uuid,
  }
  const client = createMultiplayerClient(
    {
      version: '1',
      webSocketLocation: multiplayerWebSocketUrl.toString(),
    },
    user,
    logger
  )

  client.addEventListener('connected', async () => {
    logger.info(`Client connected`)
  })

  client.addEventListener('messageReceived', ({ message }) => {
    // const messageType = messages.MessageType[message.type]
    // logger.debug('Message received at client: ${messageType}', { messageType })
    stateCallback(message)
  })

  client.addEventListener('disconnected', () => {
    logger.info(`Client disconnected`)
  })
  return client
}
