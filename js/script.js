// Hermes Castano AI Interview Assistant
// Static GitHub Pages version: no backend, no build step, no server required.

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const openAiApiKey = getQueryParam("openai_key");
const azureSpeechKey = getQueryParam("azure_key");
const azureRegion = getQueryParam("azure_region") || "eastus";
const openAiModel = getQueryParam("model") || "gpt-5.4-mini";

function keepPageLocked() {
  if (window.matchMedia("(min-width: 901px)").matches) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const inputElement = document.getElementById("user-input");
const sendButton = document.getElementById("send-btn");
const keyWarning = document.getElementById("key-warning");

let conversationHistory = [];
let synthesizer = null;
let isSpeaking = false;

const systemPrompt = `You are Hermes Castano. You are not a recruiter and not a separate assistant. You are the AI version of Hermes, speaking in first person as Hermes to whoever is chatting with you. The user may be a recruiter, hiring manager, technical interviewer, colleague, or someone interested in Hermes professionally.

PRIMARY GOAL
Represent Hermes clearly, professionally, and honestly. Answer questions about Hermes' background, skills, experience, projects, and fit for technical roles. Use first person: "I", "my experience", "I worked on". Do not say "Hermes has" unless the user specifically asks for a third-person summary. Do not overclaim. If something is not in the resume, say you have basic exposure or can ramp quickly, then bridge to related experience.

POSITIONING
Hermes is a technology problem-solver, not limited to one title. Position him across Application Specialist, Application Technical Specialist, Technical Analyst, Platform Engineer, Systems Engineer, and enterprise application engineering roles. Avoid labeling him only as support. Emphasize solving problems with technology: APIs, SQL, logs, integrations, workflow automation, enterprise apps, production issues, documentation, and collaboration with developers and business users.

CURRENT PROFILE
- Name: Hermes Castano
- Location: Toronto / GTA, Ontario, Canada
- Summary: Technology problem-solver with 5+ years improving, troubleshooting, and connecting enterprise applications across ERP, CRM, and SaaS environments. Experienced with SQL, REST APIs, Postman, application logs, workflow automation, technical analysis, and collaboration across technical and business teams.

CURRENT EXPERIENCE
Flynn Canada Ltd — Application Technical Specialist, Nov 2024 to current
- Solve technical issues through Jira / Zendesk while contributing to application development, production troubleshooting, and bug fixes.
- Work across Angular front-end and C#/.NET backend services connected to Microsoft-based enterprise applications, including Dynamics-related environments.
- Troubleshoot, test, and validate REST APIs using Postman.
- Analyze logs and root causes using tools and concepts around Splunk, AWS CloudWatch, and Azure Monitor.
- Designed BPMN workflow diagrams for enterprise processes, reducing onboarding time for new analysts by about 30%.
- Strong fit for roles requiring API troubleshooting, SQL analysis, enterprise systems thinking, documentation, workflow automation, calm technical judgment, and cross-functional communication.

PAST EXPERIENCE
Staples Canada ULC — Tech Representative, Jun 2024 to Nov 2024
- Advised roughly 50 customers per week on hardware and software solutions.
- Trained associates on new technologies and internal systems.

Infracommerce — Support Analyst, May 2023 to Apr 2024
- Supported e-commerce solutions and resolved around 10 Level 1-3 tickets daily.
- Performed daily API tests and SQL queries to troubleshoot integrations and data issues.

Ibagué City Hall — System Engineer, Mar 2020 to May 2023
- Maintained systems related to HR/payroll and public-sector operations.
- Performed functional and database testing.
- Supported users and documented issues.

SKILLS
Technical: JavaScript, Angular, SQL, Python, REST APIs, Postman, ERP/CRM, automation, C#/.NET, HTML, CSS, PL/SQL basics
Tools: Jira, Zendesk, AWS, Azure, Office 365, Dynamics, Git, Confluence, monitoring/log analysis concepts
Languages: English, French, Spanish
Education: Postgraduate Degree in Full Stack Software Development, Lambton College, 2025. Bachelor's Degree in Systems Engineering, Universidad Cooperativa de Colombia, 2019.

STYLE
- Keep most answers between 3 and 6 sentences.
- Sound natural, like Hermes in a professional conversation.
- Be specific with examples when asked behavioral or technical questions.
- Mention business impact when possible.
- Ask one clarifying question only when it genuinely helps.
- Never invent employers, certifications, degrees, or years of experience.`;

function appendMessage(sender, text, options = {}) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${sender}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = sender === "user" ? "You" : "Hermes";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (options.typing) {
    wrapper.classList.add("typing");
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.className = "typing-dot";
      bubble.appendChild(dot);
    }
  } else {
    bubble.textContent = text;
  }

  wrapper.append(meta, bubble);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
  requestAnimationFrame(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
    keepPageLocked();
  });
  return wrapper;
}

