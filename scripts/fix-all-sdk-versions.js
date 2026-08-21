#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    name: 'react-native-reanimated',
    file: '../node_modules/react-native-reanimated/android/build.gradle',
    search: 'minSdkVersion safeExtGet("minSdkVersion", 23)',
    replace: 'minSdkVersion safeExtGet("minSdkVersion", 24)'
  },
  {
    name: 'react-native-safe-area-context',
    file: '../node_modules/react-native-safe-area-context/android/build.gradle',
    search: "minSdkVersion getExtOrDefault('minSdkVersion', 16)",
    replace: "minSdkVersion getExtOrDefault('minSdkVersion', 24)"
  },
  {
    name: 'react-native-svg',
    file: '../node_modules/react-native-svg/android/build.gradle',
    search: "minSdkVersion safeExtGet('minSdkVersion', 16)",
    replace: "minSdkVersion safeExtGet('minSdkVersion', 24)"
  },
  {
    name: 'react-native-worklets',
    file: '../node_modules/react-native-worklets/android/build.gradle',
    search: 'minSdkVersion safeExtGet("minSdkVersion", 23)',
    replace: 'minSdkVersion safeExtGet("minSdkVersion", 24)'
  },
  {
    name: 'react-native-screens',
    file: '../node_modules/react-native-screens/android/build.gradle',
    search: 'rnsDefaultMinSdkVersion = 21',
    replace: 'rnsDefaultMinSdkVersion = 24'
  },
  {
    name: 'expo-image-loader',
    file: '../node_modules/expo-image-loader/android/build.gradle',
    search: /compileSdkVersion safeExtGet\("compileSdkVersion", \d+\)/,
    replace: 'compileSdkVersion 36'
  }
];

fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (typeof fix.search === 'string') {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✓ Fixed ${fix.name}: ${fix.search.substring(0, 50)}...`);
      }
    } else {
      // Regex search
      if (fix.search.test(content)) {
        content = content.replace(fix.search, fix.replace);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✓ Fixed ${fix.name}`);
      }
    }
  } else {
    console.log(`⚠ ${fix.name} not found, skipping`);
  }
});

console.log('\n✅ All SDK version fixes completed!');
