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
        <View
            key={order.id}
            style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 16,
                padding: 16,
                marginVertical: 10,
                marginHorizontal: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
            }}
        >
            {/* Header */}
            <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                    Order #{order.id}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>User: {order.userId}</Text>
            </View>
    
            {/* Products List */}
            <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                    Products:
                </Text>
                {order.products.map((product, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
                        <Text style={{ fontSize: 14, color: '#4B5563' }}>
                            {product.name} x{product.quantity}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#4B5563' }}>
                            ${(product.price * product.quantity).toFixed(2)}
                        </Text>
                    </View>
                ))}
            </View>
    
            {/* Total and Status */}
            <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                    Total: ${order.total.toFixed(2)}
                </Text>
                <Text style={{ fontSize: 14, color: order.status === 'completed' ? '#10B981' : '#F59E0B', marginTop: 4 }}>
                    Status: {order.status}
                </Text>
            </View>
    
            {/* Footer */}
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 10 }}>
                Placed on: {new Date(order.createdAt.seconds * 1000).toLocaleString()}
            </Text>
        </View>
    );
    

    return (
        <View style={{ flex: 1, backgroundColor: '#FBF8EF' }}>
                 <Text className="text-2xl font-extrabold text-[#3E4241] mb-5 ml-5">
                   Order List
                 </Text>

            {isLoading ? (
                <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 18 }}>
                    Loading...
                </Text>
            ) : orders.length === 0 ? (
                <Text style={{ fontSize: 14, color: '#6B7280', marginHorizontal: 18 }}>
                    No orders found
                </Text>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    {orders.map(order => renderOrderCard(order))}
                </ScrollView>
            )}

            <View className="absolute bottom-5 left-0 right-0">
                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={Snackbar.DURATION_SHORT}
                    style={{
                        backgroundColor: snackbarType === 'success' ? 'green' : 'red',
                        borderRadius: 8,
                        padding: 10,
                        marginHorizontal: 10,
                        marginBottom: 10,
                    }}
                >
                    <Text style={{ color: '#FFF', fontSize: 14 }}>{snackbarMessage}</Text>
                </Snackbar>
            </View>
        </View>
    );
};

export default VendorOrdersScreen;