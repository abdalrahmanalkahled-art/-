import React, { useRef, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

interface VideoPlayerProps {
  uri: string;
  title?: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

export function VideoPlayer({ uri, title, onClose, autoPlay = false }: VideoPlayerProps) {
  const colors = useColors();
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    if (autoPlay) {
      player.play();
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleSeek = useCallback((newPosition: number) => {
    player.seekBy(newPosition - position);
  }, [player, position]);

  const handleShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (player.playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [player.playing]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title || 'تشغيل الفيديو'}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Video Container */}
      <TouchableOpacity
        style={[styles.videoContainer, { backgroundColor: '#000' }]}
        onPress={handleShowControls}
        activeOpacity={1}
      >
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {showControls && !isLoading && (
          <View style={styles.controlsOverlay}>
            {/* Play/Pause Button */}
            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
              <MaterialIcons
                name={player.playing ? 'pause' : 'play-arrow'}
                size={48}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.primary,
                    width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                  },
                ]}
              />
            </View>

            {/* Time Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handleSeek(Math.max(0, position - 10000))}
          style={styles.controlButton}
        >
          <MaterialIcons name="replay-10" size={24} color={colors.primary} />
          <Text style={[styles.controlText, { color: colors.foreground }]}>-10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayPause}
          style={[styles.playButtonLarge, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons
            name={player.playing ? 'pause' : 'play-arrow'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSeek(Math.min(duration, position + 10000))}
          style={styles.controlButton}
        >
          <MaterialIcons name="forward-10" size={24} color={colors.primary} />
          <Text style={[styles.controlText, { color: colors.foreground }]}>+10s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  playButton: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlText: {
    fontSize: 12,
    fontWeight: '500',
  },
  playButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
