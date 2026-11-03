"use client";

/**
 * Audio Narration Guide Engine using the Web Speech Synthesis API
 * Provides native text-to-speech for heritage descriptions, inscription readings,
 * and audio tours across English, Hindi, and Gujarati.
 */

export function speakNarration(
  text: string,
  lang: "en" | "hi" | "gu" = "en",
  onEnd?: () => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  // Language mapping
  if (lang === "hi") {
    utterance.lang = "hi-IN";
  } else if (lang === "gu") {
    utterance.lang = "gu-IN";
  } else {
    utterance.lang = "en-US";
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopNarration(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}
