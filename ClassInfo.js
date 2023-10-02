// ClassInfo.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ClassInfo = ({ class_name, color, prob }) => {
  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <Text style={styles.text}>{class_name}</Text>
      <Text style={styles.text}>:{Math.round(prob*100)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 2,
    margin: 2,
  },
  text: {
    color: 'white',
    marginLeft: 5,
  },
});

export default ClassInfo;