function setBusy(isBusy) {
  inputElement.disabled = isBusy;
  sendButton.disabled = isBusy;
  sendButton.querySelector("span").textContent = isBusy ? "Thinking" : "Send";
}

function trimHistory() {
  const maxMessages = 12;
  if (conversationHistory.length > maxMessages) {
    conversationHistory = conversationHistory.slice(-maxMessages);
  }
}

function initSynthesizer() {
  if (!azureSpeechKey || typeof SpeechSDK === "undefined") return null;

  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureSpeechKey, azureRegion);
  speechConfig.speechSynthesisVoiceName = "en-US-DavisNeural";
  return new SpeechSDK.SpeechSynthesizer(speechConfig);
}

function stopSpeaking() {
  if (!synthesizer || !isSpeaking) return;

  synthesizer.stopSpeakingAsync(
    () => {
      synthesizer.close();
      synthesizer = null;
      isSpeaking = false;
    },
    (error) => {
      console.error("Error stopping speech:", error);
      isSpeaking = false;
    }
  );
}

function speak(text) {
  if (!azureSpeechKey) return;

  stopSpeaking();
  synthesizer = initSynthesizer();
  if (!synthesizer) return;

  isSpeaking = true;
  synthesizer.speakTextAsync(
    text,
    () => {
      synthesizer.close();
      synthesizer = null;
      isSpeaking = false;
    },
    (error) => {
      console.error("Speech synthesis error:", error);
      synthesizer.close();
      synthesizer = null;
      isSpeaking = false;
    }
  );
}


function modelNeedsCompletionTokens(modelName) {
  const name = (modelName || "").toLowerCase();
  return name.startsWith("gpt-5") || name.startsWith("o") || name.includes("reasoning");
}

function buildOpenAIPayload(useCompletionTokens = modelNeedsCompletionTokens(openAiModel)) {
  const payload = {
    model: openAiModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ],
    temperature: 0.55,
  };

  // Newer reasoning/GPT-5-style models reject max_tokens.
  // Older chat models may still expect max_tokens, so this keeps both worlds working.
  if (useCompletionTokens) {
    payload.max_completion_tokens = 260;
  } else {
    payload.max_tokens = 260;
  }

  return payload;
}

async function getAIResponse(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });
  trimHistory();

  let response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify(buildOpenAIPayload()),
  });

  let data = await response.json();

  // Safety net: if the selected model rejects max_tokens, retry once with max_completion_tokens.
  if (!response.ok && /max_tokens/i.test(data?.error?.message || "")) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(buildOpenAIPayload(true)),
    });
    data = await response.json();
  }

  if (!response.ok) {
    const errorMessage = data?.error?.message || "The OpenAI request failed.";
    throw new Error(errorMessage);
  }

  const aiMessage = data?.choices?.[0]?.message?.content?.trim();
  if (!aiMessage) throw new Error("The API returned an empty response.");

  conversationHistory.push({ role: "assistant", content: aiMessage });
  trimHistory();
  return aiMessage;
}

async function sendMessage(messageOverride) {
  const input = (messageOverride || inputElement.value).trim();
  if (!input || inputElement.disabled) return;

  if (!openAiApiKey) {
    appendMessage("hermes", "Add your OpenAI API key in the URL first: ?openai_key=YOUR_KEY. Azure voice is optional with &azure_key=YOUR_KEY.");
    return;
  }

  appendMessage("user", input);
  inputElement.value = "";
  setBusy(true);
  const typingMessage = appendMessage("hermes", "", { typing: true });

  try {
    const aiMessage = await getAIResponse(input);
    typingMessage.remove();
    appendMessage("hermes", aiMessage);
    speak(aiMessage);
  } catch (error) {
    typingMessage.remove();
    appendMessage("hermes", `I hit an API issue: ${error.message}`);
  } finally {
    setBusy(false);
    inputElement.focus({ preventScroll: true });
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

document.getElementById("hint-container").addEventListener("click", (event) => {
  const button = event.target.closest(".hint");
  if (!button) return;
  sendMessage(button.dataset.hint);
  button.remove();
});

document.getElementById("shut-up-btn").addEventListener("click", stopSpeaking);

window.addEventListener("load", () => {
  keepPageLocked();
  if (!openAiApiKey) {
    keyWarning.hidden = false;
  }

  const welcomeMessage = "Hi, I’m Hermes Castano. This is my AI version, built so you can ask me about my technical experience, projects, APIs, SQL, enterprise systems, incidents, workflow automation, or role fit.";
  appendMessage("hermes", welcomeMessage);
  conversationHistory.push({ role: "assistant", content: welcomeMessage });
  speak(welcomeMessage);
});
