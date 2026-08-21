import React, { useRef, useState, useEffect } from "react";
import { Pressable, StyleSheet, Animated, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { getNextFabMenuOpen, runFabItemAction } from "@/lib/fab-menu-state";

export interface FABButtonItem {
  id: string;
  icon: string;
  label?: string;
  onPress: () => void;
}

interface FABButtonProps {
  onPress?: () => void;
  icon?: string;
  label?: string;
  items?: FABButtonItem[];
}

export function FABButton({ onPress, icon = "add", label, items = [] }: FABButtonProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const rotateValue = useRef(new Animated.Value(0)).current;
  const offsetValuesRef = useRef<Animated.Value[]>([]);
  const [itemsCount, setItemsCount] = useState(items.length);
  const scaleMainValue = useRef(new Animated.Value(1)).current;

  // Initialize offset values for each menu item
  useEffect(() => {
    if (items.length !== itemsCount) {
      offsetValuesRef.current = items.map(() => new Animated.Value(0));
      setItemsCount(items.length);
    } else if (offsetValuesRef.current.length === 0 && items.length > 0) {
      offsetValuesRef.current = items.map(() => new Animated.Value(0));
    }
  }, [items.length, itemsCount]);

  const setMenuOpen = (open: boolean) => {
    if (items.length === 0) return;

    const toValue = open ? 1 : 0;

    if (offsetValuesRef.current.length === 0) {
      offsetValuesRef.current = items.map(() => new Animated.Value(0));
    }

    Animated.parallel([
      Animated.timing(rotateValue, {
        toValue,
        duration: 220,
        useNativeDriver: true,
      }),
      ...offsetValuesRef.current.map((offsetValue) =>
        Animated.timing(offsetValue, {
          toValue,
          duration: 220,
          useNativeDriver: true,
        })
      ),
    ]).start();

    setIsOpen(open);
  };

  const toggleMenu = () => {
    if (items.length === 0) {
      // إذا لم تكن هناك عناصر قائمة، قم بتنفيذ onPress العادي
      onPress?.();
      return;
    }

    setMenuOpen(getNextFabMenuOpen(isOpen, items.length));
  };

  const handleItemPress = (itemOnPress: () => void) => {
    runFabItemAction(() => setMenuOpen(false), itemOnPress);
  };

  const handlePressIn = () => {
    Animated.timing(scaleMainValue, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleMainValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // إذا كانت هناك عناصر قائمة، استخدم FABMenu، وإلا استخدم FABButton العادي
  if (items.length === 0) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleMainValue }],
          },
        ]}
      >
        <Pressable
          onPress={toggleMenu}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <MaterialIcons name={icon as any} size={28} color="#fff" />
        </Pressable>
      </Animated.View>
    );
  }

  // FABMenu مع قائمة خيارات
  return (
    <View style={styles.container}>
      {/* Overlay is deliberately behind menu actions so it only closes the menu when tapping outside. */}
      {isOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* Menu Items */}
      {items.map((item, index) => {
        if (!offsetValuesRef.current[index]) {
          offsetValuesRef.current[index] = new Animated.Value(0);
        }

        const offsetValue = offsetValuesRef.current[index];

        const translateY = offsetValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -((index + 1) * 70)],
        });

        const opacity = offsetValue.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [0, 0.5, 1],
        });

        return (
          <Animated.View
            key={item.id}
            style={[
              styles.menuItem,
              {
                transform: [{ translateY }],
                opacity,
                zIndex: 3,
              },
            ]}
            pointerEvents={isOpen ? "auto" : "none"}
          >
            <Pressable
              onPress={() => handleItemPress(item.onPress)}
              style={({ pressed }) => [
                styles.menuItemFab,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <MaterialIcons name={item.icon as any} size={24} color="#fff" />
            </Pressable>
          </Animated.View>
        );
      })}

      {/* Main FAB Button */}
      <Animated.View
        style={[
          styles.mainFabContainer,
          {
            transform: [{ rotate: rotateInterpolation }],
            zIndex: 4,
          },
        ]}
      >
        <Pressable
          onPress={toggleMenu}
          style={({ pressed }) => [
            styles.mainFab,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.9 : 1 }],
            },
          ]}
        >
          <MaterialIcons name={icon as any} size={28} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  mainFabContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
  },
  menuItemFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  overlay: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 1,
  },
});
