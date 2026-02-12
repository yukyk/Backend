const Order = require("../Models/orderModel");
const Signup = require("../Models/signupModel");
const { createOrder, fetchOrderPayments, getPaymentStatus } = require("../services/cashFreeService");

// Generate unique order ID with testing prefix
function generateOrderId() {
    return `TESTING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create payment order
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user && req.user.userId;

        console.log('💳 Create Payment Order Request - Amount:', amount, 'UserId:', userId);

        if (!userId) {
            console.log('🔴 No userId found in request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!amount) {
            console.log('🔴 No amount provided');
            return res.status(400).json({ error: 'Amount is required' });
        }

        // Get user details
        const user = await Signup.findOne({ where: { id: userId } });
        if (!user) {
            console.log('🔴 User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('✅ User found:', user.email);

        // Generate order ID with testing prefix
        const orderId = generateOrderId();

        // Create order in database with PENDING status
        const order = await Order.create({
            orderId: orderId,
            userId: userId,
            amount: amount,
            status: 'PENDING'
        });

        console.log('✅ Order created in database:', orderId);

        // Create order with CashFree
        try {
            const paymentSessionId = await createOrder(
                orderId,
                amount,
                'INR',
                userId.toString(),
                user.phone
            );

            console.log('✅ CashFree: Order created:', paymentSessionId);

            // Update order with payment session ID
            await order.update({ paymentSessionId: paymentSessionId });

            console.log('✅ Payment order response sent');

            return res.status(201).json({
                orderId: orderId,
                paymentSessionId: paymentSessionId,
                amount: amount
            });
        } catch (cashfreeError) {
            console.error("🔴 CashFree Error Details:");
            console.error("  Error Message:", cashfreeError.message);
            console.error("  Error Status Code:", cashfreeError.statusCode);
            
            await order.update({ status: 'FAILED' });
            
            // Return a clean error message - only primitive types for JSON serialization
            const errorMessage = String(cashfreeError.message) || 'Failed to create payment session';
            return res.status(500).json({ 
                error: 'Failed to create payment session',
                details: errorMessage
            });
        }

    } catch (error) {
        console.error("🔴 Create Order Error:", error.message);
        const errorMessage = String(error.message) || 'Failed to create order';
        return res.status(500).json({ error: errorMessage });
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Find order in database
        const order = await Order.findOne({ where: { orderId: orderId } });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Verify order belongs to user
        if (order.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get actual payment status from Cashfree API
        try {
            console.log('💳 Verifying payment with Cashfree API for orderId:', orderId);
            const paymentStatus = await getPaymentStatus(orderId);
            const actualStatus = paymentStatus.status;
            
            console.log('✅ Cashfree Status:', actualStatus, 'DB Status:', order.status);
            
            // Update database with actual payment status from Cashfree
            if (actualStatus === 'SUCCESS' && order.status !== 'SUCCESSFUL') {
                await order.update({ status: 'SUCCESSFUL' });
                
                // Update user to premium
                const user = await Signup.findOne({ where: { id: userId } });
                if (user) {
                    await user.update({ isPremium: true });
                    console.log('✅ User upgraded to premium');
                }
            } else if (actualStatus === 'FAILED' && order.status !== 'FAILED') {
                await order.update({ status: 'FAILED' });
            }
            
            return res.status(200).json({
                orderId: order.orderId,
                status: actualStatus === 'SUCCESS' ? 'SUCCESSFUL' : actualStatus,
                amount: order.amount,
                transactions: paymentStatus.transactions
            });
        } catch (cashfreeError) {
            console.error('🔴 Cashfree API Error:', cashfreeError.message);
            // Return current database status if Cashfree API fails
            return res.status(200).json({
                orderId: order.orderId,
                status: order.status,
                amount: order.amount,
                message: 'Using cached status (Cashfree API unavailable)'
            });
        }

    } catch (error) {
        console.error("Verify Payment Error:", error.message);
        const errorMessage = String(error.message) || 'Failed to verify payment';
        return res.status(500).json({ error: errorMessage });
    }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!orderId || !status) {
            return res.status(400).json({ error: 'Order ID and status are required' });
        }

        if (!['PENDING', 'SUCCESSFUL', 'FAILED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Find order in database
        const order = await Order.findOne({ where: { orderId: orderId } });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Verify order belongs to user
        if (order.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Update order status
        await order.update({ status: status });

        // If successful, update user to premium
        if (status === 'SUCCESSFUL') {
            const user = await Signup.findOne({ where: { id: userId } });
            if (user) {
                await user.update({ isPremium: true });
            }
        }

        return res.status(200).json({
            message: 'Payment status updated',
            orderId: order.orderId,
            status: status
        });

    } catch (error) {
        console.error("Update Payment Status Error:", error.message);
        const errorMessage = String(error.message) || 'Failed to update payment status';
        return res.status(500).json({ error: errorMessage });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const orders = await Order.findAll({
            where: { userId: userId },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json(orders);

    } catch (error) {
        console.error("Get Payment History Error:", error.message);
        const errorMessage = String(error.message) || 'Failed to get payment history';
        return res.status(500).json({ error: errorMessage });
    }
};

// Get user premium status
exports.getPremiumStatus = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await Signup.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ isPremium: user.isPremium });

    } catch (error) {
        console.error("Get Premium Status Error:", error.message);
        const errorMessage = String(error.message) || 'Failed to get premium status';
        return res.status(500).json({ error: errorMessage });
    }
};
