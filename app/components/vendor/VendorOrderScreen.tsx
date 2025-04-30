import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { Snackbar } from 'react-native-paper';

interface Order {
    id: string;
    userId: string;
    vendorId: string;
    products: { productId: string; name: string; price: number; quantity: number }[];
    total: number;
    status: string;
    createdAt: { seconds: number; nanoseconds: number };
}

const VendorOrdersScreen = () => {
    const firestore = getFirestore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const userId = auth.currentUser?.uid;
                if (!userId) {
                    showSnackbar('No user logged in', 'error');
                    return;
                }

                const ordersQuery = query(
                    collection(firestore, 'orders'),
                    where('vendorId', '==', userId)
                );
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersList: Order[] = ordersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Order[];
                setOrders(ordersList);
            } catch (error: any) {
                showSnackbar(`Failed to fetch orders: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const showSnackbar = (message: string, type: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setSnackbarVisible(true);
    };

    const renderOrderCard = (order: Order) => (
        <View key={order.id} style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 15,
            marginVertical: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Order ID: {order.id}</Text>
            <Text style={{ fontSize: 14, color: '#555', marginTop: 5 }}>
                User ID: {order.userId}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginTop: 5 }}>Products:</Text>
            {order.products.map((product, index) => (
                <Text key={index} style={{ fontSize: 14, color: '#555' }}>
                    {product.name} x{product.quantity} - ${(product.price * product.quantity).toFixed(2)}
                </Text>
            ))}
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginTop: 5 }}>
                Total: ${order.total.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 14, color: '#555', marginTop: 5 }}>
                Status: {order.status}
            </Text>
            <Text style={{ fontSize: 14, color: '#555', marginTop: 5 }}>
                Date: {new Date(order.createdAt.seconds * 1000).toLocaleString()}
            </Text>
        </View>
    );

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Orders</Text>

            {isLoading ? (
                <Text>Loading...</Text>
            ) : orders.length === 0 ? (
                <Text>No orders found</Text>
            ) : (
                <ScrollView>
                    {orders.map(order => renderOrderCard(order))}
                </ScrollView>
            )}

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={Snackbar.DURATION_SHORT}
                style={{
                    backgroundColor: snackbarType === 'success' ? 'green' : 'red',
                }}
            >
                {snackbarMessage}
            </Snackbar>
        </View>
    );
};

export default VendorOrdersScreen;