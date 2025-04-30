import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { Snackbar } from 'react-native-paper';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: string;
  imageBase64?: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const ProductListScreen = () => {
  const firestore = getFirestore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          showSnackbar('No user logged in', 'error');
          return;
        }

        const productsSnapshot = await getDocs(collection(firestore, 'products'));
        const productsList: Product[] = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsList);
      } catch (error: any) {
        showSnackbar(`Failed to fetch products: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      showSnackbar('Product is out of stock', 'error');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
          showSnackbar('Cannot add more than available quantity', 'error');
          return prevCart;
        }
        return prevCart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    showSnackbar(`${product.name} added to cart!`, 'success');
  };

  const handleBuyNow = async (product: Product) => {
    if (product.quantity <= 0) {
      showSnackbar('Product is out of stock', 'error');
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      showSnackbar('No user logged in', 'error');
      return;
    }

    try {
      // Update product quantity in Firestore
      const productRef = doc(firestore, 'products', product.id);
      await updateDoc(productRef, { quantity: product.quantity - 1 });

      // Create order in Firestore
      await addDoc(collection(firestore, 'orders'), {
        userId,
        vendorId: product.vendorId,
        products: [{ productId: product.id, name: product.name, price: product.price, quantity: 1 }],
        total: product.price,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date()),
      });

      // Update local products state
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, quantity: p.quantity - 1 } : p))
      );

      showSnackbar(`Purchased ${product.name} successfully!`, 'success');
    } catch (error: any) {
      showSnackbar(`Failed to purchase product: ${error.message}`, 'error');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showSnackbar('Your cart is empty', 'error');
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      showSnackbar('No user logged in', 'error');
      return;
    }

    try {
      // Validate quantities and group by vendor
      const vendorOrders: { [vendorId: string]: CartItem[] } = {};
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        if (item.quantity > product.quantity) {
          showSnackbar(`Not enough stock for ${item.name}`, 'error');
          return;
        }
        if (!vendorOrders[product.vendorId]) {
          vendorOrders[product.vendorId] = [];
        }
        vendorOrders[product.vendorId].push(item);
      }

      // Process orders for each vendor
      for (const vendorId in vendorOrders) {
        const items = vendorOrders[vendorId];
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Update quantities in Firestore
        for (const item of items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const productRef = doc(firestore, 'products', item.productId);
            await updateDoc(productRef, { quantity: product.quantity - item.quantity });
          }
        }

        // Create order in Firestore
        await addDoc(collection(firestore, 'orders'), {
          userId,
          vendorId,
          products: items,
          total,
          status: 'pending',
          createdAt: Timestamp.fromDate(new Date()),
        });
      }

      // Update local products state
      setProducts(prev =>
        prev.map(product => {
          const cartItem = cart.find(item => item.productId === product.id);
          if (cartItem) {
            return { ...product, quantity: product.quantity - cartItem.quantity };
          }
          return product;
        })
      );

      // Clear cart
      setCart([]);
      showSnackbar('Checkout successful!', 'success');
    } catch (error: any) {
      showSnackbar(`Failed to checkout: ${error.message}`, 'error');
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 10,
      margin: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      width: 160,
    }}>
      {item.imageBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
          style={{ width: 140, height: 100, borderRadius: 8 }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ width: 140, height: 100, backgroundColor: '#e0e0e0', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No Image</Text>
        </View>
      )}
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>{item.name}</Text>
      <Text style={{ fontSize: 14, color: '#555', marginTop: 4 }}>${item.price.toFixed(2)}</Text>
      <Text style={{ fontSize: 14, color: '#555', marginTop: 4 }}>
        Available: {item.quantity}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => handleBuyNow(item)}
          style={{
            backgroundColor: '#ff6200',
            padding: 8,
            borderRadius: 5,
            flex: 1,
            marginRight: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Buy Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleAddToCart(item)}
          style={{
            backgroundColor: '#007bff',
            padding: 8,
            borderRadius: 5,
            flex: 1,
            marginLeft: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Products</Text>

      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <FlatList
            data={products}
            renderItem={renderProductCard}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 100 }}
          />

          {cart.length > 0 && (
            <View style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              backgroundColor: '#fff',
              padding: 10,
              borderRadius: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
              </Text>
              {cart.map(item => (
                <Text key={item.productId}>
                  {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                </Text>
              ))}
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>
                Total: ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </Text>
              <TouchableOpacity
                onPress={handleCheckout}
                style={{
                  backgroundColor: '#28a745',
                  padding: 10,
                  borderRadius: 5,
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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

export default ProductListScreen;