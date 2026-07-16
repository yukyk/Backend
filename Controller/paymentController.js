const Order = require("../Models/orderModel");
const Signup = require("../Models/signupModel");
const cashfreeService = require("../services/cashfreeService"); // Double check this path matches your service location

function generateOrderId() {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
}

// Create payment order via Cashfree PG
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount, premiumTier } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'A valid amount is required' });

        const user = await Signup.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const orderId = generateOrderId();
        const selectedTier = parseInt(premiumTier, 10) || 1;
        
        // Clean customer details required by Cashfree (phone fallback if empty)
        const customerPhone = user.phone || "9999999999"; 

        console.log(`Creating dynamic Cashfree order session for User: ${userId}`);

        // 1. Generate payment session token from Cashfree
        const paymentSessionId = await cashfreeService.createOrder(
            orderId,
            parseFloat(amount),
            'INR',
            userId,
            customerPhone
        );

        // 2. Log record to local DB as PENDING
        const orderData = {
            orderId: orderId,
            userId: userId,
            amount: parseFloat(amount),
            status: 'PENDING',
            premiumTier: selectedTier
        };
        await Order.create(orderData);

        // 3. Send session payload back to frontend context to trigger SDK checkout overlay
        return res.status(201).json({
            orderId,
            paymentSessionId,
            amount,
            premiumTier: selectedTier,
            status: 'PENDING',
            message: 'Payment session created successfully'
        });

    } catch (error) {
        console.error("🔴 Error inside createPaymentOrder:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Verify payment status against Cashfree directly
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user && req.user.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

        // 1. Fetch live transaction data from Cashfree
        const cashfreeStatus = await cashfreeService.getPaymentStatus(orderId);
        
        // Map Cashfree's internal status back to local DB schema
        if (cashfreeStatus.status === 'SUCCESS') {
            order.status = 'SUCCESSFUL';
            await order.save();

            const user = await Signup.findById(userId);
            if (user) {
                user.isPremium = true;
                user.premiumTier = Math.max(user.premiumTier || 0, order.premiumTier || 1);
                await user.save();
            }

            return res.status(200).json({
                orderId: order.orderId,
                status: 'SUCCESSFUL',
                amount: order.amount,
                message: 'Payment verified successfully'
            });
        } else if (cashfreeStatus.status === 'PENDING') {
            order.status = 'PENDING';
            await order.save();
            return res.status(200).json({
                orderId: order.orderId,
                status: 'PENDING',
                message: 'Payment is still processing'
            });
        } else {
            order.status = 'FAILED';
            await order.save();
            return res.status(200).json({
                orderId: order.orderId,
                status: 'FAILED',
                message: 'Payment failed or was canceled'
            });
        }

    } catch (error) {
        console.error("🔴 Error inside verifyPayment:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Update payment status (For fallback/webhook use cases)
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

        const isPremium = Boolean(user.isPremium);
        const premiumTier = user.premiumTier || 0;

        return res.status(200).json({ isPremium, premiumTier });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};