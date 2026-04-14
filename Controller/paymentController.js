const Order = require("../Models/orderModel");
const Signup = require("../Models/signupModel");
const sequelize = require("../Utils/util");
const { createOrder, getPaymentStatus } = require("../services/cashFreeService");


function generateOrderId() {
    return `TESTING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create payment order - Uses Cashfree API properly
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount, premiumTier } = req.body;
        const userId = req.user && req.user.userId;

        console.log('💳 Create Payment Order - Amount:', amount, 'Tier:', premiumTier, 'UserId:', userId);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!amount) return res.status(400).json({ error: 'Amount is required' });

        const user = await Signup.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const orderId = generateOrderId();

        const orderData = {
            orderId: orderId,
            userId: userId,
            amount: parseFloat(amount),
            status: 'PENDING'
        };
        
        if (Order.rawAttributes && Order.rawAttributes.premiumTier) {
            orderData.premiumTier = premiumTier;
        }
        
        await Order.create(orderData);
        console.log('✅ Order created:', orderId);

        try {
            const paymentSessionId = await createOrder(orderId, amount, 'INR', userId.toString(), user.phone);
            console.log('✅ CashFree session:', paymentSessionId);
            await Order.update({ paymentSessionId }, { where: { orderId } });

            return res.status(201).json({ 
                orderId, 
                paymentSessionId, 
                amount,
                premiumTier: premiumTier || 1
            });
        } catch (cashfreeError) {
            console.error("🔴 CashFree Error:", cashfreeError.message);
            await Order.update({ status: 'FAILED' }, { where: { orderId } });
            return res.status(500).json({ error: 'Failed to create payment session', details: cashfreeError.message });
        }

    } catch (error) {
        console.error("🔴 Create Order Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Verify payment - Uses Cashfree API to verify, then updates DB
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

        const order = await Order.findOne({ where: { orderId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        // Check Cashfree for actual payment status
        try {
            const paymentStatus = await getPaymentStatus(orderId);
            const actualStatus = paymentStatus.status;
            
            console.log('💳 Payment Status from Cashfree:', actualStatus);
            
            if (actualStatus === 'SUCCESS') {
                // Update order status
                await Order.update({ status: 'SUCCESSFUL' }, { where: { orderId } });
                
                // Update user to premium
                const purchasedTier = order.premiumTier || 1;
                await Signup.update(
                    { isPremium: 1, premiumTier: purchasedTier },
                    { where: { id: userId } }
                );
                
                console.log('✅ Payment verified, user upgraded to tier:', purchasedTier);
            }
            
            return res.status(200).json({
                orderId: order.orderId,
                status: order.status,
                amount: order.amount
            });
        } catch (cashfreeError) {
            console.error('🔴 Cashfree verification error:', cashfreeError.message);
            return res.status(500).json({ error: 'Payment verification failed' });
        }

    } catch (error) {
        console.error("Verify Payment Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!orderId || !status) return res.status(400).json({ error: 'Order ID and status required' });
        if (!['PENDING', 'SUCCESSFUL', 'FAILED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findOne({ where: { orderId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        await order.update({ status });

        if (status === 'SUCCESSFUL') {
            const user = await Signup.findOne({ where: { id: userId } });
            if (user) {
                await user.update({ 
                    isPremium: true,
                    premiumTier: Math.max(user.premiumTier || 0, order.premiumTier || 1)
                });
            }
        }

        return res.status(200).json({ message: 'Payment status updated', orderId: order.orderId, status });

    } catch (error) {
        console.error("Update Payment Status Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const orders = await Order.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
        return res.status(200).json(orders);
    } catch (error) {
        console.error("Get Payment History Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Get user premium status
exports.getPremiumStatus = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await Signup.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json({ isPremium: user.isPremium, premiumTier: user.premiumTier || 0 });
    } catch (error) {
        console.error("Get Premium Status Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};