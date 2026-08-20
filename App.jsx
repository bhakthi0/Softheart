import { useEffect, useMemo, useRef, useState } from "react";

const appModes = [
  {
    id: "relationship",
    label: "Relationship Clarity",
    summary: "Talk through mixed signals, conflict, and uncertainty with honest perspective.",
  },
  {
    id: "breakup",
    label: "Breakup Recovery",
    summary: "Move from shock and rumination toward steadiness, meaning, and rebuilding.",
  },
  {
    id: "rebuilding",
    label: "Rebuild Yourself",
    summary: "Focus on self-respect, patterns, and the kind of relationship you want next.",
  },
];

const starterPrompts = [
  "He says he cares about me, but every time I ask for clarity he disappears.",
  "It's been five days since the breakup and I keep wanting to call him.",
  "I don't know if I'm overthinking this or if the relationship is actually making me smaller.",
  "I want help figuring out whether to stay, leave, or ask for something different.",
];

const recoveryStages = [
  { phase: "Shock", cue: "recent breakup, disbelief, desperate reconnection urges" },
  { phase: "Grief", cue: "crying spells, anger, bargaining, obsessive replaying" },
  { phase: "Processing", cue: "trying to understand what happened and why" },
  { phase: "Rebuilding", cue: "wanting routines, identity, and stability back" },
  { phase: "Growth", cue: "integrating lessons and preparing for healthier love" },
];

const promptSections = [
  {
    label: "Identity",
    text: "Softheart is warm, honest, patient, curious, and never sycophantic. It should sound like a wise, emotionally intelligent confidant.",
  },
  {
    label: "Listening Protocol",
    text: "Absorb the full story, reflect specifically, ask one clarifying question, then offer advice only after understanding the real issue.",
  },
  {
    label: "Honesty",
    text: "Always validate emotions, never enable harmful narratives, and gently present the other person's likely perspective when relevant.",
  },
  {
    label: "Recovery",
    text: "Use breakup phase detection so the tone shifts from emotional containment to meaning-making to identity rebuilding.",
  },
  {
    label: "Safety",
    text: "Pause relationship advice when the story suggests self-harm, abuse, coercion, or immediate danger. Name it clearly and escalate support.",
  },
];

const voiceProfiles = [
  { id: "soft", label: "Soft", rate: 0.94, pitch: 1.02 },
  { id: "steady", label: "Steady", rate: 0.9, pitch: 0.98 },
  { id: "gentle", label: "Gentle", rate: 0.88, pitch: 1.08 },
];

function inferMode(message, currentMode) {
  if (/\bbreakup|ended|ex|no contact|miss him|miss her|left me\b/i.test(message)) {
    return "breakup";
  }

  if (/\bmove on|rebuild|next relationship|self respect|better version\b/i.test(message)) {
    return "rebuilding";
  }

  return currentMode;
}

function detectSafety(message) {
  if (/\bkill myself|suicide|self harm|don't want to be alive|end my life\b/i.test(message)) {
    return "crisis";
  }

  if (/\bhit me|slapped|choked|scared of him|scared of her|controls me|checks my phone|threatened me\b/i.test(message)) {
    return "abuse";
  }

  return null;
}

function detectPhase(message) {
  if (/\bday|days|today|yesterday|just happened|can't believe\b/i.test(message)) {
    return "Shock";
  }

  if (/\bcry|angry|rage|text him|text her|obsessed|keep checking\b/i.test(message)) {
    return "Grief";
  }

  if (/\bwhy|understand|pattern|what happened|was it my fault\b/i.test(message)) {
    return "Processing";
  }

  if (/\brebuild|routine|move forward|future|open again\b/i.test(message)) {
    return "Rebuilding";
  }

  return "Growth";
}

function detectPatterns(historyText) {
  const patterns = [];

  if (/\bdisappears|silent|pulls away|comes back|hot and cold\b/i.test(historyText)) {
    patterns.push("inconsistency");
  }

  if (/\bclarity|commitment|define|where this is going\b/i.test(historyText)) {
    patterns.push("avoidance around commitment");
  }

  if (/\bsmall|anxious|walking on eggshells|scared\b/i.test(historyText)) {
    patterns.push("loss of emotional safety");
  }

  if (/\btext him|text her|call him|call her|reach out\b/i.test(historyText)) {
    patterns.push("urge to self-abandon for contact");
  }

  if (/\bunheard|ignored|not listened\b/i.test(historyText)) {
    patterns.push("feeling unheard");
  }

  return patterns;
}

