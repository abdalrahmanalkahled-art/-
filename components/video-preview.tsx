import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { VideoPlayer } from './video-player';

interface VideoPreviewProps {
  videoUri: string | null;
  onRemove?: () => void;
  title?: string;
}

export function VideoPreview({ videoUri, onRemove, title }: VideoPreviewProps) {
  const colors = useColors();
  const [showPlayer, setShowPlayer] = useState(false);

  if (!videoUri) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.videoPreview}
          onPress={() => setShowPlayer(true)}
        >
          <View style={styles.videoThumbnail}>
            <MaterialIcons name="play-circle-outline" size={48} color={colors.primary} />
          </View>
          {title && (
            <Text style={[styles.videoTitle, { color: colors.foreground }]} numberOfLines={2}>
              {title}
            </Text>
          )}
        </TouchableOpacity>

        {onRemove && (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: colors.error }]}
            onPress={onRemove}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showPlayer}
        transparent={false}
        onRequestClose={() => setShowPlayer(false)}
      >
        <VideoPlayer
          uri={videoUri}
          title={title || 'معاينة الفيديو'}
          onClose={() => setShowPlayer(false)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    position: 'relative',
  },
  videoPreview: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  videoTitle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
