import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { LANGUAGES } from '../../data/constants';
import Icon from '../Icon';
import './dashboard.css';

/**
 * E. Last-Mile Accessibility Bar (Section 6.2-E)
 * Language dropdown + Read Aloud (native Web Speech API).
 *
 * Indian-language TTS voices (hi/mr/pa/ta) are frequently NOT installed on the
 * user's OS (esp. Windows). Speaking Devanagari/Tamil text with an English
 * voice produces gibberish — so when no matching voice exists we read the
 * English advisory text instead and surface a small note. Read-aloud therefore
 * always produces intelligible speech.
 */
export default function AccessibilityBar({ advisory }) {
  const selectedLanguage = useStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useStore((s) => s.setSelectedLanguage);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [note, setNote] = useState('');

  const langMeta = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  // getVoices() is populated asynchronously — listen for voiceschanged.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => setVoices(window.speechSynthesis.getVoices() || []);
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  // English advisory text (always intelligible regardless of installed voices).
  const buildEnglishText = () => {
    const alertText = (advisory.critical_alerts || []).map((a) => a.message).join(' ');
    const planText = (advisory.action_plan || [])
      .map((p) => `${p.action}. ${p.detail}`)
      .join(' ');
    return `${alertText} ${planText}`.trim();
  };

  // Find a voice for the target language; report whether we fell back.
  const resolveVoice = (targetLang) => {
    const base = targetLang.split('-')[0];
    let voice = voices.find((v) => v.lang === targetLang);
    if (!voice) voice = voices.find((v) => v.lang?.replace('_', '-').startsWith(base));
    if (voice) return { voice, lang: targetLang, usedFallback: false };

    const en =
      voices.find((v) => v.lang === 'en-IN') ||
      voices.find((v) => v.lang?.startsWith('en')) ||
      null;
    return { voice: en, lang: 'en-IN', usedFallback: true };
  };

  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setNote('Speech is not supported in this browser.');
      return;
    }
    const synth = window.speechSynthesis;

    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const { voice, lang, usedFallback } = resolveVoice(langMeta.speechLang);

    let text;
    if (selectedLanguage !== 'en' && !usedFallback) {
      // Native voice exists → speak the translated text.
      const t = advisory.translations?.[selectedLanguage];
      text = t?.action_plan_audio_text || t?.summary || buildEnglishText();
      setNote('');
    } else {
      // No native voice (or English selected) → speak English so it's intelligible.
      text = buildEnglishText();
      if (selectedLanguage !== 'en') {
        console.warn(`[ReadAloud] No ${langMeta.speechLang} voice installed — reading English.`);
        setNote(`No ${langMeta.label.split(' ')[0]} voice on this device — reading English.`);
      } else {
        setNote('');
      }
    }

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synth.speak(utterance);
  };

  return (
    <div className="access-bar">
      <div className="access-bar__lang">
        <span className="access-bar__lang-label mono">
          <Icon name="globe" size={13} /> LANG
        </span>
        <select
          className="access-bar__select"
          value={selectedLanguage}
          onChange={(e) => {
            if (window.speechSynthesis?.speaking) {
              window.speechSynthesis.cancel();
              setSpeaking(false);
            }
            setNote('');
            setSelectedLanguage(e.target.value);
          }}
          aria-label="Select language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {note && <span className="access-bar__note">{note}</span>}
      </div>

      <button
        className={`access-bar__read btn-brutal ${speaking ? 'is-speaking' : ''}`}
        onClick={handleReadAloud}
        aria-label={speaking ? 'Stop reading' : 'Read advisory aloud'}
      >
        <Icon name={speaking ? 'pause' : 'play'} size={16} strokeWidth={2} />
        {speaking ? 'STOP' : 'READ ALOUD'}
      </button>
    </div>
  );
}
