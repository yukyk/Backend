const axios = require("axios");
const crypto = require('crypto');

console.log('🔵 CashFree Service - Initializing...');

const appId = "TEST430329ae80e0f32e41a393d78b923034";
const appSecret = "TESTaf195616268bd6202eeb3bf8dc458956e7192a85";

const cashfreeAPI = axios.create({
    baseURL: "https://sandbox.cashfree.com",
    headers: {
        'X-Client-Id': appId,
        'X-Client-Secret': appSecret,
        'x-api-version': '2025-01-01',
        'Content-Type': 'application/json'
    }
});

console.log('✅ CashFree API client initialized');

exports.createOrder = async(
    orderId,
    orderAmount,
    orderCurrency,
    customerID,
    customerPhone,
) =>{
    try{
        console.log('🔵 CashFree: Creating order with params:', { orderId, orderAmount, orderCurrency, customerID, customerPhone });
        
        // Ensure amount is a number and format properly
        const amount = parseFloat(orderAmount);
        
        const request = {
            order_id: String(orderId),
            order_amount: amount,
            order_currency: orderCurrency || 'INR',
            customer_details: {
                customer_id: String(customerID),
                customer_phone: String(customerPhone).replace(/[^0-9]/g, '').slice(-10)
            },
            order_meta: {
                return_url: "http://localhost:3000/expense"
            }
        };

        console.log('🔵 CashFree Request payload:', JSON.stringify(request, null, 2));
        console.log('🔵 Calling Cashfree API endpoint: POST /pg/orders');

        // Call Cashfree REST API directly
        const response = await cashfreeAPI.post('/pg/orders', request);
        
        console.log('✅ CashFree: Order created successfully');
        console.log('✅ CashFree Response:', JSON.stringify(response.data, null, 2));
        
        // Extract session ID from the response
        const sessionId = response.data?.payment_session_id;
        
        if (!sessionId) {
            throw new Error('No payment_session_id in response');
        }
        
        console.log('✅ Returning session ID:', sessionId);
        return sessionId;

    } catch(error){
        let errorMessage = 'Failed to create payment order';
        let apiErrorDetails = '';
        
        if (error.response?.data) {
            apiErrorDetails = JSON.stringify(error.response.data);
            console.error('🔴 CashFree API Error Response:', apiErrorDetails);
        }
        
        if (error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
        
        console.error("🔴 CashFree Error creating order:", errorMessage);
        throw new Error(apiErrorDetails || errorMessage);
    }
}

// Fetch payment status for an order
exports.fetchOrderPayments = async(orderId) =>{
    try{
        console.log('🔵 CashFree: Fetching order payments for orderId:', orderId);
        const response = await cashfreeAPI.get(`/pg/orders/${orderId}/payments`);
        console.log('✅ CashFree: Order payments fetched successfully');
        console.log('✅ Full Payment Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch(error){
        let errorMessage = 'Failed to fetch order payments';
        if (error && typeof error.message === 'string') {
            errorMessage = error.message;
        } else if (error.response?.data) {
            errorMessage = JSON.stringify(error.response.data);
        }
        console.error("🔴 CashFree Error fetching payments:", errorMessage);
        throw new Error(errorMessage);
    }
}

// Get payment status for an order
exports.getPaymentStatus = async(orderId) =>{
    try{
        console.log('🔵 CashFree: Getting payment status for orderId:', orderId);
        const paymentsResponse = await cashfreeAPI.get(`/pg/orders/${orderId}/payments`);
        const getOrderResponse = paymentsResponse.data;
        
        console.log('✅ CashFree: Payments list:', JSON.stringify(getOrderResponse, null, 2));
        
        let orderStatus;
        
        // Check if any transaction has SUCCESS payment status
        if (Array.isArray(getOrderResponse) && getOrderResponse.filter(transaction => transaction.payment_status === "SUCCESS").length > 0) {
            orderStatus = "SUCCESS"
            console.log('✅ Payment Status: SUCCESS');
        } 
        // Check if any transaction is PENDING
        else if (Array.isArray(getOrderResponse) && getOrderResponse.filter(transaction => transaction.payment_status === "PENDING").length > 0) {
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
        } else if (error.response?.data) {
            errorMessage = JSON.stringify(error.response.data);
        }
        console.error("🔴 CashFree Error getting payment status:", errorMessage);
        throw new Error(errorMessage);
    }
}