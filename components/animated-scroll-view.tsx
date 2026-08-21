import React, { useState } from "react";
import {
  ScrollView,
  ScrollViewProps,
  Animated,
  View,
  StyleSheet,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface AnimatedScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}

export const AnimatedScrollView = React.memo(
  ({
    children,
    showsVerticalScrollIndicator = true,
    showsHorizontalScrollIndicator = true,
    ...props
  }: AnimatedScrollViewProps) => {
    const colors = useColors();
    const [scrollOffset] = useState(new Animated.Value(0));

    const handleScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
      { useNativeDriver: false }
    );

    return (
      <ScrollView
        {...props}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        decelerationRate="normal"
        overScrollMode="auto"
        style={[
          styles.scrollView,
          {
            backgroundColor: colors.background,
          },
          props.style,
        ]}
        contentContainerStyle={[
          styles.contentContainer,
          props.contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    );
  }
);

AnimatedScrollView.displayName = "AnimatedScrollView";

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