function formatAssistantTurn(response) {
  return [
    response.mirror,
    response.question,
    response.advice,
    `Try this next: ${response.nextStep}`,
  ].join(" ");
}

function pickBestVoice(voices, preferredUri) {
  if (!voices.length) {
    return null;
  }

  if (preferredUri) {
    const exact = voices.find((voice) => voice.voiceURI === preferredUri);
    if (exact) {
      return exact;
    }
  }

  const preferredPatterns = [
    /samantha/i,
    /ava/i,
    /allison/i,
    /serena/i,
    /karen/i,
    /moira/i,
    /zira/i,
    /aria/i,
    /google uk english female/i,
    /google us english/i,
    /natural/i,
    /enhanced/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = voices.find(
      (voice) =>
        pattern.test(voice.name) || pattern.test(voice.voiceURI) || pattern.test(voice.lang),
    );
    if (match) {
      return match;
    }
  }

  return (
    voices.find((voice) => /en/i.test(voice.lang) && /female|woman/i.test(voice.name)) ||
    voices.find((voice) => /en/i.test(voice.lang)) ||
    voices[0]
  );
}

function buildAssistantReply(message, history, activeMode) {
  const safety = detectSafety(message);
  const phase = activeMode === "breakup" ? detectPhase(message) : "Relationship";
  const memoryText = history
    .filter((item) => item.role === "user")
    .map((item) => item.text)
    .join(" ");
  const patterns = detectPatterns(`${memoryText} ${message}`);

  if (safety === "crisis") {
    return {
      title: "Safety override",
      mirror:
        "What you shared sounds much bigger than relationship confusion. The priority here is your immediate safety, not relationship advice.",
      question: "Are you in immediate danger right now, or is there someone nearby you can contact this minute?",
      advice:
        "What you're describing goes beyond what I'm able to help with. Please contact iCall India at 9152987821 or Vandrevala Foundation at 1860-2662-345 right now, and if you're in immediate danger contact local emergency services.",
      otherSide: "Softheart should not shift into relational analysis here.",
      pattern: "Crisis language detected",
      phase: "Safety",
      journal: "Who can I reach out to in the next five minutes so I am not alone with this?",
      nextStep: "Call or message one real person immediately and do not stay alone with this.",
    };
  }

  if (safety === "abuse") {
    return {
      title: "Safety override",
      mirror:
        "This doesn't read like a normal relationship disagreement. The details point to fear, control, or coercion, and that needs to be named directly.",
      question: "When this happens, do you feel afraid of what they might do next if you push back or leave?",
      advice:
        "What you're describing sounds like abuse, not a relationship problem. Softheart should stop normal coaching, focus on safety, and encourage reaching out to trusted people and professional support.",
      otherSide: "Another perspective is not the priority when safety is at risk.",
      pattern: "Control and fear",
      phase: "Safety",
      journal: "What moments have made me feel least safe, and who already knows about them?",
      nextStep: "Reach out to one trusted person and make a concrete plan for your immediate safety.",
    };
  }

  if (activeMode === "breakup") {
    const phaseAdvice = {
      Shock:
        "Stay close to emotional regulation first. Help them get through tonight without making the pain bigger through impulse contact.",
      Grief:
        "Validate the urge without obeying it. Give one practical interruption for rumination or no-contact relapse.",
      Processing:
        "Start naming the actual pattern of the relationship, not just the pain of losing it.",
      Rebuilding:
        "Shift from the ex back toward identity, routines, friendships, and self-respect.",
      Growth:
        "Help them extract standards and lessons without pretending the loss no longer matters.",
    };

    return {
      title: "Breakup recovery",
      mirror:
        phase === "Shock"
          ? "This still feels raw enough that a part of you is looking for immediate relief, even if another part knows contact may reopen the wound."
          : "You're trying to make sense of the breakup without getting swallowed by it, which usually means the grief is starting to change shape.",
      question:
        phase === "Shock" || phase === "Grief"
          ? "If you reached out today, what are you hoping it would give you for the next hour?"
          : "When you replay the relationship, what pattern feels hardest to admit to yourself?",
      advice: phaseAdvice[phase],
      otherSide:
        "From what you've described, here's what they might be experiencing on their end: they may have stepped away because they couldn't meet the relationship with the consistency it required, even if they still cared.",
      pattern: patterns[0] ?? "grief and attachment looping",
      phase,
      journal:
        phase === "Shock" || phase === "Grief"
          ? "What am I hoping my ex would make me feel right now that I need to start giving myself in another way?"
          : "What truth about the relationship have I been softening because it hurts to name it clearly?",
      nextStep:
        phase === "Shock" || phase === "Grief"
          ? "Give yourself one no-contact protection for today: mute the chat, hand your phone to a friend, or write the message in notes instead of sending it."
          : "Write down the three clearest patterns from the relationship before you let longing rewrite the story.",
    };
  }

  if (activeMode === "rebuilding") {
    return {
      title: "Identity rebuilding",
      mirror:
        "This sounds less like a single conflict and more like a desire to become steadier, clearer, and less willing to shrink yourself in love.",
      question: "What version of you tends to show up in relationships that you no longer want running the show?",
      advice:
        "Softheart should help the user move from story to standards: what they need, what they tolerated too long, and what self-respect looks like before the next relationship begins.",
      otherSide:
        "Another perspective may matter, but the main work here is no longer decoding them. It's understanding you.",
      pattern: patterns[0] ?? "identity drift in relationships",
      phase: "Rebuilding",
      journal:
        "What did I keep compromising on in love that quietly taught me to abandon myself?",
      nextStep: "Write one relationship standard you will no longer negotiate away, even when you're lonely.",
    };
  }

  return {
    title: "Relationship clarity",
    mirror:
      "There seems to be a real mismatch between what the relationship is making you feel and what you keep hoping it could become.",
    question:
      "When you ask for clarity or consistency, do you usually get a real answer and changed behavior, or just temporary reassurance?",
    advice:
      "Softheart should be kind but unsparing here: help the user separate chemistry from consistency, and stop treating confusion as a sign of depth.",
    otherSide:
      "From what you've described, here's what they might be experiencing on their end: they may enjoy closeness when it feels easy, but pull back when the relationship asks for steadiness or accountability.",
    pattern: patterns[0] ?? "confusion becoming a cycle",
    phase: "Relationship",
    journal:
      "What am I still hoping this relationship will become, and what has it actually shown me so far?",
    nextStep: "Ask for one concrete behavior change or one clear answer instead of settling for emotional fog.",
  };
}

