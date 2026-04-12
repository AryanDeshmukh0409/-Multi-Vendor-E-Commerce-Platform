const axios = require('axios');
const EventEmitter = require('events');

/**
 * Cross-service HTTP Event Bus
 * 
 * Each service registers event handlers locally.
 * When an event is published, it fires locally AND
 * sends HTTP POST to subscribed services.
 * 
 * This replaces direct inter-service HTTP calls with
 * a proper event-driven architecture.
 */
class HttpEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.subscribers = {};
  }

  /**
   * Register a remote subscriber for an event
   * @param {string} event - e.g. 'order.placed'
   * @param {string} url   - e.g. 'http://localhost:4006/events'
   */
  registerRemote(event, url) {
    if (!this.subscribers[event]) this.subscribers[event] = [];
    this.subscribers[event].push(url);
    console.log(`[EventBus] Registered remote subscriber for ${event} → ${url}`);
  }

  /**
   * Publish event locally + to all remote subscribers
   */
  async publish(event, payload) {
    const envelope = { event, payload, timestamp: new Date().toISOString() };
    console.log(`[EventBus] → ${event}`, JSON.stringify(payload));

    // Fire locally
    this.emit(event, envelope);

    // Fire to remote subscribers
    const remotes = this.subscribers[event] || [];
    for (const url of remotes) {
      try {
        await axios.post(url, envelope, { timeout: 3000 });
        console.log(`[EventBus] ✓ Delivered ${event} to ${url}`);
      } catch (err) {
        console.error(`[EventBus] ✗ Failed to deliver ${event} to ${url}:`, err.message);
      }
    }
  }

  subscribe(event, handler) {
    this.on(event, handler);
  }
}

module.exports = new HttpEventBus();