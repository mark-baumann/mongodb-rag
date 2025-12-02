"use client";

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePodcastMode } from './PodcastModeProvider';

export default function PodcastPlayer() {
  const { currentPodcast, setCurrentPodcast, isPlaying, setIsPlaying, playlist, playNext, playPrevious } = usePodcastMode();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Reset time when podcast changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
    }
  }, [currentPodcast?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        console.log('Duration updated:', audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      console.log('Podcast ended, playlist length:', playlist.length);
      setIsPlaying(false);

      // Auto-play next podcast if available
      if (currentPodcast && playlist.length > 1) {
        const currentIndex = playlist.findIndex((p) => p.documentId === currentPodcast.documentId);
        console.log('Current index:', currentIndex, 'of', playlist.length - 1);

        if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
          console.log('Auto-playing next podcast');
          setTimeout(() => {
            playNext();
          }, 500);
        }
      }
    };

    const handleLoadStart = () => {
      console.log('Audio load started');
    };

    const handleCanPlay = () => {
      console.log('Audio can play, duration:', audio.duration);
      updateDuration();
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', updateDuration);

    // Force load
    audio.load();

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', updateDuration);
    };
  }, [setIsPlaying, currentPodcast?.url]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle auto-play when podcast changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    const handleCanPlayAutoPlay = () => {
      console.log('Audio ready for auto-play');
      audio.play().catch(console.error);
    };

    audio.addEventListener('canplay', handleCanPlayAutoPlay, { once: true });

    return () => {
      audio.removeEventListener('canplay', handleCanPlayAutoPlay);
    };
  }, [currentPodcast?.url, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  if (!currentPodcast) return null;

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentDuration = audio.duration;
    if (!currentDuration || isNaN(currentDuration)) return;

    const newTime = Math.max(0, Math.min(currentDuration, audio.currentTime + seconds));
    audio.currentTime = newTime;
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={currentPodcast.url}
        preload="auto"
        crossOrigin="anonymous"
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 text-white shadow-2xl border-t border-emerald-900/50 pb-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-3 relative">
          {/* Close Button - Top Right */}
          <button
            onClick={() => setCurrentPodcast(null)}
            className="absolute top-2 sm:top-2 right-2 sm:right-4 p-1.5 sm:p-2 hover:bg-emerald-600 rounded-full transition z-10"
            title="Schließen"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Progress Bar */}
          <div className="mb-4 sm:mb-2 pr-10 sm:pr-12">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-emerald-100 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls - Shifted right on mobile */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 pr-10 sm:pr-12 ml-6 sm:ml-0">
            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {playlist.length > 1 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Previous clicked');
                    playPrevious();
                  }}
                  disabled={!currentPodcast || playlist.findIndex((p) => p.documentId === currentPodcast.documentId) === 0}
                  className="p-3 sm:p-2.5 hover:bg-emerald-600 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed active:bg-emerald-500"
                  title="Vorheriger Podcast"
                >
                  <SkipBack className="h-6 w-6 sm:h-6 sm:w-6" />
                </button>
              )}

              <button
                onClick={togglePlayPause}
                className="p-4 sm:p-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-full transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-7 w-7 sm:h-6 sm:w-6" /> : <Play className="h-7 w-7 sm:h-6 sm:w-6 ml-0.5" />}
              </button>

              {playlist.length > 1 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Next clicked, playlist:', playlist.length);
                    playNext();
                  }}
                  disabled={!currentPodcast || playlist.findIndex((p) => p.documentId === currentPodcast.documentId) === playlist.length - 1}
                  className="p-3 sm:p-2.5 hover:bg-emerald-600 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed active:bg-emerald-500"
                  title="Nächster Podcast"
                >
                  <SkipForward className="h-6 w-6 sm:h-6 sm:w-6" />
                </button>
              )}
            </div>

            {/* Volume - Hidden on mobile, right on desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={toggleMute} className="p-1 hover:bg-emerald-600 rounded transition">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-emerald-900/50 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
