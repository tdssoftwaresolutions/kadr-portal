/**
 * Server-Sent Events (SSE) Manager
 *
 * Manages SSE connections for real-time updates (case correspondence, notifications).
 * Clients connect via GET /api/sse/events and receive updates when new messages arrive.
 */

// Map: userId -> Set of SSE response objects
const connections = new Map()

function addConnection (userId, res) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId).add(res)

  // Remove on disconnect
  res.on('close', () => {
    const userConns = connections.get(userId)
    if (userConns) {
      userConns.delete(res)
      if (userConns.size === 0) {
        connections.delete(userId)
      }
    }
  })
}

function removeConnection (userId, res) {
  const userConns = connections.get(userId)
  if (userConns) {
    userConns.delete(res)
    if (userConns.size === 0) {
      connections.delete(userId)
    }
  }
}

/**
 * Send an event to a specific user.
 * @param {string} userId
 * @param {string} event - Event name (e.g., 'new_message', 'notification')
 * @param {object} data - Event payload
 */
function sendToUser (userId, event, data) {
  const userConns = connections.get(userId)
  if (!userConns || userConns.size === 0) return 0

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  let sent = 0
  for (const res of userConns) {
    try {
      res.write(payload)
      sent++
    } catch (err) {
      // Connection broken, remove it
      userConns.delete(res)
    }
  }
  return sent
}

/**
 * Send an event to multiple users.
 * @param {string[]} userIds
 * @param {string} event
 * @param {object} data
 */
function sendToUsers (userIds, event, data) {
  let totalSent = 0
  for (const userId of userIds) {
    totalSent += sendToUser(userId, event, data)
  }
  return totalSent
}

/**
 * Broadcast to all connected users (e.g., system announcements).
 */
function broadcast (event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  let sent = 0
  for (const [, userConns] of connections) {
    for (const res of userConns) {
      try {
        res.write(payload)
        sent++
      } catch (err) {
        userConns.delete(res)
      }
    }
  }
  return sent
}

function getConnectionCount () {
  let count = 0
  for (const [, conns] of connections) {
    count += conns.size
  }
  return count
}

module.exports = {
  addConnection,
  removeConnection,
  sendToUser,
  sendToUsers,
  broadcast,
  getConnectionCount
}
