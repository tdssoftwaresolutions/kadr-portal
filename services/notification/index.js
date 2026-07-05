const notificationService = require('./notificationService')
const triggerRuleEngine = require('./triggerRuleEngine')
const codeTriggerRegistry = require('./codeTriggerRegistry')

module.exports = {
  ...notificationService,
  triggerRuleEngine,
  registerTableTrigger: codeTriggerRegistry.registerTableTrigger,
  registerRuleTrigger: codeTriggerRegistry.registerRuleTrigger
}