function App() {
  const [activeMode, setActiveMode] = useState("relationship");
  const [composer, setComposer] = useState(starterPrompts[0]);
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text:
        "Tell me what's been happening in your relationship. I'll listen carefully, reflect back the real issue, ask one question that matters, and then give you an honest read.",
      response: null,
    },
  ]);
  const [journalEntries] = useState([
    {
      title: "Core need check",
      text: "What have I been asking this relationship to give me that it consistently does not give?",
    },
    {
      title: "Self-respect check",
      text: "What have I normalized here that I would warn my closest friend not to accept?",
    },
  ]);
  const [noContactDays, setNoContactDays] = useState(11);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [supportsRecognition, setSupportsRecognition] = useState(false);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState("soft");
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const shouldSubmitVoiceRef = useRef(false);
  const submitStoryRef = useRef(null);

  const latestAssistantReply = useMemo(() => {
    const latest = [...messages].reverse().find((item) => item.role === "assistant" && item.response);
    return latest?.response ?? buildAssistantReply(composer, messages, activeMode);
  }, [activeMode, composer, messages]);

  const voiceButtonLabel = useMemo(() => {
    if (voiceStatus === "listening") {
      return "Done";
    }

    if (voiceStatus === "processing") {
      return "Thinking...";
    }

    if (voiceStatus === "speaking") {
      return "Speaking";
    }

    return "Talk";
  }, [voiceStatus]);

  const voiceHint = useMemo(() => {
    if (voiceStatus === "listening") {
      return "Softheart is listening. Tap again when you've finished your story.";
    }

    if (voiceStatus === "processing") {
      return "Softheart is reading the full story and preparing a response.";
    }

    if (voiceStatus === "speaking") {
      return "Softheart is responding out loud.";
    }

    return "Tap the mic, tell your story, then tap again to get suggestions.";
  }, [voiceStatus]);

  const historySummary = useMemo(() => {
    const userHistory = messages.filter((item) => item.role === "user").map((item) => item.text).join(" ");
    return detectPatterns(userHistory);
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const hasSpeechSynthesis =
      "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

    setSupportsRecognition(Boolean(SpeechRecognition));
    setSupportsSpeech(hasSpeechSynthesis);

    if (!SpeechRecognition) {
      if (hasSpeechSynthesis) {
        const loadVoices = () => {
          const voices = window.speechSynthesis
            .getVoices()
            .filter((voice) => /en/i.test(voice.lang));
          setAvailableVoices(voices);
          const bestVoice = pickBestVoice(voices, selectedVoiceUri);
          if (bestVoice && !selectedVoiceUri) {
            setSelectedVoiceUri(bestVoice.voiceURI);
          }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
          window.speechSynthesis.onvoiceschanged = null;
          window.speechSynthesis.cancel();
        };
      }

      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setVoiceStatus("listening");
      setVoiceError("");
      setLiveTranscript("");
      transcriptRef.current = "";
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setLiveTranscript(transcript);
      transcriptRef.current = transcript;

      if (event.results[event.results.length - 1]?.isFinal && transcript) {
        setComposer(transcript);
        setActiveMode((current) => inferMode(transcript, current));
      }
    };

    recognition.onerror = (event) => {
      setVoiceStatus("error");
      setVoiceError(event.error === "not-allowed" ? "Microphone access was blocked." : `Voice input error: ${event.error}.`);
    };

    recognition.onend = () => {
      const transcript = transcriptRef.current.trim();

      if (shouldSubmitVoiceRef.current && transcript) {
        shouldSubmitVoiceRef.current = false;
        submitStoryRef.current?.(transcript, { speakReply: true, clearComposer: false });
        return;
      }

      shouldSubmitVoiceRef.current = false;
      setVoiceStatus((current) => (current === "speaking" ? current : "idle"));
    };

    recognitionRef.current = recognition;

    if (hasSpeechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis
          .getVoices()
          .filter((voice) => /en/i.test(voice.lang));
        setAvailableVoices(voices);
        const bestVoice = pickBestVoice(voices, selectedVoiceUri);
        if (bestVoice && !selectedVoiceUri) {
          setSelectedVoiceUri(bestVoice.voiceURI);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      recognition.stop();
      if (hasSpeechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoiceUri]);

  function speakResponse(response) {
    if (typeof window === "undefined" || !supportsSpeech) {
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(formatAssistantTurn(response));
    const chosenVoice = pickBestVoice(availableVoices, selectedVoiceUri);
    const profile = voiceProfiles.find((item) => item.id === voiceProfileId) ?? voiceProfiles[0];

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }

    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = 1;
    utterance.onstart = () => {
      setVoiceStatus("speaking");
      setVoiceError("");
    };
    utterance.onend = () => {
      setVoiceStatus("idle");
    };
    utterance.onerror = () => {
      setVoiceStatus("error");
      setVoiceError("Speech playback failed.");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function submitStory(rawText, options = {}) {
    const { speakReply = false, clearComposer = true } = options;
    const text = rawText.trim();
    if (!text) {
      return;
    }

    const nextMode = inferMode(text, activeMode);
    const response = buildAssistantReply(text, messages, nextMode);

    setActiveMode(nextMode);
    setMessages((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        role: "user",
        text,
        response: null,
      },
      {
        id: `assistant-${current.length + 2}`,
        role: "assistant",
        text: formatAssistantTurn(response),
        response,
      },
    ]);
    if (clearComposer) {
      setComposer("");
    }
    setLiveTranscript("");
    transcriptRef.current = "";

    if (speakReply) {
      speakResponse(response);
    }
  }

  function handleSendStory() {
    submitStory(composer, { speakReply: false, clearComposer: true });
  }

  submitStoryRef.current = submitStory;

  function handleStartListening() {
    if (!supportsRecognition || !recognitionRef.current) {
      setVoiceStatus("error");
      setVoiceError("Speech recognition is not available in this browser.");
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setVoiceStatus("requesting");
    setVoiceError("");
    shouldSubmitVoiceRef.current = true;
    recognitionRef.current.start();
  }

  function handleStopListening() {
    shouldSubmitVoiceRef.current = true;
    recognitionRef.current?.stop();
    setVoiceStatus("processing");
  }

  function handleMicToggle() {
    if (voiceStatus === "listening") {
      handleStopListening();
      return;
    }

    if (voiceStatus === "speaking") {
      handleStopSpeaking();
    }

    if (voiceStatus !== "processing") {
      handleStartListening();
    }
  }

  function handleSpeakLatest() {
    if (typeof window === "undefined" || !supportsSpeech) {
      setVoiceError("Speech playback is not available in this browser.");
      return;
    }

    speakResponse(latestAssistantReply);
  }

  function handleStopSpeaking() {
    if (typeof window === "undefined" || !supportsSpeech) {
      return;
    }

    window.speechSynthesis.cancel();
    setVoiceStatus("idle");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Softheart</p>
          <h1>Honest relationship support that listens like a person, not a template.</h1>
          <p className="hero-text">
            Softheart is designed for people who need clarity in relationships, support during
            heartbreak, and a truthful voice that helps them feel better without flattering them
            or keeping them stuck.
          </p>

          <div className="hero-mode-row">
            {appModes.map((mode) => (
              <button
                key={mode.id}
                className={`mode-pill ${activeMode === mode.id ? "mode-pill-active" : ""}`}
                onClick={() => setActiveMode(mode.id)}
                type="button"
              >
                <span>{mode.label}</span>
                <strong>{mode.summary}</strong>
              </button>
            ))}
          </div>
        </div>

        <aside className="hero-side">
          <div className="metric-card">
            <span>Current mode</span>
            <strong>{appModes.find((mode) => mode.id === activeMode)?.label}</strong>
          </div>
          <div className="metric-card">
            <span>Voice support</span>
            <strong>{supportsRecognition && supportsSpeech ? "Mic + playback ready" : "Prototype fallback"}</strong>
          </div>
          <div className="metric-card">
            <span>Voice style</span>
            <strong>{voiceProfiles.find((item) => item.id === voiceProfileId)?.label}</strong>
          </div>
          <div className="metric-card">
            <span>Recovery phase</span>
            <strong>{latestAssistantReply.phase}</strong>
          </div>
        </aside>
      </section>

      <section className="workspace-grid">
        <section className="conversation-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Conversation</p>
              <h2>Talk to Softheart</h2>
            </div>
            <p className="section-note">Tell the full story first. Softheart listens, then responds with clarity.</p>
          </div>

          <div className="messages-list">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.role === "assistant" ? "message-assistant" : "message-user"}`}
              >
                <p className="message-role">{message.role === "assistant" ? "Softheart" : "You"}</p>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <div className="composer-card">
            <div className="composer-top">
              <div className="composer-intro">
                <label className="field-label" htmlFor="storyInput">
                  Your story
                </label>
                <p className="composer-copy">
                  Type if you want, or use the mic for a more natural back-and-forth.
                </p>
              </div>

              <button
                className={`mic-button mic-${voiceStatus}`}
                onClick={handleMicToggle}
                type="button"
                disabled={voiceStatus === "processing"}
              >
                <span className="mic-button-core">o</span>
                <strong>{voiceButtonLabel}</strong>
              </button>
            </div>

            <textarea
              id="storyInput"
              className="story-input"
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              placeholder="Describe what is happening in the relationship or breakup."
              rows={6}
            />

            <div className="transcript-bar">
              <span>Voice status: {voiceStatus}</span>
              <span>{liveTranscript || voiceHint}</span>
            </div>

            <div className="voice-settings-row">
              <label className="voice-setting" htmlFor="voiceProfile">
                <span>Voice style</span>
                <select
                  id="voiceProfile"
                  className="voice-select"
                  value={voiceProfileId}
                  onChange={(event) => setVoiceProfileId(event.target.value)}
                >
                  {voiceProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="voice-setting" htmlFor="voiceChoice">
                <span>Installed voice</span>
                <select
                  id="voiceChoice"
                  className="voice-select"
                  value={selectedVoiceUri}
                  onChange={(event) => setSelectedVoiceUri(event.target.value)}
                  disabled={!availableVoices.length}
                >
                  {!availableVoices.length ? (
                    <option value="">No voices found</option>
                  ) : (
                    availableVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {voiceError ? <p className="error-text">{voiceError}</p> : null}

            <div className="starter-row">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="starter-chip"
                  onClick={() => {
                    setComposer(prompt);
                    setActiveMode((current) => inferMode(prompt, current));
                  }}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="composer-actions">
              <button className="primary-button" onClick={handleSendStory} type="button">
                Send to Softheart
              </button>
              <button className="ghost-button" onClick={handleSpeakLatest} type="button">
                Replay reply
              </button>
            </div>
          </div>
        </section>

        <aside className="insight-rail">
          <section className="insight-card spotlight-card">
            <p className="eyebrow">Softheart's Read</p>
            <h3>{latestAssistantReply.title}</h3>
            <div className="insight-block">
              <span>Reflection</span>
              <p>{latestAssistantReply.mirror}</p>
            </div>
            <div className="insight-block">
              <span>Clarifying question</span>
              <p>{latestAssistantReply.question}</p>
            </div>
            <div className="insight-block">
              <span>Advice direction</span>
              <p>{latestAssistantReply.advice}</p>
            </div>
            <div className="insight-block">
              <span>What to do next</span>
              <p>{latestAssistantReply.nextStep}</p>
            </div>
          </section>

          <section className="insight-card">
            <p className="eyebrow">Honest Lens</p>
            <h3>The other side</h3>
            <p>{latestAssistantReply.otherSide}</p>
          </section>

          <section className="insight-card">
            <p className="eyebrow">Pattern Tracker</p>
            <h3>What keeps repeating</h3>
            <div className="tag-row">
              {(historySummary.length ? historySummary : [latestAssistantReply.pattern]).map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="dashboard-grid">
        <section className="panel-card recovery-panel">
          <div className="recovery-hero">
            <div className="recovery-copy">
              <p className="eyebrow">Breakup Recovery</p>
              <h2>Move on without abandoning yourself</h2>
              <p className="recovery-copy-text">
                Healing moves in phases. Softheart keeps you oriented so heartbreak does not keep
                rewriting the story or your self-respect.
              </p>
            </div>
            <aside className="recovery-counter-card">
              <span className="recovery-counter-label">No-contact streak</span>
              <strong className="recovery-counter-value">{noContactDays}</strong>
              <p className="recovery-counter-copy">days of protecting your peace</p>
              <div className="counter-control">
                <button className="icon-button" onClick={() => setNoContactDays((days) => Math.max(0, days - 1))} type="button">
                  -
                </button>
                <button className="icon-button" onClick={() => setNoContactDays((days) => days + 1)} type="button">
                  +
                </button>
              </div>
            </aside>
          </div>

          <div className="phase-grid">
            {recoveryStages.map((stage, index) => (
              <article
                key={stage.phase}
                className={`phase-card ${latestAssistantReply.phase === stage.phase ? "phase-card-active" : ""}`}
              >
                <span className="phase-step">{`0${index + 1}`}</span>
                <h3>{stage.phase}</h3>
                <p>{stage.cue}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <p className="eyebrow">Journal Prompts</p>
          <h2>Questions that create clarity</h2>
          <div className="journal-list">
            <article className="journal-card journal-card-highlight">
              <span>Suggested now</span>
              <p>{latestAssistantReply.journal}</p>
            </article>
            {journalEntries.map((entry) => (
              <article className="journal-card" key={entry.title}>
                <span>{entry.title}</span>
                <p>{entry.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="system-grid">
        <section className="panel-card">
          <p className="eyebrow">Voice Mode</p>
          <h2>Built into the product, not added later</h2>
          <div className="support-grid">
            <div className="support-box">
              <span>Speech recognition</span>
              <strong>{supportsRecognition ? "Available" : "Unavailable"}</strong>
            </div>
            <div className="support-box">
              <span>Speech playback</span>
              <strong>{supportsSpeech ? "Available" : "Unavailable"}</strong>
            </div>
            <div className="support-box">
              <span>Current state</span>
              <strong>{voiceStatus}</strong>
            </div>
          </div>
          <p className="panel-copy">
            The prototype already supports microphone input and spoken replies in compatible
            browsers. The next production step is a streaming voice stack so the experience stays
            reliable across devices.
          </p>
        </section>

        <section className="panel-card">
          <p className="eyebrow">Model Brain</p>
          <h2>How Softheart is guided</h2>
          <div className="brain-list">
            {promptSections.map((section) => (
              <article className="brain-item" key={section.label}>
                <h3>{section.label}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
