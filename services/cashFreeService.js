const { Cashfree, CFEnvironment } = require("cashfree-pg");

console.log('🔵 CashFree Service - Initializing...');
console.log('🔵 CashFree Environment: SANDBOX');
console.log('🔵 Cashfree module loaded:', typeof Cashfree);
console.log('🔵 CFEnvironment:', CFEnvironment);

let cashfree;

try {
    // Validate credentials exist
    const appId = "TEST430329ae80e0f32e41a393d78b923034";
    const appSecret = "TESTaf195616268bd6202eeb3bf8dc458956e7192a85";
    
    console.log('🔵 Initializing Cashfree with:');
    console.log('  - Environment: SANDBOX');
    console.log('  - AppId:', appId.substring(0, 10) + '...');
    
    cashfree = new Cashfree(CFEnvironment.SANDBOX, appId, appSecret);
    
    console.log('✅ CashFree SDK initialized successfully');
    console.log('✅ Cashfree object type:', typeof cashfree);
    console.log('✅ Cashfree.orders available:', typeof cashfree.orders);
    
} catch (error) {
    console.error('🔴 CashFree SDK initialization FAILED:');
    console.error('  Error Name:', error.name);
    console.error('  Error Message:', error.message);
    console.error('  Error Stack:', error.stack);
    process.exit(1);
}

exports.createOrder = async(
    orderId,
    orderAmount,
    orderCurrency,
    customerID,
    customerPhone,
) =>{
    try{
        // Verify cashfree is initialized
        if (!cashfree) {
            throw new Error('CashFree SDK not initialized properly');
        }
        
        console.log('🔵 CashFree: Creating order with params:', { orderId, orderAmount, orderCurrency, customerID, customerPhone });
        
        const request  = {
            order_amount : orderAmount,
            order_currency : orderCurrency,
            order_id : orderId,

            customer_details: {
                customer_id : customerID,
                customer_phone : customerPhone
            },

            order_meta:{
                "return_url":"http://localhost:3000/expense",
                payment_methods:"ccc,upi,nb"
            }
        };

        console.log('🔵 CashFree Request payload:', JSON.stringify(request, null, 2));
        console.log('🔵 Available cashfree methods:', Object.keys(cashfree).filter(k => typeof cashfree[k] === 'function'));
        console.log('🔵 Calling cashfree.PGCreateOrder (direct method)...');

        // Try direct method call
        const response = await cashfree.PGCreateOrder(request);
        
        console.log('✅ CashFree: Order created successfully');
        console.log('✅ CashFree Response Keys:', Object.keys(response));
        
        // Extract session ID - it can be in different locations depending on SDK version
        const sessionId = response.payment_session_id || response.data?.payment_session_id || response.data?.payment_method_session_id;
        
        if (!sessionId) {
            console.error('🔴 Session ID not found. Available top-level keys:', Object.keys(response));
            throw new Error('No payment_session_id found in response. Response keys: ' + Object.keys(response).join(', '));
        }
        
        console.log('✅ Returning session ID:', sessionId);
        return sessionId;

    } catch(error){
        // NEVER try to access nested properties of error object - they have circular references
        // Only extract the message string safely
        let errorMessage = 'Failed to create payment order';
        
        if (error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
        
        console.error("🔴 CashFree Error creating order:", errorMessage);
        
        // Throw a clean error with ONLY the message string
        throw new Error(errorMessage);
    }
}

// Fetch payment status for an order
exports.fetchOrderPayments = async(orderId) =>{
    try{
        if (!cashfree) {
            throw new Error('CashFree SDK not initialized');
        }
        
        console.log('🔵 CashFree: Fetching order payments for orderId:', orderId);
        const response = await cashfree.PGOrderFetchPayments(orderId);
        console.log('✅ CashFree: Order payments fetched successfully');
        console.log('✅ Full Payment Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch(error){
        let errorMessage = 'Failed to fetch order payments';
        if (error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
        console.error("🔴 CashFree Error fetching payments:", errorMessage);
        throw new Error(errorMessage);
    }
}

// Get payment status for an order
exports.getPaymentStatus = async(orderId) =>{
    try{
        if (!cashfree) {
            throw new Error('CashFree SDK not initialized');
        }
        
        console.log('🔵 CashFree: Getting payment status for orderId:', orderId);
        const paymentsList = await cashfree.PGOrderFetchPayments(orderId);
        const getOrderResponse = paymentsList.data;
        
        console.log('✅ CashFree: Payments list:', JSON.stringify(getOrderResponse, null, 2));
        
        let orderStatus;
        
        // Check if any transaction has SUCCESS payment status
        if (getOrderResponse.filter(transaction => transaction.payment_status === "SUCCESS").length > 0) {
            orderStatus = "SUCCESS"
            console.log('✅ Payment Status: SUCCESS');
        } 
        // Check if any transaction is PENDING
        else if (getOrderResponse.filter(transaction => transaction.payment_status === "PENDING").length > 0) {
            orderStatus = "PENDING"
            console.log('✅ Payment Status: PENDING');
        } 
        // Otherwise mark as FAILED
        else {
            orderStatus = "FAILED"
            console.log('✅ Payment Status: FAILED');
        }
        
        return {
            status: orderStatus,
            transactions: getOrderResponse
        };
    } catch(error){
        let errorMessage = 'Failed to get payment status';
        if (error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
        console.error("🔴 CashFree Error getting payment status:", errorMessage);
        throw new Error(errorMessage);
    }
} 