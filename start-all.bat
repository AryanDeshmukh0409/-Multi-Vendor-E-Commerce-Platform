@echo off
echo Starting all services...

start "auth-service" cmd /k "cd auth-service && node index.js"
start "seller-service" cmd /k "cd seller-service && node index.js"
start "catalog-service" cmd /k "cd catalog-service && node index.js"
start "inventory-service" cmd /k "cd inventory-service && node index.js"
start "order-service" cmd /k "cd order-service && node index.js"
start "payment-service" cmd /k "cd payment-service && node index.js"
start "shipping-service" cmd /k "cd shipping-service && node index.js"
start "review-service" cmd /k "cd review-service && node index.js"
start "messaging-service" cmd /k "cd messaging-service && node index.js"
start "search-service" cmd /k "cd search-service && node index.js"
start "analytics-service" cmd /k "cd analytics-service && node index.js"
start "notification-service" cmd /k "cd notification-service && node index.js"
start "api-gateway" cmd /k "cd api-gateway && node index.js"

echo All services started!