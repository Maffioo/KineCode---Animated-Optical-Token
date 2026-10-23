import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  Linking,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { FrameCollector } from 'kinecode';

function extractDomain(rawUrl?: string): string {
  if (!rawUrl) return 'Verified Token';
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'Verified Token';
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname || trimmed;
  } catch {
    const match = /^(?:https?:\/\/)?([^/?#:]+)/i.exec(trimmed);
    return match?.[1] || trimmed;
  }
}

function normalizeOpenableUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Standard External Link vector icon rendered with native Views (zero dependencies, no emojis)
 */
function ExternalLinkIcon({ color = '#0A0A0C' }: { color?: string }) {
  return (
    <View style={styles.extIconContainer}>
      {/* Box bottom-left walls */}
      <View style={[styles.extBoxLeft, { backgroundColor: color }]} />
      <View style={[styles.extBoxBottom, { backgroundColor: color }]} />
      <View style={[styles.extBoxTopHalf, { backgroundColor: color }]} />
      <View style={[styles.extBoxRightHalf, { backgroundColor: color }]} />
      {/* Top-right arrow head & diagonal shaft */}
      <View style={[styles.extArrowTop, { backgroundColor: color }]} />
      <View style={[styles.extArrowRight, { backgroundColor: color }]} />
      <View style={[styles.extArrowShaft, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * Clean geometric Checkmark icon rendered with native Views (no emojis)
 */
function CheckmarkBadge() {
  return (
    <View style={styles.checkBadgeCircle}>
      <View style={styles.checkGlyph}>
        <View style={styles.checkShortLeg} />
        <View style={styles.checkLongLeg} />
      </View>
    </View>
  );
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedTotalFrames, setDetectedTotalFrames] = useState<number | null>(null);
  const [lockedSlots, setLockedSlots] = useState<number[]>([]);
  const [hintText, setHintText] = useState<string>('Point camera at the KineCode');
  const [verifiedSession, setVerifiedSession] = useState<{
    domain: string;
    signedUrl?: string;
    actionMode?: string;
  } | null>(null);

  const collectorRef = useRef<FrameCollector>(new FrameCollector());
  const cooldownUntilRef = useRef<number>(0);

  const resetScanner = () => {
    collectorRef.current.reset();
    setDetectedTotalFrames(null);
    setLockedSlots([]);
    setVerifiedSession(null);
    setHintText('Point camera at the KineCode');
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (now < cooldownUntilRef.current || verifiedSession) return;

    const step = collectorRef.current.pushFrame(result.data, now);
    if (step.status === 'ignored') return;

    if (step.totalFrames > 0 && detectedTotalFrames !== step.totalFrames) {
      setDetectedTotalFrames(step.totalFrames);
    }

    if (step.status === 'collecting') {
      if (step.isNewSlot) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setLockedSlots(step.lockedIndices);
        setHintText(`Locked — Capturing ${step.lockedFrames}/${step.totalFrames}`);
      }
      return;
    }

    if (step.status === 'rejected') {
      setLockedSlots([]);
      setHintText(
        step.result?.error?.includes('expired')
          ? 'Code expired — Please scan again'
          : 'Verification failed — Please scan again'
      );
      return;
    }

    if (step.status === 'verified' && step.result) {
      const res = step.result;
      const targetUrl = res.targetUrl;
      const signedUrl = res.signedUrl;
      const actionMode = res.actionMode;

      if (targetUrl && (actionMode === 'webhook' || actionMode === 'both')) {
        const sessionHex =
          res.sessionId !== undefined
            ? `0x${res.sessionId.toString(16).toUpperCase().padStart(8, '0')}`
            : undefined;
        fetch(normalizeOpenableUrl(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'proof_of_presence_verified',
            sessionId: res.sessionId,
            sessionIdHex: sessionHex,
            timestamp: res.timestamp,
            cycleNonce: res.cycleNonce,
            signature: res.signatureHex,
            signedUrl,
            verifiedAt: new Date().toISOString()
          })
        }).catch(() => {});
      }

      cooldownUntilRef.current = now + 2500;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setVerifiedSession({
        domain: extractDomain(targetUrl),
        signedUrl,
        actionMode
      });
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar style="light" />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permDesc}>
          KineCode uses your camera to scan animated optical verification tokens.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('./assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.logoText}>KineCode</Text>
          <Text style={styles.logoBadge}>SCANNER</Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Native Hardware Camera & QR Scanner */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Top Guidance Banner */}
        <View style={styles.hudTop}>
          <View
            style={[
              styles.guidancePill,
              lockedSlots.length > 0 && styles.guidancePillLocked
            ]}
          >
            <Text style={styles.guidanceText}>{hintText}</Text>
          </View>
        </View>

        {/* Center Framing Reticle */}
        <View style={styles.reticleBox} pointerEvents="none" />

        {/* Bottom Dynamic Auto-Detect Progress Bar */}
        <View style={styles.hudBottom}>
          <Text style={styles.progressLabel}>
            {detectedTotalFrames
              ? `Capturing frames: ${lockedSlots.length} / ${detectedTotalFrames}`
              : 'Ready to scan KineCode...'}
          </Text>
          {detectedTotalFrames ? (
            <View style={styles.slotsRow}>
              {Array.from({ length: detectedTotalFrames }).map((_, idx) => {
                const isLocked = lockedSlots.includes(idx);
                return (
                  <View
                    key={idx}
                    style={[styles.slotBar, isLocked && styles.slotBarLocked]}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      {/* Verification Modal (Distribution Ready, Zero Emojis) */}
      <Modal visible={verifiedSession !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <CheckmarkBadge />
            <Text style={styles.modalTitle}>Presence Verified</Text>

            <View style={styles.domainPill}>
              <Text style={styles.domainLabel}>WEBSITE</Text>
              <Text style={styles.domainValue} numberOfLines={1}>
                {verifiedSession?.domain}
              </Text>
            </View>

            {verifiedSession?.signedUrl ? (
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  if (verifiedSession?.signedUrl) {
                    Linking.openURL(normalizeOpenableUrl(verifiedSession.signedUrl));
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Open Link</Text>
                <ExternalLinkIcon color="#0A0A0C" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={resetScanner}>
              <Text style={styles.modalSecondaryBtnText}>New Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C'
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center'
  },
  permDesc: {
    color: '#8E94A5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  primaryBtn: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10
  },
  primaryBtnText: {
    color: '#0A0A0C',
    fontWeight: '700',
    fontSize: 15
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111217',
    borderBottomWidth: 1,
    borderBottomColor: '#1F222E'
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoImg: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF'
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  logoBadge: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  resetBtn: {
    backgroundColor: '#1A1C24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#292D3D'
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hudTop: {
    marginTop: 24,
    alignItems: 'center'
  },
  guidancePill: {
    backgroundColor: 'rgba(8, 9, 14, 0.88)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  guidancePillLocked: {
    borderColor: '#00FF88'
  },
  guidanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  reticleBox: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 16
  },
  hudBottom: {
    width: '85%',
    marginBottom: 32,
    backgroundColor: 'rgba(8, 9, 14, 0.88)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%'
  },
  slotBar: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  slotBarLocked: {
    backgroundColor: '#00FF88'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: '#13141A',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#272A38',
    width: '100%',
    maxWidth: 340
  },
  checkBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  checkGlyph: {
    width: 22,
    height: 22,
    position: 'relative'
  },
  checkShortLeg: {
    position: 'absolute',
    width: 8,
    height: 2.5,
    backgroundColor: '#00FF88',
    borderRadius: 1.5,
    left: 2,
    top: 12,
    transform: [{ rotate: '45deg' }]
  },
  checkLongLeg: {
    position: 'absolute',
    width: 15,
    height: 2.5,
    backgroundColor: '#00FF88',
    borderRadius: 1.5,
    left: 6,
    top: 10,
    transform: [{ rotate: '-45deg' }]
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16
  },
  domainPill: {
    width: '100%',
    backgroundColor: '#1A1C24',
    borderWidth: 1,
    borderColor: '#292D3D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 22
  },
  domainLabel: {
    color: '#8E94A5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4
  },
  domainValue: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '700'
  },
  modalPrimaryBtn: {
    backgroundColor: '#00FF88',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  modalSecondaryBtn: {
    backgroundColor: '#1A1C24',
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#292D3D',
    alignItems: 'center'
  },
  modalSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  extIconContainer: {
    width: 16,
    height: 16,
    position: 'relative'
  },
  extBoxLeft: {
    position: 'absolute',
    left: 1,
    bottom: 1,
    width: 2,
    height: 11,
    borderRadius: 1
  },
  extBoxBottom: {
    position: 'absolute',
    left: 1,
    bottom: 1,
    width: 11,
    height: 2,
    borderRadius: 1
  },
  extBoxTopHalf: {
    position: 'absolute',
    left: 1,
    top: 4,
    width: 5,
    height: 2,
    borderRadius: 1
  },
  extBoxRightHalf: {
    position: 'absolute',
    right: 4,
    bottom: 1,
    width: 2,
    height: 5,
    borderRadius: 1
  },
  extArrowTop: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 6,
    height: 2,
    borderRadius: 1
  },
  extArrowRight: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 2,
    height: 6,
    borderRadius: 1
  },
  extArrowShaft: {
    position: 'absolute',
    left: 4.5,
    top: 5,
    width: 10.5,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }]
  }
});
