/**
 * In-process EventEmitter bus.
 * Every service imports this singleton and calls bus.emit / bus.on.
 * To upgrade to RabbitMQ/Kafka later, replace emit() and on() here —
 * all service code stays identical.
 *
 * Defined event names (add as you build each service):
 *
 *  product.created        { productId, sellerId, storeId }
 *  order.placed           { orderId, buyerId, items, totalAmount }
 *  order.cancelled        { orderId, items }
 *  payment.captured       { orderId, sellerId }
 *  shipment.created       { shipmentId, orderId, sellerId, trackingNumber }
 *  shipment.delivered     { shipmentId, orderId, sellerId }
 *  review.approved        { reviewId, productId }
 *  inventory.stock_low    { productId, sellerId, quantity }
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // one per service subscriber
    }

    /**
     * Publish an event with a structured payload.
     * @param {string} event  - e.g. 'order.placed'
     * @param {object} payload
     */
    publish(event, payload) {
        console.log(`[EventBus] → ${event}`, JSON.stringify(payload));
        this.emit(event, { event, payload, timestamp: new Date().toISOString() });
    }

    /**
     * Subscribe to an event.
     * @param {string}   event
     * @param {Function} handler  - receives ({ event, payload, timestamp })
     */
    subscribe(event, handler) {
        this.on(event, handler);
    }
}

// Singleton — all requires get the same instance within a process
module.exports = new EventBus();