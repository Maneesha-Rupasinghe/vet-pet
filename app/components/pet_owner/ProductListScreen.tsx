import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, TextInput, Switch, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { Snackbar } from 'react-native-paper';
import Spinner from 'react-native-loading-spinner-overlay';

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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  // Filter states
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Debounced filter states
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState<string>('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Debounce min price
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
    }, 300);
    return () => clearTimeout(handler);
  }, [minPrice]);

  // Debounce max price
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMaxPrice(maxPrice);
    }, 300);
    return () => clearTimeout(handler);
  }, [maxPrice]);

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
        setFilteredProducts(productsList); // Initially, show all products
      } catch (error: any) {
        showSnackbar(`Failed to fetch products: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Apply filters using debounced values
  useEffect(() => {
    let filtered = [...products];

    // Filter by search query (name)
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Filter by price range
    const min = debouncedMinPrice ? parseFloat(debouncedMinPrice) : 0;
    const max = debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : Infinity;
    if (debouncedMinPrice || debouncedMaxPrice) {
      filtered = filtered.filter(product => product.price >= min && product.price <= max);
    }

    // Filter by availability
    if (inStockOnly) {
      filtered = filtered.filter(product => product.quantity > 0);
    }

    setFilteredProducts(filtered);
  }, [products, debouncedSearchQuery, debouncedMinPrice, debouncedMaxPrice, inStockOnly]);

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
      const productRef = doc(firestore, 'products', product.id);
      await updateDoc(productRef, { quantity: product.quantity - 1 });

      await addDoc(collection(firestore, 'orders'), {
        userId,
        vendorId: product.vendorId,
        products: [{ productId: product.id, name: product.name, price: product.price, quantity: 1 }],
        total: product.price,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date()),
      });

      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, quantity: p.quantity - 1 } : p))
      );
      setFilteredProducts(prev =>
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

      for (const vendorId in vendorOrders) {
        const items = vendorOrders[vendorId];
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        for (const item of items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const productRef = doc(firestore, 'products', item.productId);
            await updateDoc(productRef, { quantity: product.quantity - item.quantity });
          }
        }

        await addDoc(collection(firestore, 'orders'), {
          userId,
          vendorId,
          products: items,
          total,
          status: 'pending',
          createdAt: Timestamp.fromDate(new Date()),
        });
      }

      setProducts(prev =>
        prev.map(product => {
          const cartItem = cart.find(item => item.productId === product.id);
          if (cartItem) {
            return { ...product, quantity: product.quantity - cartItem.quantity };
          }
          return product;
        })
      );
      setFilteredProducts(prev =>
        prev.map(product => {
          const cartItem = cart.find(item => item.productId === product.id);
          if (cartItem) {
            return { ...product, quantity: product.quantity - cartItem.quantity };
          }
          return product;
        })
      );

      setCart([]);
      showSnackbar('Checkout successful!', 'success');
    } catch (error: any) {
      showSnackbar(`Failed to checkout: ${error.message}`, 'error');
    }
  };

  const handleClearCart = () => {
    setCart([]);
    showSnackbar('Cart cleared!', 'success');
  };

  const handleClearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSearchQuery('');
    setFilteredProducts(products);
    showSnackbar('Filters cleared!', 'success');
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={{
      backgroundColor: '#FFF',
      borderRadius: 12,
      padding: 12,
      margin: 8,
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
          style={{ width: 136, height: 100, borderRadius: 8 }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ width: 136, height: 100, backgroundColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>No Image</Text>
        </View>
      )}
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#3E4241', marginTop: 8 }}>{item.name}</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>${item.price.toFixed(2)}</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
        Available: {item.quantity}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => handleBuyNow(item)}
          style={{
            backgroundColor: '#3D90D7',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 16,
            flex: 1,
            marginRight: 5,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Buy Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleAddToCart(item)}
          style={{
            backgroundColor: '#3674B5',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 16,
            flex: 1,
            marginLeft: 5,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Filter Section Component
  const renderFilterSection = () => (
    <View style={{
      backgroundColor: '#FFF',
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 8,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#3E4241', marginBottom: 10 }}>
        Filter Products
      </Text>

      {/* Search Filter */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
          Search by Name
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Enter product name"
          placeholderTextColor="#888"
          style={{
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
            backgroundColor: '#F9FAFB',
          }}
        />
      </View>

      {/* Price Range Filter */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
          Price Range
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextInput
            value={minPrice}
            onChangeText={setMinPrice}
            placeholder="Min Price"
            placeholderTextColor="#888"
            keyboardType="numeric"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              backgroundColor: '#F9FAFB',
              marginRight: 10,
            }}
          />
          <TextInput
            value={maxPrice}
            onChangeText={setMaxPrice}
            placeholder="Max Price"
            placeholderTextColor="#888"
            keyboardType="numeric"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              backgroundColor: '#F9FAFB',
            }}
          />
        </View>
      </View>

      {/* In Stock Filter */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#3E4241' }}>
          In Stock Only
        </Text>
        <Switch
          value={inStockOnly}
          onValueChange={setInStockOnly}
          trackColor={{ false: '#D1D5DB', true: '#3674B5' }}
          thumbColor={inStockOnly ? '#FFF' : '#F4F4F5'}
        />
      </View>

      {/* Clear Filters Button */}
      <TouchableOpacity
        onPress={handleClearFilters}
        style={{
          backgroundColor: '#6B7280',
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 8,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }}
      >
        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
          Clear Filters
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1, padding: 10 }} className="bg-[#FBF8EF]">
        {isLoading ? (
          <Spinner
            visible={isLoading}
            textContent={'Loading...'}
            textStyle={{ color: '#FFF', fontSize: 16 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#3E4241', marginBottom: 15, marginHorizontal: 8 }}>
              Products
            </Text>

            {/* Filter Section */}
            {renderFilterSection()}

            {/* Product List */}
            {filteredProducts.length === 0 ? (
              <Text style={{ fontSize: 16, color: '#3E4241', textAlign: 'center', marginTop: 20, marginHorizontal: 8 }}>
                No products match your filters.
              </Text>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductCard}
                keyExtractor={item => item.id}
                numColumns={2}
                nestedScrollEnabled={true}
                scrollEnabled={false} 
              />
            )}

            {/* Cart Section */}
            {cart.length > 0 && (
              <View style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                right: 10,
                backgroundColor: '#FFF',
                padding: 15,
                borderRadius: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#3E4241', marginBottom: 5 }}>
                  Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                </Text>
                {cart.map(item => (
                  <Text key={item.productId} style={{ fontSize: 14, color: '#3E4241', marginBottom: 3 }}>
                    {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                ))}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#3E4241', marginTop: 5 }}>
                  Total: ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={handleCheckout}
                    style={{
                      backgroundColor: '#28a745',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      flex: 1,
                      marginRight: 10,
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Checkout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearCart}
                    style={{
                      backgroundColor: '#ff4444',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      flex: 1,
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Clear Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    </KeyboardAvoidingView>
  );
};

export default ProductListScreen;