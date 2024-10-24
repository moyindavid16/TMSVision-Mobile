import { StyleSheet, Text, View } from 'react-native';

import * as Tmsvision from 'tmsvision';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{Tmsvision.getTheme()} still having issues</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
