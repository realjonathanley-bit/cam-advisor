'use client';

import { useState, useCallback } from 'react';
import type { PlacedCamera } from '@/types';
import { uid, clamp } from '@/utils/helpers';
import {
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_FOV_LENGTH,
  DEFAULT_DOORBELL_FOV,
  DEFAULT_DOORBELL_FOV_LENGTH,
} from '@/lib/constants';

interface UsePlanningEditorOptions {
  imageWidth: number;
  imageHeight: number;
}

export function usePlanningEditor({ imageWidth, imageHeight }: UsePlanningEditorOptions) {
  const [cameras, setCameras] = useState<PlacedCamera[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFov, setShowFov] = useState(true);

  const addCamera = useCallback(
    (type: 'camera' | 'doorbell') => {
      const id = uid(type === 'doorbell' ? 'door' : 'cam');
      setCameras(prev => {
        const newCam: PlacedCamera = {
          id,
          type,
          x: imageWidth / 2,
          y: imageHeight / 2,
          rotation: 270, // pointing up (toward street)
          fovAngle: type === 'doorbell' ? DEFAULT_DOORBELL_FOV : DEFAULT_CAMERA_FOV,
          fovLength: type === 'doorbell' ? DEFAULT_DOORBELL_FOV_LENGTH : DEFAULT_CAMERA_FOV_LENGTH,
          label: type === 'doorbell' ? 'Timbre' : `Cámara ${prev.length + 1}`,
        };
        return [...prev, newCam];
      });
      setSelectedId(id);
      return id;
    },
    [imageWidth, imageHeight],
  );

  const selectCamera = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const moveCamera = useCallback(
    (id: string, x: number, y: number) => {
      setCameras(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, x: clamp(x, 0, imageWidth), y: clamp(y, 0, imageHeight) }
            : c,
        ),
      );
    },
    [imageWidth, imageHeight],
  );

  const rotateCamera = useCallback((id: string, rotation: number) => {
    setCameras(prev =>
      prev.map(c =>
        c.id === id ? { ...c, rotation: ((rotation % 360) + 360) % 360 } : c,
      ),
    );
  }, []);

  const updateCamera = useCallback((id: string, patch: Partial<PlacedCamera>) => {
    setCameras(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCamera = useCallback((id: string) => {
    setCameras(prev => prev.filter(c => c.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  const reset = useCallback(() => {
    setCameras([]);
    setSelectedId(null);
  }, []);

  const toggleFov = useCallback(() => {
    setShowFov(prev => !prev);
  }, []);

  return {
    cameras,
    selectedId,
    showFov,
    addCamera,
    selectCamera,
    moveCamera,
    rotateCamera,
    updateCamera,
    deleteCamera,
    reset,
    toggleFov,
  };
}

export type PlanningEditorHandle = ReturnType<typeof usePlanningEditor>;
