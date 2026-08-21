import React, { useCallback } from "react";
import {
  FlatList,
  FlatListProps,
  StyleSheet,
  View,
  Animated,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface SmoothFlatListProps<T> extends Omit<FlatListProps<T>, "scrollEventThrottle"> {
  children?: React.ReactNode;
  enableAnimations?: boolean;
}

export const SmoothFlatList = React.memo(
  React.forwardRef<FlatList, SmoothFlatListProps<any>>(
    (
      {
        enableAnimations = true,
        ...props
      }: SmoothFlatListProps<any>,
      ref
    ) => {
      const colors = useColors();
      const scrollOffset = React.useRef(new Animated.Value(0)).current;

      const handleScroll = useCallback(
        Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
          { useNativeDriver: false }
        ),
        [scrollOffset]
      );

      return (
        <FlatList
          ref={ref}
          {...props}
          onScroll={enableAnimations ? handleScroll : undefined}
          scrollEventThrottle={16}
          decelerationRate="normal"
          overScrollMode="auto"
          bounces={true}
          style={[
            styles.flatList,
            {
              backgroundColor: colors.background,
            },
            props.style,
          ]}
          contentContainerStyle={[
            styles.contentContainer,
            props.contentContainerStyle,
          ]}
        />
      );
    }
  )
);

SmoothFlatList.displayName = "SmoothFlatList";

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
