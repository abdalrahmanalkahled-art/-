#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix expo-image-loader
const buildGradlePath = path.join(
  __dirname,
  '../node_modules/expo-image-loader/android/build.gradle'
);

if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf-8');
  
  if (!content.includes('compileSdkVersion 36')) {
    content = content.replace(
      /compileSdkVersion safeExtGet\("compileSdkVersion", \d+\)/,
      'compileSdkVersion 36'
    );
    
    fs.writeFileSync(buildGradlePath, content, 'utf-8');
    console.log('✓ Fixed expo-image-loader compileSdkVersion');
  }
} else {
  console.log('⚠ expo-image-loader not found, skipping fix');
}

// Fix react-native-screens minSdkVersion
const rnsPath = path.join(
  __dirname,
  '../node_modules/react-native-screens/android/build.gradle'
);

if (fs.existsSync(rnsPath)) {
  let content = fs.readFileSync(rnsPath, 'utf-8');
  
  // Update rnsDefaultMinSdkVersion from 21 to 24
  if (content.includes('rnsDefaultMinSdkVersion = 21')) {
    content = content.replace(
      'rnsDefaultMinSdkVersion = 21',
      'rnsDefaultMinSdkVersion = 24'
    );
    
    fs.writeFileSync(rnsPath, content, 'utf-8');
    console.log('✓ Fixed react-native-screens minSdkVersion to 24');
  }
} else {
  console.log('⚠ react-native-screens not found, skipping fix');
}
