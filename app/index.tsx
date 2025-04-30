import { View, Text } from 'react-native'
import React from 'react'
import LoginScreen from './screens/LoginScreen'
import "../global.css"
import RegisterScreen from './screens/RegisterScreen'

const Index = () => {
    return (
        <View className='px-[16px] py-[16px]'>
            {/* <LoginScreen /> */}
            <RegisterScreen />
            {/* <Text className='text-red-600'>Hello</Text> */}
        </View>
    )
}

export default Index