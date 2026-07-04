const Order = require("../Models/orderModel");
const Signup = require("../Models/signupModel");
const { createOrder, getPaymentStatus } = require("../services/cashFreeService");


function generateOrderId() {
    return `TESTING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create payment order - Uses Cashfree API properly
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount, premiumTier } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!amount) return res.status(400).json({ error: 'Amount is required' });

        const user = await Signup.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const orderId = generateOrderId();

        const orderData = {
            orderId: orderId,
            userId: userId,
            amount: parseFloat(amount),
            status: 'PENDING'
        };

        if (premiumTier) {
            orderData.premiumTier = premiumTier;
        }
        
        await Order.create(orderData);

        try {
            const paymentSessionId = await createOrder(orderId, amount, 'INR', userId.toString(), user.phone);
            await Order.updateOne({ orderId }, { paymentSessionId });

            return res.status(201).json({ 
                orderId, 
                paymentSessionId, 
                amount,
                premiumTier: premiumTier || 1
            });
        } catch (cashfreeError) {
            await Order.updateOne({ orderId }, { status: 'FAILED' });
            return res.status(500).json({ error: 'Failed to create payment session', details: cashfreeError.message });
        }

    } catch (error) {
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

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

        // Check Cashfree for actual payment status
        try {
            const paymentStatus = await getPaymentStatus(orderId);
            const actualStatus = paymentStatus.status;
            
            
            if (actualStatus === 'SUCCESS') {
                // Update order status
                await Order.updateOne({ orderId }, { status: 'SUCCESSFUL' });
                
                // Update user to premium
                const purchasedTier = order.premiumTier || 1;
                await Signup.updateOne(
                    { _id: userId },
                    { isPremium: true, premiumTier: purchasedTier }
                );
                
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

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

        order.status = status;
        await order.save();

        if (status === 'SUCCESSFUL') {
            const user = await Signup.findById(userId);
            if (user) {
                user.isPremium = true;
                user.premiumTier = Math.max(user.premiumTier || 0, order.premiumTier || 1);
                await user.save();
            }
        }

        return res.status(200).json({ message: 'Payment status updated', orderId: order.orderId, status });

    } catch (error) {

        return res.status(500).json({ error: error.message });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get user premium status
exports.getPremiumStatus = async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await Signup.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json({ isPremium: user.isPremium, premiumTier: user.premiumTier || 0 });
    } catch (error) {
        console.error("Get Premium Status Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};