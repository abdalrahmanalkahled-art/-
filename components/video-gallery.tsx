import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, Image, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { VideoPlayer } from './video-player';

interface VideoGalleryProps {
  videos: { uri: string; title?: string }[];
  onDelete?: (uri: string) => void;
}

export function VideoGallery({ videos, onDelete }: VideoGalleryProps) {
  const colors = useColors();
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; title?: string } | null>(null);

  const renderVideoItem = ({ item }: { item: { uri: string; title?: string } }) => (
    <View style={styles.videoItemContainer}>
      <TouchableOpacity
        style={[styles.videoItem, { backgroundColor: colors.surface }]}
        onPress={() => setSelectedVideo(item)}
      >
        <View style={styles.videoThumbnail}>
          <MaterialIcons name="play-circle-outline" size={48} color={colors.primary} />
        </View>
        {item.title && (
          <Text style={[styles.videoTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.error }]}
          onPress={() => onDelete(item.uri)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (videos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <MaterialIcons name="videocam" size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد فيديوهات</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        visible={!!selectedVideo}
        transparent={false}
        onRequestClose={() => setSelectedVideo(null)}
      >
        {selectedVideo && (
          <VideoPlayer
            uri={selectedVideo.uri}
            title={selectedVideo.title}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 8,
    padding: 8,
  },
  videoItemContainer: {
    flex: 1,
    margin: 4,
    position: 'relative',
  },
  videoItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
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
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
});
